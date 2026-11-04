const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const { migrate } = require('../config/migrations');
const { createBackup, verifyBackup, restoreBackup } = require('../config/backups');
const { fixture } = require('./helpers.cjs');

test('versioned migrations preserve legacy data, cannot drift and maintain inventory consistency', async () => {
  const db = await open({ filename: ':memory:', driver: sqlite3.Database });
  try {
    const first = fs.readFileSync(path.join(__dirname,'../database/migrations/001_core.sql'),'utf8');
    await db.exec(first);
    await db.run('INSERT INTO Libros(titulo,autor,stock,disponible) VALUES(?,?,?,?)',['Legacy','Preserved',3,0]);
    await migrate(db); await migrate(db);
    assert.equal((await db.get('SELECT COUNT(*) AS n FROM Libros')).n,1);
    assert.equal((await db.get('SELECT disponible FROM Libros')).disponible,1);
    await db.run('UPDATE Libros SET stock=0,disponible=1');
    assert.equal((await db.get('SELECT disponible FROM Libros')).disponible,0);
    await db.run('UPDATE Libros SET stock=2,disponible=0');
    assert.equal((await db.get('SELECT disponible FROM Libros')).disponible,1);
    await assert.rejects(db.run('UPDATE Libros SET stock=1.5'), /entero/);
    assert.equal((await db.get('SELECT COUNT(*) AS n FROM SchemaMigrations')).n,5);
    await db.run("UPDATE SchemaMigrations SET sha256='modified' WHERE version='001_core.sql'");
    await assert.rejects(migrate(db), /modificada/);
  } finally { await db.close(); }
});

test('overdue loans are calculated by UTC calendar date and remain returnable', async t => {
  const { api, db, users } = await fixture(t);
  const loan = await api('/api/prestamos','POST',{libro_id:1},users[2].token);
  assert.equal(loan.status,201);
  await db.run("UPDATE Prestamos SET fecha_devolucion=date('now','-1 day') WHERE id=?",loan.body.id);
  assert.equal((await api('/api/prestamos/mis','GET',undefined,users[2].token)).body[0].estado,'vencido');
  assert.equal((await api('/api/prestamos','GET',undefined,users[0].token)).body[0].estado,'vencido');
  assert.equal((await api(`/api/prestamos/${loan.body.id}/devolver`,'PUT',{},users[2].token)).status,200);
  assert.equal((await api('/api/prestamos/mis','GET',undefined,users[2].token)).body[0].estado,'devuelto');
});

test('complete backups include committed WAL and covers; restore is verified and revokes old sessions', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'qnx-restore-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const source=path.join(dir,'original/library.db');fs.mkdirSync(path.dirname(source),{recursive:true});
  const db=await open({filename:source,driver:sqlite3.Database});
  let backup;
  const name='11111111-1111-1111-1111-111111111111.webp';
  try {
    await db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON');await migrate(db);
    await db.run('INSERT INTO Usuarios(nombre,email,password,rol) VALUES(?,?,?,?)',['Restored','restored@example.org','test-only-hash','visitante']);
    await db.run('INSERT INTO Prestamos(usuario_id,libro_id) VALUES(1,1)');
    await db.run('UPDATE Libros SET imagen_url=? WHERE id=1','/uploads/'+name);
    fs.mkdirSync(path.join(dir,'original/uploads'));fs.writeFileSync(path.join(dir,'original/uploads',name),'cover-for-integrity-test');
    backup=await createBackup(source,path.join(dir,'backups'));
    await verifyBackup(backup);
    const target=path.join(dir,'restored/library.db');await restoreBackup(backup,target);
    const restored=await open({filename:target,driver:sqlite3.Database});
    try {
      assert.equal((await restored.get('SELECT email FROM Usuarios WHERE id=1')).email,'restored@example.org');
      assert.equal((await restored.get('SELECT COUNT(*) AS n FROM Prestamos')).n,1);
      assert.equal((await restored.get('SELECT COUNT(*) AS n FROM Libros')).n,24);
      assert.notEqual((await restored.get('SELECT epoch FROM SecurityState')).epoch,(await db.get('SELECT epoch FROM SecurityState')).epoch);
      assert.equal(fs.readFileSync(path.join(dir,'restored/uploads',name),'utf8'),'cover-for-integrity-test');
    } finally { await restored.close(); }
    await assert.rejects(restoreBackup(backup,target),/existente/);
    fs.writeFileSync(path.join(backup,'uploads',name),'corrupt');
    await assert.rejects(verifyBackup(backup),/corrupto/);
    fs.writeFileSync(target+'.lock',JSON.stringify({pid:process.pid}));
    await assert.rejects(restoreBackup(backup,target,true),/Deten/);
  } finally { await db.close(); }
});

test('structured logs discard credentials, bodies and user-controlled messages', () => {
  const { log } = require('../config/logger');
  const original=process.stdout.write;let output='';
  process.stdout.write=chunk=>{output+=chunk;return true;};
  try { log('test',{status:200,authorization:'Bearer secret',password:'secret',email:'private@example.org',message:'secret',body:{secret:true}}); }
  finally { process.stdout.write=original; }
  const record=JSON.parse(output);assert.equal(record.status,200);assert.equal(output.includes('secret'),false);assert.equal(output.includes('private@example'),false);
});

test('publication snapshot includes source and rejects a private file even if Git tracks it', t => {
  const { execFileSync } = require('node:child_process');
  const { snapshot } = require('../scripts/source-snapshot');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'qnx-publish-test-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  execFileSync('git',['init','--quiet'],{cwd:dir});
  fs.writeFileSync(path.join(dir,'.gitignore'),'.env\ndata/\n');
  fs.writeFileSync(path.join(dir,'.env'),'LOCAL_ONLY=private-test-value');
  fs.writeFileSync(path.join(dir,'README.md'),'Source documentation');
  const exported=snapshot(dir);
  try { assert.ok(fs.existsSync(path.join(exported,'README.md')));assert.equal(fs.existsSync(path.join(exported,'.env')),false); }
  finally {fs.rmSync(exported,{recursive:true,force:true});}
  execFileSync('git',['add','--force','.env'],{cwd:dir});
  assert.throws(()=>snapshot(dir),/Archivo privado/);
});

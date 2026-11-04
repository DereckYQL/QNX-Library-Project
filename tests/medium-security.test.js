const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const { fixture, password } = require('./helpers.cjs');
const { normalizeCover } = require('../config/images');

test('covers are fully decoded, bounded, stripped and recoded as WebP', async () => {
  const input = sharp({ create: { width: 80, height: 40, channels: 3, background: '#123456' } });
  const png = await input.clone().withMetadata({ density: 300 }).png().toBuffer();
  const polyglot = Buffer.concat([png, Buffer.from('<script>alert("trailing payload")</script>')]);
  const result = await normalizeCover(polyglot);
  const metadata = await sharp(result).metadata();
  assert.equal(metadata.format, 'webp'); assert.equal(metadata.width, 80); assert.equal(metadata.height, 40);
  assert.equal(metadata.exif, undefined); assert.equal(metadata.icc, undefined); assert.equal(metadata.xmp, undefined);
  assert.equal(result.includes(Buffer.from('<script>')), false);
  for (const format of ['jpeg','webp','gif']) assert.equal((await sharp(await normalizeCover(await input.clone().toFormat(format).toBuffer())).metadata()).format, 'webp');
  for (const bad of [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>'), Buffer.from('GIF89a'), png.subarray(0, 30), Buffer.from([137,80,78,71,13,10,26,10])]) {
    await assert.rejects(normalizeCover(bad), error => error.status === 400);
  }
  const tooTall = await sharp({ create: { width: 1, height: 12001, channels: 3, background: 'white' } }).png().toBuffer();
  await assert.rejects(normalizeCover(tooTall), error => error.status === 400);
  const tooManyPixels = await sharp({ create: { width: 5000, height: 4000, channels: 3, background: 'white' } }).png().toBuffer();
  await assert.rejects(normalizeCover(tooManyPixels), error => error.status === 400);
});

test('soft deletion preserves completed history and blocks active or overdue loans', async t => {
  const { api, db, users } = await fixture(t);
  const admin = users[0], visitor = users[2];
  const created = await api('/api/libros', 'POST', { titulo:'Archive test',autor:'Test',stock:2,genero:'Archived genre' }, admin.token);
  const id = created.body.id;
  const loan = await api('/api/prestamos','POST',{libro_id:id},visitor.token);
  assert.equal(loan.status,201);
  for (const state of ['activo','vencido']) {
    await db.run('UPDATE Prestamos SET estado=? WHERE id=?',[state,loan.body.id]);
    assert.equal((await api('/api/libros/'+id,'DELETE',undefined,admin.token)).status,409);
    assert.equal((await api('/api/usuarios/'+visitor.id,'DELETE',undefined,admin.token)).status,409);
    assert.equal((await db.get('SELECT stock FROM Libros WHERE id=?',id)).stock,1);
  }
  await db.exec('PRAGMA foreign_keys=ON');
  await assert.rejects(db.run('DELETE FROM Usuarios WHERE id=?',visitor.id),/historial/);
  await assert.rejects(db.run('DELETE FROM Libros WHERE id=?',id),/historial/);
  assert.equal((await api(`/api/prestamos/${loan.body.id}/devolver`,'PUT',{},visitor.token)).status,200);
  assert.equal((await api('/api/libros/'+id,'DELETE',undefined,admin.token)).status,200);
  assert.equal((await api('/api/libros/'+id)).status,404);
  assert.equal((await api('/api/libros?search=Archive')).body.total,0);
  assert.equal((await api('/api/libros/generos')).body.includes('Archived genre'),false);
  assert.equal((await api('/api/prestamos','POST',{libro_id:id},visitor.token)).status,404);
  assert.equal((await api('/api/libros/'+id,'PUT',{titulo:'Try restore',autor:'Test'},admin.token)).status,404);
  const history = await api('/api/prestamos/mis','GET',undefined,visitor.token);
  assert.equal(history.body.find(row=>row.id===loan.body.id).titulo,'Archive test');
  assert.ok(history.body.find(row=>row.id===loan.body.id).libro_archivado);
  assert.equal((await db.get('SELECT stock FROM Libros WHERE id=?',id)).stock,2);
  assert.equal((await api('/api/usuarios/'+visitor.id,'DELETE',undefined,admin.token)).status,200);
  assert.equal((await api('/api/auth/me','GET',undefined,visitor.token)).status,401);
  assert.equal((await api('/api/auth/login','POST',{email:visitor.email,password})).status,401);
  assert.equal((await api('/api/usuarios','GET',undefined,admin.token)).body.some(user=>user.id===visitor.id),false);
  assert.ok((await db.get('SELECT deleted_at FROM Usuarios WHERE id=?',visitor.id)).deleted_at);
  assert.equal((await db.get('SELECT COUNT(*) AS n FROM Prestamos WHERE id=?',loan.body.id)).n,1);
  assert.equal((await api('/api/prestamos','GET',undefined,admin.token)).body.find(row=>row.id===loan.body.id).email,visitor.email);
});

test('uploads cannot be served from the old public folder and reject fake rasters', async t => {
  const { api, base, dir, users } = await fixture(t);
  const filename='12345678-1234-1234-1234-123456789abc.webp';
  fs.mkdirSync(path.join(dir,'public/uploads'),{recursive:true});
  fs.writeFileSync(path.join(dir,'public/uploads',filename),'<script>private legacy upload</script>');
  assert.equal((await fetch(base+'/uploads/'+filename)).status,404);
  const fake=new FormData();fake.append('portada',new Blob([Buffer.from([137,80,78,71,13,10,26,10])],{type:'image/png'}),'fake.png');
  assert.equal((await fetch(base+'/api/upload',{method:'POST',headers:{Authorization:'Bearer '+users[0].token},body:fake})).status,400);
  assert.equal((await fetch(base+'/js/crypto-utils.js')).status,404);
  const response=await fetch(base+'/pages/catalogo.html');
  const policy=response.headers.get('Content-Security-Policy');
  assert.match(policy,/script-src 'self';/);assert.match(policy,/script-src-attr 'none'/);assert.doesNotMatch(policy,/script-src[^;]*unsafe-inline/);
  assert.equal((await api('/api/health')).status,200);
});

test('orphan cleanup is a dry-run and preserves recent, archived and symlinked files', async t => {
  const { dir, db } = await fixture(t);
  const { spawnSync } = require('node:child_process');
  const { secret } = require('./helpers.cjs');
  const folder=path.join(dir,'data/uploads');
  const names=['11111111-1111-1111-1111-111111111111.webp','22222222-2222-2222-2222-222222222222.webp','33333333-3333-3333-3333-333333333333.webp','44444444-4444-4444-4444-444444444444.webp'];
  for(const name of names.slice(0,3))fs.writeFileSync(path.join(folder,name),'test');
  fs.symlinkSync(path.join(folder,names[0]),path.join(folder,names[3]));
  const old=new Date(Date.now()-48*60*60*1000);
  fs.utimesSync(path.join(folder,names[0]),old,old);fs.utimesSync(path.join(folder,names[1]),old,old);
  await db.run('UPDATE Libros SET imagen_url=?,deleted_at=CURRENT_TIMESTAMP WHERE id=1','/uploads/'+names[1]);
  function run(apply) {
    const result=spawnSync(process.execPath,['scripts/cleanup-uploads.js',...(apply?['--apply']:[])],{cwd:dir,env:{...process.env,DB_PATH:'data/test.db',JWT_SECRET:secret},encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);return JSON.parse(result.stdout);
  }
  assert.deepEqual(run(false),{mode:'dry-run',candidates:[names[0]]});assert.ok(fs.existsSync(path.join(folder,names[0])));
  assert.deepEqual(run(true),{mode:'apply',candidates:[names[0]]});assert.equal(fs.existsSync(path.join(folder,names[0])),false);
  assert.ok(fs.existsSync(path.join(folder,names[1])));assert.ok(fs.existsSync(path.join(folder,names[2])));
  assert.ok(fs.lstatSync(path.join(folder,names[3])).isSymbolicLink());
});


test('real accounts use distinct salted bcrypt hashes and never store credentials in responses', async t => {
  const { api, db } = await fixture(t);
  const hashes=[];
  for(const email of ['salt-a@example.org','salt-b@example.org']) {
    const result=await api('/api/auth/register','POST',{nombre:'Salt check',email,password});
    assert.equal(result.status,201);assert.equal(result.body.password,undefined);assert.equal(result.body.usuario.password,undefined);
    const user=await db.get('SELECT password FROM Usuarios WHERE email=?',email);
    assert.match(user.password,/^\$2[aby]\$12\$/);
    assert.equal(await require('bcryptjs').compare(password,user.password),true);hashes.push(user.password);
  }
  assert.notEqual(hashes[0],hashes[1]);
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const bcrypt = require('bcryptjs');
const root = path.resolve(__dirname, '..');
const { fixture, secret, password } = require('./helpers.cjs');

test('API security, concurrency, rollback and shared browser data', async t => {
  const { api, db, users, base } = await fixture(t);
  const [admin, otherAdmin, visitor, otherVisitor] = users;
  await t.test('malformed inputs and JSON do not crash the process', async () => {
    for (const bad of [{ nombre: 123, email: 'valid@example.org', password }, { nombre: 'Valid', email: {}, password }, { nombre: 'Valid', email: 'valid@example.org', password: {} }, []]) {
      assert.equal((await api('/api/auth/register', 'POST', bad)).status, 400);
    }
    assert.equal((await api('/api/auth/login', 'POST', { email: 123, password })).status, 400);
    assert.equal((await api('/api/libros?order=a&order=b')).status, 400);
    assert.equal((await api('/api/libros?limit=-1')).status, 400);
    assert.equal((await api('/api/libros/NaN')).status, 400);
    assert.equal((await api('/api/libros', 'POST', { titulo: {}, autor: 'Valid' }, admin.token)).status, 400);
    assert.equal((await api('/api/prestamos', 'POST', { libro_id: {}, dias: [] }, visitor.token)).status, 400);
    const malformed = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
    assert.equal(malformed.status, 400); assert.equal((await malformed.json()).error, 'JSON invalido');
    assert.equal((await api('/api/health')).status, 200);
  });
  await t.test('forged roles and stale tokens cannot perform administrative actions', async () => {
    const jwt = require('jsonwebtoken');
    const forged = jwt.sign({ id: visitor.id, ver: 0, epoch: jwt.decode(visitor.token).epoch, rol: 'admin' }, secret);
    assert.equal((await api('/api/libros', 'POST', { titulo: 'Unauthorized', autor: 'Test' }, forged)).status, 403);
    assert.equal((await api('/api/auth/register', 'POST', { nombre: 'Unauthorized', email: 'unauthorized@example.org', password, rol: 'admin' }, visitor.token)).status, 403);
    assert.equal((await api(`/api/usuarios/${otherAdmin.id}/rol`, 'PUT', { rol: 'visitante' }, admin.token)).status, 200);
    assert.equal((await api('/api/usuarios', 'GET', undefined, otherAdmin.token)).status, 401);
    assert.equal((await api('/api/auth/register', 'POST', { nombre: 'Stale', email: 'stale@example.org', password, rol: 'admin' }, otherAdmin.token)).status, 401);
    assert.equal((await api(`/api/usuarios/${otherAdmin.id}/rol`, 'PUT', { rol: 'admin' }, admin.token)).status, 200);
    // Re-promotion must not restore the old token.
    assert.equal((await api('/api/usuarios', 'GET', undefined, otherAdmin.token)).status, 401);
    assert.equal((await api(`/api/usuarios/${users[4].id}`, 'DELETE', undefined, admin.token)).status, 200);
    assert.equal((await api('/api/auth/me', 'GET', undefined, users[4].token)).status, 401);
  });
  const createBook = async stock => {
    const result = await api('/api/libros', 'POST', { titulo: 'Concurrency test', autor: 'Test', stock }, admin.token);
    assert.equal(result.status, 201); return result.body.id;
  };
  await t.test('last copy cannot be borrowed twice by simultaneous users', async () => {
    const id = await createBook(1);
    const results = await Promise.all(Array.from({ length: 12 }, (_, i) => api('/api/prestamos', 'POST', { libro_id: id }, (i % 2 ? visitor : otherVisitor).token)));
    assert.equal(results.filter(result => result.status === 201).length, 1);
    assert.ok(results.every(result => [201,409].includes(result.status)), JSON.stringify(results));
    assert.equal((await api('/api/libros/' + id)).body.stock, 0);
    assert.equal((await db.get('SELECT COUNT(*) AS n FROM Prestamos WHERE libro_id=?', id)).n, 1);
  });
  await t.test('duplicate borrowing and double returns change stock only once', async () => {
    const id = await createBook(10);
    const loans = await Promise.all(Array.from({ length: 10 }, () => api('/api/prestamos', 'POST', { libro_id: id }, visitor.token)));
    assert.equal(loans.filter(result => result.status === 201).length, 1);
    assert.equal((await api('/api/libros/' + id)).body.stock, 9);
    const loan = loans.find(result => result.status === 201).body.id;
    assert.equal((await api(`/api/prestamos/${loan}/devolver`, 'PUT', {}, otherVisitor.token)).status, 403);
    const returns = await Promise.all(Array.from({ length: 10 }, () => api(`/api/prestamos/${loan}/devolver`, 'PUT', {}, visitor.token)));
    assert.equal(returns.filter(result => result.status === 200).length, 1);
    assert.ok(returns.every(result => [200,409].includes(result.status)));
    assert.equal((await api('/api/libros/' + id)).body.stock, 10);
    assert.equal((await api('/api/libros/' + id, 'DELETE', undefined, admin.token)).status, 200);
    assert.equal((await api('/api/libros/' + id)).status, 404);
    assert.ok((await db.get('SELECT deleted_at FROM Libros WHERE id=?', id)).deleted_at);
    assert.equal((await db.get('SELECT deleted_at FROM Usuarios WHERE id=?', visitor.id)).deleted_at, null);
  });
  await t.test('loan insertion failure rolls back stock and return failure rolls back status', async () => {
    const id = await createBook(2);
    await db.exec(`CREATE TRIGGER test_fail_loan BEFORE INSERT ON Prestamos WHEN NEW.libro_id=${id} BEGIN SELECT RAISE(ABORT,'test rollback'); END`);
    assert.equal((await api('/api/prestamos', 'POST', { libro_id: id }, visitor.token)).status, 409);
    assert.equal((await api('/api/libros/' + id)).body.stock, 2);
    await db.exec('DROP TRIGGER test_fail_loan');
    const result = await api('/api/prestamos', 'POST', { libro_id: id }, visitor.token);
    assert.equal(result.status, 201);
    await db.exec(`CREATE TRIGGER test_fail_return BEFORE UPDATE OF stock ON Libros WHEN OLD.id=${id} AND NEW.stock>OLD.stock BEGIN SELECT RAISE(ABORT,'test rollback'); END`);
    assert.equal((await api(`/api/prestamos/${result.body.id}/devolver`, 'PUT', {}, visitor.token)).status, 409);
    assert.equal((await db.get('SELECT estado FROM Prestamos WHERE id=?', result.body.id)).estado, 'activo');
    await db.exec('DROP TRIGGER test_fail_return');
    await assert.rejects(db.run('UPDATE Libros SET stock=-1 WHERE id=?', id), /stock negativo/);
    await assert.rejects(db.run('INSERT INTO Prestamos(usuario_id,libro_id) VALUES(?,?)', [visitor.id,id]), /UNIQUE/);
  });
  await t.test('two isolated frontend clients share API data and ignore local role injection', async () => {
    function browserClient(token) {
      const storage = new Map([['qnx_token',token], ['qnx_user',JSON.stringify({ id: admin.id, rol: 'admin' })], ['qnx_db','must not read local DB']]);
      const ctx = { window: { QNX_MODE: 'server' }, localStorage: { getItem: key => storage.get(key) || null, setItem: (key,value) => storage.set(key,value), removeItem: key => storage.delete(key) }, FormData, URLSearchParams, fetch: (url,options) => fetch(base+url,options) };
      vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(root,'public/js/data-api.js'),'utf8'),ctx);
      return { qnx: vm.runInContext('QNX',ctx), storage };
    }
    const a = browserClient(admin.token), b = browserClient(otherVisitor.token);
    await Promise.all([a.qnx.ready,b.qnx.ready]);
    assert.equal(b.qnx.getUser().rol,'visitante'); assert.equal(b.storage.has('qnx_user'),false);
    await assert.rejects(b.qnx.saveBook(null,{ titulo:'Forbidden',autor:'Test' }), /admin/);
    const created = await a.qnx.saveBook(null,{ titulo:'Shared API book',autor:'Browser test',stock:2 });
    assert.equal((await b.qnx.book(created.id)).titulo,'Shared API book');
    const loan = await b.qnx.borrow(created.id);
    assert.equal((await a.qnx.book(created.id)).stock,1);
    assert.ok((await b.qnx.loans()).some(row=>row.id===loan.id));
    await b.qnx.returnLoan(loan.id);
    assert.equal((await a.qnx.book(created.id)).stock,2);
    assert.equal(a.storage.get('qnx_db'),'must not read local DB');
    assert.equal((await fetch(base+'/js/runtime-config.js')).status,200);
    assert.match(await (await fetch(base+'/js/runtime-config.js')).text(), /QNX_MODE = 'server'/);
  });
  await t.test('malformed uploads are bounded and SVG is rejected', async () => {
    const form = new FormData(); form.append('portada',new Blob(['<svg onload="alert(1)"></svg>'],{type:'image/png'}),'image.png');
    const bad = await fetch(base+'/api/upload',{method:'POST',headers:{Authorization:'Bearer '+admin.token},body:form});
    assert.equal(bad.status,400);
    const malformed = await fetch(base+'/api/upload',{method:'POST',headers:{Authorization:'Bearer '+admin.token,'Content-Type':'multipart/form-data; boundary=test'},body:'--test\r\nContent-Disposition: form-data; name="portada"; filename="broken.png"\r\n\r\nBROKEN'});
    assert.equal(malformed.status,400);
    const oversized = new FormData(); oversized.append('portada',new Blob([new Uint8Array(3*1024*1024+1)]),'large.png');
    assert.equal((await fetch(base+'/api/upload',{method:'POST',headers:{Authorization:'Bearer '+admin.token},body:oversized})).status,413);
    const image = new FormData(); image.append('portada',new Blob([await require('sharp')({ create: { width: 2, height: 2, channels: 3, background: 'white' } }).png().toBuffer()]),'cover.html');
    const accepted = await fetch(base+'/api/upload',{method:'POST',headers:{Authorization:'Bearer '+admin.token},body:image});
    assert.equal(accepted.status,201); const url=(await accepted.json()).url;
    assert.match(url,/\.webp$/); const downloaded=await fetch(base+url);
    assert.equal(downloaded.status,200); assert.match(downloaded.headers.get('Content-Type'),/image\/webp/);
    assert.equal(downloaded.headers.get('X-Content-Type-Options'),'nosniff');
    assert.equal((await api('/api/health')).status,200);
  });
});

test('legacy local data survives missing demo users, changed hashes and invalid JSON', async () => {
  const data = { libros: [{id:99,titulo:'Preserved',autor:'Test'}], usuarios: [{id:8,password_hash:'changed'}], prestamos:[{id:9}], nextIds:{libros:100,usuarios:9,prestamos:10} };
  const storage = new Map([['qnx_db',JSON.stringify(data)],['qnx_user',JSON.stringify({rol:'admin'})],['qnx_token','static-1']]);
  const ctx = { window:{QNX_MODE:'static'}, localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},URLSearchParams,FormData };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root,'public/js/db.js'),'utf8'),ctx);
  vm.runInContext(fs.readFileSync(path.join(root,'public/js/data-api.js'),'utf8'),ctx);
  const qnx = vm.runInContext('QNX',ctx); await qnx.ready;
  const saved = JSON.parse(storage.get('qnx_db')); delete saved.schemaVersion;
  assert.deepEqual(saved,data);
  assert.equal(qnx.getUser(),null);
  await assert.rejects(qnx.saveBook(null,{}),/servidor/);
  await assert.rejects(qnx.borrow(99),/servidor/);
  await assert.rejects(qnx.login({}),/servidor/);
  assert.equal((await qnx.book(99)).titulo,'Preserved');
  storage.set('qnx_db','INVALID JSON');
  assert.throws(()=>vm.runInContext('initDB()',ctx),/no se han borrado/);
  assert.equal(storage.get('qnx_db'),'INVALID JSON');
});


test('server API failures never fall back to a local library', async () => {
  const local = new Map([['qnx_db','preserved local library']]);
  const ctx = { window: { QNX_MODE:'server' }, localStorage: { getItem:key=>local.get(key)||null, setItem:(key,value)=>local.set(key,value), removeItem:key=>local.delete(key) }, FormData, URLSearchParams, fetch:async()=>{throw new Error('network offline');} };
  vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'public/js/data-api.js'),'utf8'),ctx);
  const qnx=vm.runInContext('QNX',ctx);await qnx.ready;
  await assert.rejects(qnx.books(),/network offline/);
  assert.equal(qnx.mode,'server');assert.equal(local.get('qnx_db'),'preserved local library');
});

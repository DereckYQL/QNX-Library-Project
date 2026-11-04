const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { once } = require('node:events');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcryptjs');
const root = path.resolve(__dirname, '..');
const secret = require('node:crypto').randomBytes(48).toString('hex');

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qnx-security-'));
  for (const folder of ['public', 'config', 'scripts', 'database']) fs.cpSync(path.join(root, folder), path.join(dir, folder), { recursive: true });
  fs.copyFileSync(path.join(root, 'package.json'), path.join(dir, 'package.json'));
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(dir, 'node_modules'), 'dir');
  return dir;
}
async function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const done = once(child, 'exit'); child.kill(); await done;
}
async function start(dir) {
  const child = spawn(process.execPath, ['public/js/server.js'], {
    cwd: dir, env: { ...process.env, DB_PATH: 'data/biblioteca.db', JWT_SECRET: secret, SERVER_PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  // The server reports its actual ephemeral port for isolated tests.
  let output = '';
  const port = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { child.kill(); reject(new Error('Startup timeout: ' + output)); }, 15000);
    child.stdout.on('data', chunk => { output += chunk; const m = output.match(/http:\/\/localhost:(\d+)/); if (m) { clearTimeout(timeout); resolve(m[1]); } });
    child.stderr.on('data', chunk => { output += chunk; });
    child.once('exit', code => { clearTimeout(timeout); reject(new Error(`Server exited ${code}: ${output}`)); });
  });
  return { child, base: `http://127.0.0.1:${port}` };
}
async function login(base, email, password) {
  return fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
}

test('private DB and secrets reject unsafe configurations, including symlinks', () => {
  const dir = fixture();
  try {
    fs.mkdirSync(path.join(dir, 'public', 'private'));
    fs.symlinkSync(path.join(dir, 'public', 'private'), path.join(dir, 'linked'), 'dir');
    for (const dbPath of ['public/database/test.db', 'linked/test.db']) {
      const result = spawnSync(process.execPath, ['-e', "require('./config/security')"], { cwd: dir, env: { ...process.env, DB_PATH: dbPath, JWT_SECRET: secret }, encoding: 'utf8' });
      assert.notEqual(result.status, 0); assert.match(result.stderr, /fuera de public/);
    }
    for (const value of ['', 'qnx_dev_secret', 'cambia_este_secreto_super_seguro_qnx_2026']) {
      const result = spawnSync(process.execPath, ['-e', "require('./config/security')"], { cwd: dir, env: { ...process.env, DB_PATH: 'data/test.db', JWT_SECRET: value }, encoding: 'utf8' });
      assert.notEqual(result.status, 0); assert.match(result.stderr, /JWT_SECRET/);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('HTTP does not expose DB, backups or server code; admin creation is explicit and not repeated', async () => {
  const dir = fixture(); let server;
  try {
    fs.mkdirSync(path.join(dir, 'public', 'database'), { recursive: true });
    for (const file of ['biblioteca.db', 'biblioteca.db-wal', 'biblioteca.db-shm', 'backup.bak']) fs.writeFileSync(path.join(dir, 'public', 'database', file), 'PRIVATE');
    server = await start(dir);
    for (const route of ['/database/biblioteca.db', '/database/biblioteca.db-wal', '/database/biblioteca.db-shm', '/database/backup.bak', '/js/server.js', '/data/biblioteca.db', '/config/security.js', '/.env', '/js/%2e%2e/database/biblioteca.db']) {
      assert.equal((await fetch(server.base + route)).status, 404, route);
    }
    for (const route of ['/', '/index.html', '/pages/login.html', '/css/style.css', '/js/db.js', '/img/logo.svg']) assert.equal((await fetch(server.base + route)).status, 200, route);
    assert.equal((await login(server.base, 'admin@qnx.local', 'Admin123!')).status, 401);
    const db = await open({ filename: path.join(dir, 'data/biblioteca.db'), driver: sqlite3.Database });
    assert.equal((await db.get('SELECT COUNT(*) AS n FROM Usuarios')).n, 0);
    const provision = spawnSync(process.execPath, ['scripts/create-admin.js'], { cwd: dir, env: { ...process.env, DB_PATH: 'data/biblioteca.db', JWT_SECRET: secret, ADMIN_EMAIL: 'owner@example.org' }, input: 'Fresh-admin-password-987!\n', encoding: 'utf8' });
    assert.equal(provision.status, 0, provision.stderr);
    const response = await login(server.base, 'owner@example.org', 'Fresh-admin-password-987!');
    assert.equal(response.status, 200); const user = await response.json(); assert.equal(user.usuario.rol, 'admin');
    assert.equal((await fetch(server.base + '/api/usuarios', { headers: { Authorization: 'Bearer ' + user.token } })).status, 200);
    await stop(server.child);
    await db.run('DELETE FROM Usuarios');
    // Simulate legacy known credentials, with a non-demo email too.
    await db.run('INSERT INTO Usuarios(nombre,email,password,rol) VALUES (?,?,?,?)', ['Legacy', 'legacy@example.org', await bcrypt.hash('Admin123!', 10), 'admin']);
    await db.close();
    server = await start(dir);
    assert.equal((await login(server.base, 'legacy@example.org', 'Admin123!')).status, 401);
    const check = await open({ filename: path.join(dir, 'data/biblioteca.db'), driver: sqlite3.Database });
    assert.equal((await check.get('SELECT COUNT(*) AS n FROM Usuarios')).n, 1);
    assert.equal(await check.get('SELECT id FROM Usuarios WHERE email=?', 'owner@example.org'), undefined);
    assert.equal(await check.get('SELECT id FROM Usuarios WHERE email=?', 'admin@qnx.local'), undefined);
    await check.close();
  } finally { if (server) await stop(server.child); fs.rmSync(dir, { recursive: true, force: true }); }
});

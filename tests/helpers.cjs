const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const bcrypt = require('bcryptjs');
const root = path.resolve(__dirname, '..');
const secret = require('node:crypto').randomBytes(48).toString('hex');
const password = 'Testing-library-password-987!';

async function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qnx-high-'));
  for (const folder of ['public', 'config', 'scripts', 'database']) fs.cpSync(path.join(root, folder), path.join(dir, folder), { recursive: true });
  fs.copyFileSync(path.join(root, 'package.json'), path.join(dir, 'package.json'));
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(dir, 'node_modules'), 'dir');
  const child = spawn(process.execPath, ['public/js/server.js'], { cwd: dir, env: { ...process.env, DB_PATH: 'data/test.db', JWT_SECRET: secret, SERVER_PORT: '0', SERVER_HOST: '127.0.0.1' }, stdio: ['ignore','pipe','pipe'] });
  t.after(async () => { if (child.exitCode === null && child.signalCode === null) { const done = once(child, 'exit'); child.kill(); await done; } fs.rmSync(dir, { recursive: true, force: true }); });
  let output = '';
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error('Startup timed out: ' + output)); }, 15000);
    child.stdout.on('data', chunk => { output += chunk; const match = output.match(/http:\/\/localhost:(\d+)/); if (match) { clearTimeout(timer); resolve(match[1]); } });
    child.stderr.on('data', chunk => output += chunk);
    child.once('exit', code => { clearTimeout(timer); reject(new Error('Startup failed: ' + code + output)); });
  });
  const base = 'http://127.0.0.1:' + port;
  async function api(route, method = 'GET', data, token) {
    const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: data === undefined ? undefined : JSON.stringify(data), signal: AbortSignal.timeout(15000) });
    return { status: response.status, body: await response.json() };
  }
  const db = await open({ filename: path.join(dir, 'data/test.db'), driver: sqlite3.Database });
  t.after(() => db.close());
  const hash = await bcrypt.hash(password, 10);
  const users = [];
  for (let i=0; i<5; i++) {
    const email = `test${i}@example.org`;
    const result = await db.run('INSERT INTO Usuarios(nombre,email,password,rol) VALUES(?,?,?,?)', ['Test ' + i, email, hash, i < 2 ? 'admin' : 'visitante']);
    const login = await api('/api/auth/login', 'POST', { email, password });
    assert.equal(login.status, 200);
    users.push({ id: result.lastID, email, token: login.body.token });
  }
  return { api, db, users, base, dir, child };
}


module.exports = { fixture, secret, password };

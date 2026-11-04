const fs = require('fs');
const crypto = require('crypto');
function isRunning(file) {
  if (!fs.existsSync(file)) return false;
  const lock = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Number.isSafeInteger(lock.pid) || lock.pid < 1) throw new Error('Lock invalido; revisa el proceso antes de retirarlo');
  try { process.kill(lock.pid, 0); return true; } catch (error) { if (error.code === 'ESRCH') return false; throw error; }
}
function acquire(dbPath) {
  const file = dbPath + '.lock';
  const token = crypto.randomUUID();
  if (fs.existsSync(file)) {
    if (isRunning(file)) throw new Error('Ya existe un servidor activo para esta base');
    fs.unlinkSync(file);
  }
  fs.writeFileSync(file, JSON.stringify({ pid: process.pid, token }), { flag: 'wx', mode: 0o600 });
  return () => { if (fs.existsSync(file) && JSON.parse(fs.readFileSync(file, 'utf8')).token === token) fs.unlinkSync(file); };
}
module.exports = { acquire, isRunning };

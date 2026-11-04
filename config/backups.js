const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const { privatePath } = require('./paths');
const { isRunning } = require('./instance-lock');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const imageName = /^[0-9a-f-]{36}\.webp$/;
async function verifyBackup(directory) {
  directory = privatePath(directory);
  if (!(await fs.promises.lstat(path.join(directory, 'manifest.json'))).isFile()) throw new Error('Manifest no regular');
  if (fs.existsSync(path.join(directory, 'uploads')) && !(await fs.promises.lstat(path.join(directory, 'uploads'))).isDirectory()) throw new Error('Directorio de portadas no regular');
  const manifest = JSON.parse(await fs.promises.readFile(path.join(directory, 'manifest.json'), 'utf8'));
  if (manifest.format !== 1 || !manifest.files || !manifest.files['database.db']) throw new Error('Manifest de backup invalido');
  for (const [name, hash] of Object.entries(manifest.files)) {
    if (name !== 'database.db' && !(name.startsWith('uploads/') && imageName.test(name.slice(8)))) throw new Error('Ruta no permitida en backup');
    const target = path.join(directory, name);
    if (!(await fs.promises.lstat(target)).isFile() || !/^[0-9a-f]{64}$/.test(hash) || digest(await fs.promises.readFile(target)) !== hash) throw new Error('Backup corrupto o alterado');
  }
  const db = await open({ filename: path.join(directory, 'database.db'), mode: sqlite3.OPEN_READONLY, driver: sqlite3.Database });
  try {
    if ((await db.get('PRAGMA integrity_check')).integrity_check !== 'ok' || (await db.all('PRAGMA foreign_key_check')).length) throw new Error('Backup SQLite inconsistente');
    for (const name of ['Usuarios','Libros','Prestamos']) if (!await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name=?", name)) throw new Error('Backup no corresponde a QNX Library');
  } finally { await db.close(); }
  return manifest;
}
async function createBackup(dbPath, backupRoot) {
  dbPath = privatePath(dbPath); backupRoot = privatePath(backupRoot);
  if (!fs.existsSync(dbPath)) throw new Error('No existe la base origen');
  await fs.promises.mkdir(backupRoot, { recursive: true, mode: 0o700 });
  const directory = await fs.promises.mkdtemp(path.join(backupRoot, 'qnx-' + new Date().toISOString().replace(/[:.]/g, '-') + '-'));
  let source, snapshot;
  try {
    source = await open({ filename: dbPath, mode: sqlite3.OPEN_READONLY, driver: sqlite3.Database });
    // SQLite creates a consistent snapshot, including committed WAL content.
    await source.run('VACUUM INTO ?', path.join(directory, 'database.db'));
    await source.close(); source = null;
    snapshot = await open({ filename: path.join(directory, 'database.db'), mode: sqlite3.OPEN_READONLY, driver: sqlite3.Database });
    const files = { 'database.db': digest(await fs.promises.readFile(path.join(directory, 'database.db'))) };
    const covers = await snapshot.all("SELECT DISTINCT imagen_url FROM Libros WHERE imagen_url LIKE '/uploads/%'");
    for (const { imagen_url } of covers) {
      const name = imagen_url.slice(9);
      if (!imageName.test(name)) throw new Error('Portada heredada pendiente de importar');
      const original = path.join(path.dirname(dbPath), 'uploads', name);
      if (!(await fs.promises.lstat(original)).isFile()) throw new Error('Portada ausente o no regular');
      const bytes = await fs.promises.readFile(original);
      await fs.promises.mkdir(path.join(directory, 'uploads'), { recursive: true, mode: 0o700 });
      await fs.promises.writeFile(path.join(directory, 'uploads', name), bytes, { mode: 0o600, flag: 'wx' });
      files['uploads/' + name] = digest(bytes);
    }
    await snapshot.close(); snapshot = null;
    await fs.promises.chmod(path.join(directory, 'database.db'), 0o600);
    await fs.promises.writeFile(path.join(directory, 'manifest.json'), JSON.stringify({ format: 1, appVersion: '3.0.0', createdAt: new Date().toISOString(), files }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    await verifyBackup(directory);
    return directory;
  } catch (error) { await fs.promises.rm(directory, { recursive: true, force: true }); throw error; }
  finally { if (source) await source.close(); if (snapshot) await snapshot.close(); }
}
async function restoreBackup(directory, target, replace = false) {
  target = privatePath(target); directory = privatePath(directory);
  if (target === directory || target.startsWith(directory + path.sep)) throw new Error('El destino no puede estar dentro del backup origen');
  if (isRunning(target + '.lock')) throw new Error('Deten el servidor antes de restaurar');
  if (fs.existsSync(target) && !replace) throw new Error('Destino existente; usa --replace para guardar rollback y reemplazarlo');
  if (fs.existsSync(target + '-wal') || fs.existsSync(target + '-shm')) throw new Error('Hay archivos WAL/SHM: inicia y detén limpiamente el servidor antes de restaurar');
  const manifest = await verifyBackup(directory);
  if (fs.existsSync(target)) await createBackup(target, path.join(path.dirname(target), 'backups'));
  await fs.promises.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  const staged = target + '.restore-' + crypto.randomUUID();
  try {
    await fs.promises.copyFile(path.join(directory, 'database.db'), staged, fs.constants.COPYFILE_EXCL);
    await fs.promises.chmod(staged, 0o600);
    const db = await open({ filename: staged, driver: sqlite3.Database });
    try {
      await db.exec('PRAGMA foreign_keys=ON');
      await require('./migrations').migrate(db);
      await db.run('UPDATE SecurityState SET epoch=? WHERE id=1', crypto.randomBytes(32).toString('hex'));
    } finally { await db.close(); }
    for (const name of Object.keys(manifest.files).filter(name => name.startsWith('uploads/'))) {
      const destination = path.join(path.dirname(target), name);
      if (fs.existsSync(destination)) {
        if (digest(await fs.promises.readFile(destination)) !== manifest.files[name]) throw new Error('Colision de portada existente');
      } else {
        await fs.promises.mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
        await fs.promises.copyFile(path.join(directory, name), destination, fs.constants.COPYFILE_EXCL);
        await fs.promises.chmod(destination, 0o600);
      }
    }
    await fs.promises.rename(staged, target);
  } finally { await fs.promises.rm(staged, { force: true }); }
}
module.exports = { createBackup, verifyBackup, restoreBackup };

// Explicit maintenance command. Dry-run by default; stop the server before --apply.
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { dbPath } = require('../config/security');
(async () => {
  let db;
  try {
    if (!fs.existsSync(dbPath)) throw new Error('Inicializa la base antes de revisar las portadas');
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    // Include archived books: their historical covers are still referenced.
    const references = new Set((await db.all('SELECT imagen_url FROM Libros WHERE imagen_url IS NOT NULL')).map(row => row.imagen_url));
    const directory = path.join(path.dirname(dbPath), 'uploads');
    const candidates = [];
    if (fs.existsSync(directory)) {
      for (const entry of await fs.promises.readdir(directory, { withFileTypes: true })) {
        if (!entry.isFile() || !/^[0-9a-f-]{36}\.webp$/.test(entry.name) || references.has('/uploads/' + entry.name)) continue;
        const stat = await fs.promises.lstat(path.join(directory, entry.name));
        if (stat.isFile() && Date.now() - stat.mtimeMs > 24 * 60 * 60 * 1000) candidates.push(entry.name);
      }
    }
    const apply = process.argv.includes('--apply');
    if (apply) for (const filename of candidates) await fs.promises.unlink(path.join(directory, filename));
    console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', candidates }));
  } finally { if (db) await db.close(); }
})().catch(error => { console.error('No se pudieron revisar las portadas:', error.message); process.exitCode = 1; });

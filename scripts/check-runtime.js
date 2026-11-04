// Run after a clean installation to catch foreign or missing native binaries.
(async () => {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 9)) throw new Error('Se requiere Node >=22.9.0');
  const sqlite3 = require('sqlite3');
  const { open } = require('sqlite');
  const db = await open({ filename: ':memory:', driver: sqlite3.Database });
  try {
    const row = await db.get('SELECT 1 AS ok');
    if (row.ok !== 1) throw new Error('SQLite no responde');
  } finally { await db.close(); }
  const sharp = require('sharp');
  const image = await sharp({ create: { width: 1, height: 1, channels: 3, background: 'white' } }).webp().toBuffer();
  if ((await sharp(image).metadata()).format !== 'webp') throw new Error('Procesamiento de imagen no disponible');
  console.log(`Entorno verificado: Node ${process.versions.node}, SQLite y Sharp nativos operativos.`);
})().catch(error => { console.error('Entorno no compatible:', error.message); process.exitCode = 1; });

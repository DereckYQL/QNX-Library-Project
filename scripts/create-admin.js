// Explicit local provisioning. Password comes from stdin, never a CLI argument.
const fs = require('fs');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { dbPath } = require('../config/security');

(async () => {
  let db;
  try {
    const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const nombre = (process.env.ADMIN_NAME || 'Administrador').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || nombre.length < 2) {
      throw new Error('Define ADMIN_EMAIL valido y ADMIN_NAME (minimo 2 caracteres).');
    }
    if (process.stdin.isTTY) throw new Error('Proporciona la contrasena por stdin; consulta README.md.');
    const password = fs.readFileSync(0, 'utf8').replace(/\r?\n$/, '');
    if (password.length < 16 || Buffer.byteLength(password, 'utf8') > 72 ||
        ['Admin123!', 'visitante123'].includes(password)) {
      throw new Error('Usa una contrasena de al menos 16 caracteres y como maximo 72 bytes.');
    }
    if (!fs.existsSync(dbPath)) throw new Error('Inicializa primero la base con npm start.');
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    const hash = await bcrypt.hash(password, 12);
    await db.run('INSERT INTO Usuarios (nombre,email,password,rol) VALUES (?,?,?,?)', [nombre, email, hash, 'admin']);
    console.log('Administrador creado.');
  } catch (error) {
    console.error('No se pudo crear el administrador:', error.message);
    process.exitCode = 1;
  } finally {
    if (db) await db.close();
  }
})();

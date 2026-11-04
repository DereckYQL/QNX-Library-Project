const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const root = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(root, '.env') });

const { privatePath } = require('./paths');
const dbPath = privatePath(process.env.DB_PATH || 'data/biblioteca.db');
const jwtSecret = process.env.JWT_SECRET || '';
const knownSecrets = new Set(['qnx_dev_secret', 'cambia_este_secreto_super_seguro_qnx_2026']);
if (jwtSecret.length < 32 || knownSecrets.has(jwtSecret)) {
  throw new Error('JWT_SECRET debe ser un secreto nuevo de al menos 32 caracteres; no se aceptan valores de ejemplo.');
}

async function disableDemoPasswords(db) {
  const users = await db.all('SELECT id,password FROM Usuarios');
  for (const user of users) {
    const known = await bcrypt.compare('Admin123!', user.password) ||
      await bcrypt.compare('visitante123', user.password);
    if (known) {
      const hash = await bcrypt.hash(crypto.randomBytes(48).toString('hex'), 12);
      await db.run('UPDATE Usuarios SET password=?,auth_version=auth_version+1 WHERE id=?', [hash, user.id]);
      require('./logger').log('demo_credential_disabled', { user_id: user.id });
    }
  }
}
module.exports = { dbPath, jwtSecret, disableDemoPasswords };

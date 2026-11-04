const path = require('path');
const { dbPath } = require('../config/security');
const args = process.argv.slice(2);
if (!args[0] || !args.includes('--server-stopped')) {
  console.error('Uso: npm run restore -- RUTA_BACKUP --server-stopped [--replace] [--target RUTA_DB]'); process.exitCode = 1;
} else {
  const targetIndex = args.indexOf('--target');
  const target = targetIndex >= 0 ? args[targetIndex + 1] : dbPath;
  if (!target) throw new Error('Falta ruta destino');
  require('../config/backups').restoreBackup(path.resolve(args[0]), target, args.includes('--replace'))
    .then(() => console.log('Backup restaurado; sesiones previas invalidadas.'))
    .catch(error => { console.error('Restauracion rechazada:', error.message); process.exitCode = 1; });
}

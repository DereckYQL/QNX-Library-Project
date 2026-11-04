const path = require('path');
const { dbPath } = require('../config/security');
require('../config/backups').createBackup(dbPath, process.env.BACKUP_DIR || path.join(path.dirname(dbPath), 'backups'))
  .then(directory => console.log('Backup verificado:', directory))
  .catch(() => { console.error('No se pudo completar el backup; revisa la ruta, la base y sus portadas.'); process.exitCode = 1; });

const fs = require('fs');
const path = require('path');
const { sources } = require('../config/migrations');
const target = path.join(__dirname, '..', 'database', 'schema.sql');
const expected = '-- Generated from database/migrations/*.sql. Do not edit; run npm run schema:write.\n' + sources().map(({ name, sql }) => '\n-- ' + name + '\n' + sql).join('');
if (process.argv.includes('--write')) fs.writeFileSync(target, expected);
else if (fs.readFileSync(target, 'utf8') !== expected) { console.error('schema.sql no coincide con las migraciones'); process.exitCode = 1; }
else console.log('Esquema y migraciones sincronizados.');

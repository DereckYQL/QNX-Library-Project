const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const directory = path.join(__dirname, '..', 'database', 'migrations');
function sources() {
  return fs.readdirSync(directory).filter(name => /^\d{3}_[a-z_]+\.sql$/.test(name)).sort()
    .map(name => ({ name, sql: fs.readFileSync(path.join(directory, name), 'utf8') }));
}
async function migrate(db) {
  await db.exec('CREATE TABLE IF NOT EXISTS SchemaMigrations (version TEXT PRIMARY KEY, sha256 TEXT NOT NULL, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)');
  for (const { name, sql } of sources()) {
    const sha = crypto.createHash('sha256').update(sql).digest('hex');
    const applied = await db.get('SELECT sha256 FROM SchemaMigrations WHERE version=?', name);
    if (applied) { if (applied.sha256 !== sha) throw new Error('Migracion aplicada modificada: ' + name); continue; }
    await db.exec('BEGIN IMMEDIATE');
    try {
      // Adopt pre-3.0 schemas without dropping tables or recreating existing columns.
      let body = sql;
      for (const match of sql.matchAll(/ALTER TABLE (\w+) ADD COLUMN (\w+)[^;]*;/g)) {
        const columns = await db.all('PRAGMA table_info(' + match[1] + ')');
        if (!columns.some(column => column.name === match[2])) await db.exec(match[0]);
        body = body.replace(match[0], '');
      }
      await db.exec(body);
      await db.run('INSERT INTO SchemaMigrations(version,sha256) VALUES(?,?)', [name, sha]);
      await db.exec('COMMIT');
    } catch (error) { await db.exec('ROLLBACK'); throw error; }
  }
}
function displayLoan(loan, today = new Date().toISOString().slice(0, 10)) {
  return loan.estado === 'activo' && loan.fecha_devolucion && loan.fecha_devolucion < today ? { ...loan, estado: 'vencido' } : loan;
}
module.exports = { migrate, sources, displayLoan };

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
function snapshot(root = path.resolve(__dirname, '..')) {
  const files = execFileSync('git', ['ls-files','--cached','--others','--exclude-standard','-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'qnx-source-scan-'));
  try {
    for (const name of new Set(files)) {
      const source = path.join(root, name);
      if (!fs.existsSync(source)) continue; // Removed versioned files are not published.
      if (/^(data|node_modules)\//.test(name) || /\.(db(?:-wal|-shm)?|sqlite3?|pem|key|bak)$/.test(name) || (/^\.env(?:\.|$)/.test(path.basename(name)) && path.basename(name) !== '.env.example')) throw new Error('Archivo privado incluido en los archivos publicables: ' + name);
      if (!fs.lstatSync(source).isFile()) throw new Error('Archivo publicable no regular: ' + name);
      const target = path.join(output, name);
      fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(source, target);
    }
    return output;
  } catch (error) { fs.rmSync(output, { recursive: true, force: true }); throw error; }
}
if (require.main === module) {
  try { console.log(snapshot()); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { snapshot };

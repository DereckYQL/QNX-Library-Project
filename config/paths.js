const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function canonical(target) {
  if (fs.existsSync(target)) return fs.realpathSync(target);
  const parent = path.dirname(target);
  return parent === target ? target : path.join(canonical(parent), path.basename(target));
}
function privatePath(target) {
  const resolved = canonical(path.resolve(root, target));
  const relative = path.relative(canonical(path.join(root, 'public')), resolved);
  if (relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))) throw new Error('La ruta privada debe estar fuera de public');
  return resolved;
}
module.exports = { privatePath };

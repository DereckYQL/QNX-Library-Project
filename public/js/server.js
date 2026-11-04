const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const { log } = require('../../config/logger');
const { displayLoan } = require('../../config/migrations');
const { version } = require('../../package.json');
const { normalizeCover } = require('../../config/images');
const { dbPath, jwtSecret: JWT_SECRET } = require('../../config/security');

const app = express();
if (process.env.TRUST_PROXY === 'loopback') app.set('trust proxy', 'loopback');
else if (process.env.TRUST_PROXY) throw new Error('TRUST_PROXY solo acepta loopback');
app.use((req, res, next) => {
  const started = performance.now();
  req.requestId = require('crypto').randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  res.once('finish', () => log('http_request', { request_id: req.requestId, method: req.method, status: res.statusCode, duration_ms: Math.round(performance.now() - started) }));
  next();
});
app.use(cors({ origin: false }));
app.disable('x-powered-by');
app.set('query parser', 'simple');
const contentPolicy = "default-src 'self'; script-src 'self'; script-src-attr 'none'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: http:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', contentPolicy);
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  next();
});
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: false, limit: '64kb' }));
// Publish only browser assets; database, schema and backend source stay private.
const publicDir = path.join(__dirname, '..');
app.get('/js/runtime-config.js', (req, res) => res.type('application/javascript').set('Cache-Control', 'no-store').send("window.QNX_MODE = 'server';"));
app.get(['/', '/index.html'], (req, res) => res.sendFile(path.join(publicDir, 'index.html')));
for (const folder of ['css', 'img', 'pages']) {
  app.use('/' + folder, express.static(path.join(publicDir, folder), { dotfiles: 'deny', index: false }));
}
const browserScripts = new Set(['auth.js', 'catalogo.js', 'db.js', 'libro.js', 'prestamos.js', 'script.js', 'data-api.js']);
app.get('/js/:file', (req, res) => {
  if (!browserScripts.has(req.params.file)) return res.sendStatus(404);
  res.sendFile(path.join(publicDir, 'js', req.params.file));
});

const uploadDir = path.join(path.dirname(dbPath), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true, mode: 0o700 });
app.get('/uploads/:file', (req, res) => {
  if (!/^[0-9a-f-]{36}\.webp$/.test(req.params.file)) return res.sendStatus(404);
  res.type('image/webp').sendFile(path.join(uploadDir, req.params.file));
});

const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';

// ---------- SQLite (DB Browser SQLite) ----------
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

let db, sessionEpoch;
async function initDB() {
  db = await open({ filename: dbPath, driver: sqlite3.Database });
  await db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=10000;');
  await require('../../config/migrations').migrate(db);
  await require('../../config/security').disableDemoPasswords(db);
  sessionEpoch = (await db.get('SELECT epoch FROM SecurityState WHERE id=1')).epoch;
}
// API helpers: every asynchronous failure reaches the error middleware.
const route = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
function fail(status, message) { const error = new Error(message); error.status = status; throw error; }
function text(value, name, min = 0, max = 200) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) fail(400, `${name} invalido`);
  return value.trim();
}
function integer(value, name, min = 1, max = Number.MAX_SAFE_INTEGER) {
  if (!['number', 'string'].includes(typeof value) || (typeof value === 'string' && !/^\d+$/.test(value))) fail(400, `${name} invalido`);
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < min || n > max) fail(400, `${name} invalido`);
  return n;
}
function emailValue(value) {
  const email = text(value, 'email', 3, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'email invalido');
  return email;
}
function passwordValue(value, register = false) {
  if (typeof value !== 'string' || value.length < (register ? 12 : 1) || Buffer.byteLength(value, 'utf8') > 72) fail(400, 'Contrasena invalida: registro minimo 12 caracteres, maximo 72 bytes');
  if (register && ['Admin123!', 'visitante123'].includes(value)) fail(400, 'Contrasena de demostracion no permitida');
  return value;
}
function imageValue(value) {
  if (value == null || value === '') return null;
  const url = text(value, 'imagen_url', 1, 2048);
  if (/^\/uploads\/[\w-]+\.(png|jpg|gif|webp)$/.test(url)) return url;
  try { if (['https:', 'http:'].includes(new URL(url).protocol)) return url; } catch {}
  fail(400, 'URL de imagen invalida');
}
function bookValues(body, current = {}) {
  const titulo = text(body.titulo, 'titulo', 2, 300);
  const autor = text(body.autor, 'autor', 2, 200);
  const genero = body.genero == null || body.genero === '' ? null : text(body.genero, 'genero', 1, 100);
  const anio = body.anio == null || body.anio === '' ? null : integer(body.anio, 'anio', 1000, 2100);
  const stock = body.stock === undefined || body.stock === '' ? (current.stock ?? 3) : integer(body.stock, 'stock', 0, 999);
  if (body.disponible !== undefined && ![0, 1, '0', '1', true, false].includes(body.disponible)) fail(400, 'disponible invalido');
  return [titulo, autor, genero, anio, stock, stock > 0 ? 1 : 0, body.imagen_url === undefined ? (current.imagen_url ?? null) : imageValue(body.imagen_url)];
}
const publicUser = user => ({ id: user.id, nombre: user.nombre, email: user.email, rol: user.rol });
function session(user) {
  return { token: jwt.sign({ id: user.id, ver: user.auth_version, epoch: sessionEpoch }, JWT_SECRET, { algorithm: 'HS256', expiresIn: JWT_EXPIRES }), usuario: publicUser(user) };
}
async function currentUser(req, connection = db) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) fail(401, 'Token requerido');
  let payload;
  try { payload = jwt.verify(header.slice(7), JWT_SECRET, { algorithms: ['HS256'] }); } catch { fail(401, 'Token invalido o expirado'); }
  if (!payload || payload.epoch !== sessionEpoch || typeof payload !== 'object' || !Number.isSafeInteger(payload.id) || !Number.isSafeInteger(payload.ver)) fail(401, 'Token invalido');
  const user = await connection.get('SELECT id,nombre,email,rol,auth_version FROM Usuarios WHERE id=? AND deleted_at IS NULL', payload.id);
  if (!user || user.auth_version !== payload.ver) fail(401, 'Sesion revocada');
  return user;
}
const authMiddleware = route(async (req, res, next) => { req.user = await currentUser(req); next(); });
function requireAdmin(req, res, next) {
  if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Requiere rol admin' });
  next();
}
// Separate connections prevent unrelated requests from joining another transaction.
// Queue writers before opening SQLite connections: otherwise concurrent BEGIN
// waits can occupy all libuv workers and starve the transaction that owns the lock.
let writerQueue = Promise.resolve();
async function transaction(operation) {
  const previous = writerQueue;
  let release;
  writerQueue = new Promise(resolve => { release = resolve; });
  await previous;
  let tx;
  try {
    tx = await open({ filename: dbPath, driver: sqlite3.Database });
    await tx.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=10000; BEGIN IMMEDIATE;');
    const result = await operation(tx);
    await tx.exec('COMMIT');
    return result;
  } catch (error) {
    if (tx) await tx.exec('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    try { if (tx) await tx.close(); } finally { release(); }
  }
}
async function authorizedTransaction(req, admin, operation) {
  return transaction(async tx => {
    const user = await currentUser(req, tx);
    if (admin && user.rol !== 'admin') fail(403, 'Requiere rol admin');
    return operation(tx, user);
  });
}
app.use('/api', (req, res, next) => {
  if (req.body !== undefined && (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))) return res.status(400).json({ error: 'Se requiere un objeto JSON' });
  if (Object.values(req.query).some(value => typeof value !== 'string')) return res.status(400).json({ error: 'Parametros de consulta invalidos' });
  next();
});
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { error: 'Demasiados intentos, intenta en 15 minutos' }, standardHeaders: true, legacyHeaders: false });
app.post('/api/auth/register', authLimiter, route(async (req, res) => {
  const nombre = text(req.body.nombre, 'nombre', 2, 120);
  const email = emailValue(req.body.email);
  const password = passwordValue(req.body.password, true);
  const rol = req.body.rol ?? 'visitante';
  if (!['admin', 'visitante', 'user'].includes(rol)) fail(400, 'Rol invalido');
  const hash = await bcrypt.hash(password, 12);
  const user = await transaction(async tx => {
    if (rol === 'admin') { const creator = await currentUser(req, tx); if (creator.rol !== 'admin') fail(403, 'Requiere rol admin'); }
    const info = await tx.run('INSERT INTO Usuarios (nombre,email,password,rol) VALUES (?,?,?,?)', [nombre, email, hash, rol]);
    return tx.get('SELECT * FROM Usuarios WHERE id=?', info.lastID);
  });
  res.status(201).json({ mensaje: 'Usuario registrado', ...session(user) });
}));
app.post('/api/auth/login', authLimiter, route(async (req, res) => {
  const email = emailValue(req.body.email);
  const password = passwordValue(req.body.password);
  const user = await db.get('SELECT * FROM Usuarios WHERE email=? AND deleted_at IS NULL', email);
  if (!user || !(await bcrypt.compare(password, user.password))) fail(401, 'Credenciales invalidas');
  res.json({ mensaje: 'Login ok', ...session(user) });
}));
app.get('/api/auth/me', authMiddleware, (req, res) => res.json(publicUser(req.user)));
app.get('/api/usuarios', authMiddleware, requireAdmin, route(async (req, res) => {
  res.json(await db.all('SELECT id,nombre,email,rol,created_at FROM Usuarios WHERE deleted_at IS NULL ORDER BY id'));
}));
app.delete('/api/usuarios/:id', authMiddleware, requireAdmin, route(async (req, res) => {
  const id = integer(req.params.id, 'id');
  await authorizedTransaction(req, true, async (tx, user) => {
    if (id === user.id) fail(400, 'No puedes eliminarte a ti mismo');
    if (await tx.get("SELECT id FROM Prestamos WHERE usuario_id=? AND estado IN ('activo','vencido') LIMIT 1", id)) fail(409, 'El usuario tiene prestamos pendientes');
    if (!(await tx.run('UPDATE Usuarios SET deleted_at=CURRENT_TIMESTAMP,auth_version=auth_version+1 WHERE id=? AND deleted_at IS NULL', id)).changes) fail(404, 'Usuario no encontrado');
  });
  res.json({ mensaje: 'Usuario desactivado; historial conservado' });
}));
app.put('/api/usuarios/:id/rol', authMiddleware, requireAdmin, route(async (req, res) => {
  const id = integer(req.params.id, 'id'); const rol = req.body.rol;
  if (!['admin', 'visitante', 'user'].includes(rol)) fail(400, 'Rol invalido');
  await authorizedTransaction(req, true, async tx => {
    if (!(await tx.run('UPDATE Usuarios SET rol=?,auth_version=auth_version+1 WHERE id=? AND deleted_at IS NULL', [rol, id])).changes) fail(404, 'Usuario no encontrado');
  });
  res.json({ mensaje: 'Rol actualizado; sesiones anteriores revocadas' });
}));
app.get('/api/libros', route(async (req, res) => {
  const { search, genero, disponible, sort, order } = req.query;
  const page = req.query.page === undefined ? 1 : integer(req.query.page, 'page', 1, 1000000);
  const limit = req.query.limit === undefined ? 50 : integer(req.query.limit, 'limit', 1, 50);
  const sortCol = ['id', 'titulo', 'autor', 'genero', 'anio', 'stock'].includes(sort) ? sort : 'id';
  const sortDir = order === 'desc' ? 'DESC' : 'ASC';
  const where = ['deleted_at IS NULL'], params = [];
  if (search) { const like = `%${text(search, 'search', 1, 300)}%`; where.push('(titulo LIKE ? OR autor LIKE ? OR genero LIKE ?)'); params.push(like, like, like); }
  if (genero) { where.push('genero=?'); params.push(text(genero, 'genero', 1, 100)); }
  if (disponible !== undefined && disponible !== '') { if (!['0', '1', 'true', 'false'].includes(disponible)) fail(400, 'disponible invalido'); where.push('disponible=?'); params.push(['1', 'true'].includes(disponible) ? 1 : 0); }
  const clause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = (await db.get(`SELECT COUNT(*) AS total FROM Libros ${clause}`, params)).total;
  const data = await db.all(`SELECT * FROM Libros ${clause} ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
  if (Object.keys(req.query).length) res.json({ data, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });
  else res.json(data);
}));
const genres = route(async (req, res) => res.json((await db.all('SELECT DISTINCT genero FROM Libros WHERE genero IS NOT NULL AND deleted_at IS NULL ORDER BY genero')).map(row => row.genero)));
app.get('/api/libros/generos', genres);
app.get('/api/generos', genres);
app.get('/api/libros/:id', route(async (req, res) => {
  const row = await db.get('SELECT * FROM Libros WHERE id=? AND deleted_at IS NULL', integer(req.params.id, 'id'));
  if (!row) fail(404, 'Libro no encontrado'); res.json(row);
}));
app.post('/api/libros', authMiddleware, requireAdmin, route(async (req, res) => {
  const values = bookValues(req.body);
  const info = await authorizedTransaction(req, true, tx => tx.run('INSERT INTO Libros (titulo,autor,genero,anio,stock,disponible,imagen_url) VALUES (?,?,?,?,?,?,?)', values));
  res.status(201).json({ id: info.lastID, mensaje: 'Libro registrado' });
}));
app.put('/api/libros/:id', authMiddleware, requireAdmin, route(async (req, res) => {
  const id = integer(req.params.id, 'id');
  await authorizedTransaction(req, true, async tx => {
    const current = await tx.get('SELECT * FROM Libros WHERE id=? AND deleted_at IS NULL', id);
    if (!current) fail(404, 'Libro no encontrado');
    const values = bookValues(req.body, current);
    await tx.run('UPDATE Libros SET titulo=?,autor=?,genero=?,anio=?,stock=?,disponible=?,imagen_url=?,updated_at=CURRENT_TIMESTAMP WHERE id=?', [...values, id]);
  });
  res.json({ mensaje: 'Libro actualizado' });
}));
app.delete('/api/libros/:id', authMiddleware, requireAdmin, route(async (req, res) => {
  const id = integer(req.params.id, 'id');
  await authorizedTransaction(req, true, async tx => {
    if (await tx.get("SELECT id FROM Prestamos WHERE libro_id=? AND estado IN ('activo','vencido') LIMIT 1", id)) fail(409, 'El libro tiene prestamos pendientes');
    if (!(await tx.run('UPDATE Libros SET deleted_at=CURRENT_TIMESTAMP WHERE id=? AND deleted_at IS NULL', id)).changes) fail(404, 'Libro no encontrado');
  });
  res.json({ mensaje: 'Libro archivado; historial conservado' });
}));

// Bounded uploads with maintained Multer; content determines the filename type.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 3 * 1024 * 1024, files: 1, fields: 5, parts: 6 } });
app.post('/api/upload', authMiddleware, requireAdmin, upload.single('portada'), route(async (req, res) => {
  if (!req.file) fail(400, 'Archivo requerido');
  const bytes = await normalizeCover(req.file.buffer);
  const filename = require('crypto').randomUUID() + '.webp';
  await fs.promises.writeFile(path.join(uploadDir, filename), bytes, { flag: 'wx', mode: 0o600 });
  res.status(201).json({ url: '/uploads/' + filename });
}));
app.post('/api/prestamos', authMiddleware, route(async (req, res) => {
  const libroId = integer(req.body.libro_id, 'libro_id');
  const dias = req.body.dias === undefined ? 7 : integer(req.body.dias, 'dias', 1, 30);
  const due = new Date(); due.setUTCDate(due.getUTCDate() + dias);
  const fecha = due.toISOString().slice(0, 10);
  const info = await authorizedTransaction(req, false, async (tx, user) => {
    if (!await tx.get('SELECT id FROM Libros WHERE id=? AND deleted_at IS NULL', libroId)) fail(404, 'Libro no encontrado');
    if (await tx.get("SELECT id FROM Prestamos WHERE usuario_id=? AND libro_id=? AND estado IN ('activo','vencido')", [user.id, libroId])) fail(409, 'Ya tienes este libro prestado');
    const stock = await tx.run('UPDATE Libros SET stock=stock-1,disponible=CASE WHEN stock>1 THEN 1 ELSE 0 END,updated_at=CURRENT_TIMESTAMP WHERE id=? AND deleted_at IS NULL AND stock>0 AND disponible=1', libroId);
    if (!stock.changes) fail(409, 'Libro no disponible');
    return tx.run('INSERT INTO Prestamos(usuario_id,libro_id,fecha_devolucion) VALUES(?,?,?)', [user.id, libroId, fecha]);
  });
  res.status(201).json({ id: info.lastID, mensaje: 'Prestamo registrado', fecha_devolucion: fecha });
}));
app.get('/api/prestamos/mis', authMiddleware, route(async (req, res) => {
  res.json((await db.all('SELECT p.*,l.titulo,l.autor,l.genero,l.anio,l.imagen_url,l.deleted_at AS libro_archivado FROM Prestamos p JOIN Libros l ON l.id=p.libro_id WHERE p.usuario_id=? ORDER BY p.fecha_prestamo DESC', req.user.id)).map(loan => displayLoan(loan)));
}));
app.put('/api/prestamos/:id/devolver', authMiddleware, route(async (req, res) => {
  const id = integer(req.params.id, 'id');
  await authorizedTransaction(req, false, async (tx, user) => {
    const loan = await tx.get('SELECT * FROM Prestamos WHERE id=?', id);
    if (!loan) fail(404, 'Prestamo no encontrado');
    if (loan.usuario_id !== user.id && user.rol !== 'admin') fail(403, 'No autorizado');
    const result = await tx.run("UPDATE Prestamos SET estado='devuelto',fecha_devuelto=CURRENT_TIMESTAMP WHERE id=? AND estado IN ('activo','vencido')", id);
    if (!result.changes) fail(409, 'Prestamo ya devuelto');
    await tx.run('UPDATE Libros SET stock=stock+1,disponible=1,updated_at=CURRENT_TIMESTAMP WHERE id=?', loan.libro_id);
  });
  res.json({ mensaje: 'Libro devuelto' });
}));
app.get('/api/prestamos', authMiddleware, requireAdmin, route(async (req, res) => {
  res.json((await db.all('SELECT p.*,l.titulo,l.deleted_at AS libro_archivado,u.nombre,u.email FROM Prestamos p JOIN Libros l ON l.id=p.libro_id JOIN Usuarios u ON u.id=p.usuario_id ORDER BY p.fecha_prestamo DESC LIMIT 100')).map(loan => displayLoan(loan)));
}));
app.get('/api/health', route(async (req, res) => {
  const { count } = await db.get('SELECT COUNT(*) AS count FROM Libros');
  res.json({ status: 'ok', version, db: 'sqlite', count });
}));
app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint no encontrado' }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  let status = error.status || 500;
  let message = error.message;
  if (req.path === '/api/upload' && /^(Unexpected end of (form|file)|Multipart:)/i.test(message)) { status = 400; message = 'Formulario multipart incompleto o invalido'; }
  if (error instanceof multer.MulterError) { status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400; message = 'Archivo o formulario invalido'; }
  if (error.code === 'SQLITE_CONSTRAINT') { status = 409; message = 'La operacion entra en conflicto con los datos existentes'; }
  if (error.code === 'SQLITE_BUSY') { status = 503; message = 'Base ocupada; vuelve a intentar'; }
  if (status >= 500) { log('api_error', { request_id: req.requestId, code: error.code || 'INTERNAL_ERROR' }, 'error'); if (status !== 503) message = 'Error interno del servidor'; }
  if (status === 400 && error.type === 'entity.parse.failed') message = 'JSON invalido';
  res.status(status).json({ error: message });
});
const PORT = process.env.SERVER_PORT || 3000;
let server, releaseLock;
async function shutdown() {
  const timeout = setTimeout(() => process.exit(1), 8000); timeout.unref();
  try {
    if (server) await new Promise(resolve => server.close(resolve));
    await writerQueue;
    if (db) await db.close();
    if (releaseLock) releaseLock();
    log('server_stopped');
  } catch { log('shutdown_failed', {}, 'error'); process.exitCode = 1; }
}
(async () => {
  releaseLock = require('../../config/instance-lock').acquire(dbPath);
  await initDB();
  server = app.listen(PORT, process.env.SERVER_HOST || '127.0.0.1', () => log('server_started', { port: server.address().port, url: `http://localhost:${server.address().port}` }));
  server.on('error', async error => { log('server_listen_failed', { code: error.code || 'LISTEN_ERROR' }, 'error'); await shutdown(); process.exitCode = 1; });
  process.once('SIGTERM', shutdown); process.once('SIGINT', shutdown);
})().catch(async error => { log('startup_failed', { code: error.code || 'STARTUP_ERROR' }, 'error'); if (db) await db.close().catch(() => {}); if (releaseLock) releaseLock(); process.exitCode = 1; });

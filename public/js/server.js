const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..')));

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

const JWT_SECRET = process.env.JWT_SECRET || 'qnx_dev_secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';

// ---------- SQLite (DB Browser SQLite) ----------
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const dbPath = path.resolve(__dirname, '..', '..', process.env.DB_PATH || 'public/database/biblioteca.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

let db;
async function initDB() {
  db = await open({ filename: dbPath, driver: sqlite3.Database });
  await db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Libros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      autor TEXT NOT NULL,
      genero TEXT,
      anio INTEGER,
      disponible INTEGER NOT NULL DEFAULT 1,
      stock INTEGER NOT NULL DEFAULT 3,
      imagen_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS Usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      rol TEXT NOT NULL DEFAULT 'visitante' CHECK(rol IN ('admin','visitante','user')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS Prestamos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      libro_id INTEGER NOT NULL,
      fecha_prestamo DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      fecha_devolucion DATE DEFAULT NULL,
      fecha_devuelto DATETIME DEFAULT NULL,
      estado TEXT NOT NULL DEFAULT 'activo' CHECK(estado IN ('activo','devuelto','vencido')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES Usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (libro_id) REFERENCES Libros(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_libros_genero ON Libros(genero);
    CREATE INDEX IF NOT EXISTS idx_libros_disponible ON Libros(disponible);
    CREATE INDEX IF NOT EXISTS idx_prestamos_usuario ON Prestamos(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_prestamos_libro ON Prestamos(libro_id);
  `);
  const { c } = await db.get('SELECT COUNT(*) as c FROM Libros');
  if (c === 0) {
    const libros = [
      ['Cien anos de soledad', 'Gabriel Garcia Marquez', 'Realismo magico', 1967, 1, 3, null],
      ['Don Quijote de la Mancha', 'Miguel de Cervantes', 'Clasico', 1605, 1, 2, null],
      ['La sombra del viento', 'Carlos Ruiz Zafon', 'Misterio', 2001, 1, 4, null],
      ['El principito', 'Antoine de Saint-Exupery', 'Ficcion', 1943, 1, 5, null],
      ['1984', 'George Orwell', 'Distopia', 1949, 1, 3, null],
      ['Rayuela', 'Julio Cortazar', 'Novela', 1963, 1, 2, null],
      ['Ficciones', 'Jorge Luis Borges', 'Cuento', 1944, 0, 0, null],
      ['La casa de los espiritus', 'Isabel Allende', 'Realismo magico', 1982, 1, 3, null],
      ['El amor en los tiempos del colera', 'Gabriel Garcia Marquez', 'Romance', 1985, 1, 2, null],
      ['Cronica de una muerte anunciada', 'Gabriel Garcia Marquez', 'Novela', 1981, 1, 4, null],
      ['El tunel', 'Ernesto Sabato', 'Novela psicologica', 1948, 1, 2, null],
      ['Pedro Paramo', 'Juan Rulfo', 'Realismo magico', 1955, 1, 3, null],
      ['Como agua para chocolate', 'Laura Esquivel', 'Romance', 1989, 0, 0, null],
      ['El Aleph', 'Jorge Luis Borges', 'Cuento', 1949, 1, 2, null],
      ['Orgullo y prejuicio', 'Jane Austen', 'Romance', 1813, 1, 3, null],
      ['Moby Dick', 'Herman Melville', 'Aventura', 1851, 1, 2, null],
      ['El senor de los anillos: La Comunidad del Anillo', 'J.R.R. Tolkien', 'Fantasia', 1954, 1, 4, null],
      ['Harry Potter y la piedra filosofal', 'J.K. Rowling', 'Fantasia', 1997, 1, 5, null],
      ['Dune', 'Frank Herbert', 'Ciencia ficcion', 1965, 1, 3, null],
      ['Fahrenheit 451', 'Ray Bradbury', 'Ciencia ficcion', 1953, 1, 3, null],
      ['Crimen y castigo', 'Fiodor Dostoievski', 'Clasico', 1866, 0, 0, null],
      ['El codigo Da Vinci', 'Dan Brown', 'Misterio', 2003, 1, 4, null],
      ['Los juegos del hambre', 'Suzanne Collins', 'Distopia', 2008, 1, 3, null],
      ['El psicoanalista', 'John Katzenbach', 'Thriller', 2002, 1, 2, null]
    ];
    for (const r of libros) await db.run('INSERT INTO Libros (titulo,autor,genero,anio,disponible,stock,imagen_url) VALUES (?,?,?,?,?,?,?)', r);
    console.log('Seed: 24 libros insertados (SQLite)');
  }
  const adminExists = await db.get('SELECT id FROM Usuarios WHERE email=?', 'admin@qnx.local');
  if (!adminExists) {
    const hash = bcrypt.hashSync('Admin123!', 10);
    await db.run('INSERT INTO Usuarios (nombre,email,password,rol) VALUES (?,?,?,?)', ['Admin QNX', 'admin@qnx.local', hash, 'admin']);
    console.log('Seed: admin@qnx.local / Admin123! (admin)');
  }
  const visitExists = await db.get('SELECT id FROM Usuarios WHERE email=?', 'visitante@qnx.local');
  if (!visitExists) {
    const hash2 = bcrypt.hashSync('visitante123', 10);
    await db.run('INSERT INTO Usuarios (nombre,email,password,rol) VALUES (?,?,?,?)', ['Visitante Demo', 'visitante@qnx.local', hash2, 'visitante']);
    console.log('Seed: visitante@qnx.local / visitante123 (visitante)');
  }
  console.log(`SQLite DB lista en ${dbPath} - DB Browser SQLite compatible`);
}
const dbReady = initDB();

// Helpers
function validarLibro(body) {
  const errores = [];
  if (!body.titulo || typeof body.titulo !== 'string' || body.titulo.trim().length < 2) errores.push('titulo requerido (min 2 caracteres)');
  if (!body.autor || typeof body.autor !== 'string' || body.autor.trim().length < 2) errores.push('autor requerido (min 2 caracteres)');
  if (body.genero && typeof body.genero !== 'string') errores.push('genero debe ser texto');
  if (body.anio !== undefined && body.anio !== null && body.anio !== '') {
    const anio = Number(body.anio);
    if (!Number.isInteger(anio) || anio < 1000 || anio > 2100) errores.push('anio debe ser entero entre 1000 y 2100');
  }
  if (body.stock !== undefined && body.stock !== null && body.stock !== '') {
    const s = Number(body.stock);
    if (!Number.isInteger(s) || s < 0 || s > 999) errores.push('stock debe ser entero 0-999');
  }
  if (body.disponible !== undefined && ![0,1,'0','1',true,false].includes(body.disponible)) errores.push('disponible debe ser 0/1');
  if (body.imagen_url && typeof body.imagen_url !== 'string') errores.push('imagen_url debe ser texto');
  return errores;
}
function validarRegistro(body) {
  const e = [];
  if (!body.nombre || body.nombre.trim().length < 2) e.push('nombre requerido (min 2)');
  if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) e.push('email invalido');
  if (!body.password || body.password.length < 6) e.push('password minimo 6 caracteres');
  if (body.rol && !['admin','visitante','user'].includes(body.rol)) e.push('rol invalido');
  return e;
}
function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autorizado: token requerido' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); } catch { return res.status(401).json({ error: 'Token invalido o expirado' }); }
}
function requireAdmin(req, res, next) {
  if (!req.user || req.user.rol !== 'admin') return res.status(403).json({ error: 'Requiere rol admin' });
  next();
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, Date.now() + '-' + Math.round(Math.random()*1e9) + ext);
  }
});
const upload = multer({
  storage, limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => { if (!file.mimetype.startsWith('image/')) return cb(new Error('Solo imagenes')); cb(null, true); }
});
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 30, message: { error: 'Demasiados intentos, intenta en 15 minutos' }, standardHeaders:true, legacyHeaders:false });

// Auth
app.post('/api/auth/register', authLimiter, async (req, res) => {
  await dbReady;
  const errores = validarRegistro(req.body);
  if (errores.length) return res.status(400).json({ error: errores.join(', ') });
  const { nombre, email, password, rol } = req.body;
  const emailNorm = email.trim().toLowerCase();
  let rolFinal = 'visitante';
  if (rol === 'admin') {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return res.status(403).json({ error: 'Solo admin puede crear usuarios admin' });
    try { const dec = jwt.verify(header.slice(7), JWT_SECRET); if (dec.rol !== 'admin') return res.status(403).json({ error: 'Solo admin puede crear usuarios admin' }); rolFinal='admin'; } catch { return res.status(401).json({ error: 'Token invalido' }); }
  } else if (rol && ['visitante','user'].includes(rol)) rolFinal=rol;
  const exists = await db.get('SELECT id FROM Usuarios WHERE email=?', emailNorm);
  if (exists) return res.status(409).json({ error: 'Email ya registrado' });
  const hash = bcrypt.hashSync(password, 10);
  const info = await db.run('INSERT INTO Usuarios (nombre,email,password,rol) VALUES (?,?,?,?)', [nombre.trim(), emailNorm, hash, rolFinal]);
  const token = jwt.sign({ id: info.lastID, email: emailNorm, nombre: nombre.trim(), rol: rolFinal }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  res.json({ mensaje: 'Usuario registrado', token, usuario: { id: info.lastID, nombre: nombre.trim(), email: emailNorm, rol: rolFinal } });
});
app.post('/api/auth/login', authLimiter, async (req, res) => {
  await dbReady;
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email y password requeridos' });
  const emailNorm = email.trim().toLowerCase();
  const user = await db.get('SELECT * FROM Usuarios WHERE email=?', emailNorm);
  if (!user) return res.status(401).json({ error: 'Credenciales invalidas' });
  const ok = bcrypt.compareSync(password, user.password);
  if (!ok) return res.status(401).json({ error: 'Credenciales invalidas' });
  const token = jwt.sign({ id: user.id, email: user.email, nombre: user.nombre, rol: user.rol }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  res.json({ mensaje: 'Login ok', token, usuario: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol } });
});
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  await dbReady;
  const user = await db.get('SELECT id,nombre,email,rol,created_at FROM Usuarios WHERE id=?', req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(user);
});
app.get('/api/usuarios', authMiddleware, requireAdmin, async (req, res) => {
  await dbReady;
  const rows = await db.all('SELECT id,nombre,email,rol,created_at FROM Usuarios ORDER BY id');
  res.json(rows);
});
app.delete('/api/usuarios/:id', authMiddleware, requireAdmin, async (req, res) => {
  await dbReady;
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
  const info = await db.run('DELETE FROM Usuarios WHERE id=?', id);
  if (info.changes === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ mensaje: 'Usuario eliminado' });
});
app.put('/api/usuarios/:id/rol', authMiddleware, requireAdmin, async (req, res) => {
  await dbReady;
  const id = Number(req.params.id);
  const { rol } = req.body;
  if (!['admin','visitante','user'].includes(rol)) return res.status(400).json({ error: 'Rol invalido' });
  const info = await db.run('UPDATE Usuarios SET rol=? WHERE id=?', [rol, id]);
  if (info.changes === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ mensaje: 'Rol actualizado' });
});

// Libros
app.get('/api/libros', async (req, res) => {
  await dbReady;
  const { search, genero, disponible, page, limit, sort, order } = req.query;
  let pageNum = Math.max(1, parseInt(page, 10) || 1);
  let limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 50));
  const allowedSort = ['id','titulo','autor','genero','anio','stock'];
  const sortCol = allowedSort.includes(sort) ? sort : 'id';
  const sortDir = (order && order.toLowerCase()==='desc') ? 'DESC' : 'ASC';
  let where = []; let params = [];
  if (search) { where.push('(titulo LIKE ? OR autor LIKE ? OR genero LIKE ?)'); const like=`%${search}%`; params.push(like,like,like); }
  if (genero) { where.push('genero = ?'); params.push(genero); }
  if (disponible !== undefined && disponible !== '') { where.push('disponible = ?'); params.push(disponible === '1' || disponible === 'true' ? 1 : 0); }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = (await db.get(`SELECT COUNT(*) as total FROM Libros ${whereSql}`, params)).total;
  const offset = (pageNum - 1) * limitNum;
  const rows = await db.all(`SELECT * FROM Libros ${whereSql} ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`, [...params, limitNum, offset]);
  if (req.query.page || req.query.limit || req.query.search || req.query.genero || req.query.sort) return res.json({ data: rows, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total/limitNum) });
  res.json(rows);
});
app.get('/api/libros/generos', async (req,res)=>{
  await dbReady;
  const rows = await db.all('SELECT DISTINCT genero FROM Libros WHERE genero IS NOT NULL ORDER BY genero');
  res.json(rows.map(r=>r.genero));
});
app.get('/api/libros/:id', async (req,res)=>{
  await dbReady;
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({error:'id invalido'});
  const row = await db.get('SELECT * FROM Libros WHERE id=?', id);
  if (!row) return res.status(404).json({error:'Libro no encontrado'});
  res.json(row);
});
app.post('/api/libros', authMiddleware, requireAdmin, async (req,res)=>{
  await dbReady;
  const errores = validarLibro(req.body);
  if (errores.length) return res.status(400).json({error: errores.join(', ')});
  const { titulo, autor, genero, anio, stock, disponible, imagen_url } = req.body;
  const stockVal = stock !== undefined && stock !== '' ? Number(stock) : 3;
  const dispVal = disponible !== undefined ? (disponible===1||disponible==='1'||disponible===true?1:0) : (stockVal>0?1:0);
  const info = await db.run('INSERT INTO Libros (titulo,autor,genero,anio,stock,disponible,imagen_url) VALUES (?,?,?,?,?,?,?)', [titulo.trim(), autor.trim(), genero||null, anio?Number(anio):null, stockVal, dispVal, imagen_url||null]);
  res.json({ id: info.lastID, mensaje:'Libro registrado' });
});
app.put('/api/libros/:id', authMiddleware, requireAdmin, async (req,res)=>{
  await dbReady;
  const id = Number(req.params.id);
  const errores = validarLibro(req.body);
  if (errores.length) return res.status(400).json({error: errores.join(', ')});
  const { titulo, autor, genero, anio, stock, disponible, imagen_url } = req.body;
  const stockVal = stock !== undefined && stock !== '' ? Number(stock) : undefined;
  let dispVal = disponible !== undefined ? (disponible===1||disponible==='1'||disponible===true?1:0) : undefined;
  const cur = await db.get('SELECT * FROM Libros WHERE id=?', id);
  if (!cur) return res.status(404).json({error:'Libro no encontrado'});
  const newStock = stockVal !== undefined ? stockVal : cur.stock;
  if (dispVal===undefined) dispVal = newStock>0?1:0;
  await db.run('UPDATE Libros SET titulo=?,autor=?,genero=?,anio=?,stock=?,disponible=?,imagen_url=?,updated_at=CURRENT_TIMESTAMP WHERE id=?', [titulo.trim(), autor.trim(), genero||null, anio?Number(anio):null, newStock, dispVal, imagen_url!==undefined?imagen_url:cur.imagen_url, id]);
  res.json({ mensaje:'Libro actualizado' });
});
app.delete('/api/libros/:id', authMiddleware, requireAdmin, async (req,res)=>{
  await dbReady;
  const id = Number(req.params.id);
  const info = await db.run('DELETE FROM Libros WHERE id=?', id);
  if (info.changes===0) return res.status(404).json({error:'Libro no encontrado'});
  res.json({ mensaje:'Libro eliminado' });
});
app.post('/api/upload', authMiddleware, requireAdmin, upload.single('portada'), (req,res)=>{
  if (!req.file) return res.status(400).json({error:'Archivo requerido'});
  res.json({ url: '/uploads/' + req.file.filename, mensaje:'Imagen subida' });
});

// Prestamos
app.post('/api/prestamos', authMiddleware, async (req,res)=>{
  await dbReady;
  const { libro_id, dias } = req.body;
  const libroId = Number(libro_id);
  const diasNum = Math.min(30, Math.max(1, parseInt(dias,10)||7));
  if (!Number.isInteger(libroId)) return res.status(400).json({error:'libro_id invalido'});
  const libro = await db.get('SELECT * FROM Libros WHERE id=?', libroId);
  if (!libro) return res.status(404).json({error:'Libro no encontrado'});
  if (!libro.disponible || libro.stock <=0) return res.status(409).json({error:'Libro no disponible'});
  const ex = await db.get('SELECT id FROM Prestamos WHERE usuario_id=? AND libro_id=? AND estado="activo"', [req.user.id, libroId]);
  if (ex) return res.status(409).json({error:'Ya tienes este libro prestado'});
  const fechaDev = new Date(); fechaDev.setDate(fechaDev.getDate()+diasNum);
  const fechaDevStr = fechaDev.toISOString().slice(0,10);
  const info = await db.run('INSERT INTO Prestamos (usuario_id,libro_id,fecha_devolucion) VALUES (?,?,?)', [req.user.id, libroId, fechaDevStr]);
  await db.run('UPDATE Libros SET stock = stock -1, disponible = CASE WHEN stock-1 <=0 THEN 0 ELSE 1 END, updated_at=CURRENT_TIMESTAMP WHERE id=?', libroId);
  res.json({ id: info.lastID, mensaje:'Prestamo registrado', fecha_devolucion: fechaDevStr });
});
app.get('/api/prestamos/mis', authMiddleware, async (req,res)=>{
  await dbReady;
  const rows = await db.all(`SELECT p.*, l.titulo, l.autor, l.genero, l.anio, l.imagen_url FROM Prestamos p JOIN Libros l ON p.libro_id=l.id WHERE p.usuario_id=? ORDER BY p.fecha_prestamo DESC`, req.user.id);
  res.json(rows);
});
app.put('/api/prestamos/:id/devolver', authMiddleware, async (req,res)=>{
  await dbReady;
  const id = Number(req.params.id);
  const p = await db.get('SELECT * FROM Prestamos WHERE id=?', id);
  if (!p) return res.status(404).json({error:'Prestamo no encontrado'});
  if (p.usuario_id !== req.user.id && req.user.rol !== 'admin') return res.status(403).json({error:'No autorizado'});
  if (p.estado !== 'activo') return res.status(400).json({error:'Prestamo ya devuelto'});
  await db.run('UPDATE Prestamos SET estado="devuelto", fecha_devuelto=CURRENT_TIMESTAMP WHERE id=?', id);
  await db.run('UPDATE Libros SET stock = stock +1, disponible=1, updated_at=CURRENT_TIMESTAMP WHERE id=?', p.libro_id);
  res.json({ mensaje:'Libro devuelto' });
});
app.get('/api/prestamos', authMiddleware, requireAdmin, async (req,res)=>{
  await dbReady;
  const rows = await db.all('SELECT p.*, l.titulo, u.nombre, u.email FROM Prestamos p JOIN Libros l ON p.libro_id=l.id JOIN Usuarios u ON p.usuario_id=u.id ORDER BY p.fecha_prestamo DESC LIMIT 100');
  res.json(rows);
});
app.get('/api/health', async (req,res)=>{
  await dbReady;
  const count = (await db.get('SELECT COUNT(*) as c FROM Libros')).c;
  const ucount = (await db.get('SELECT COUNT(*) as c FROM Usuarios')).c;
  res.json({ status:'ok', db: 'sqlite', path: dbPath, count, usuarios: ucount });
});
app.get('/api/generos', async (req,res)=>{
  await dbReady;
  const rows = await db.all('SELECT DISTINCT genero FROM Libros ORDER BY genero');
  res.json(rows.map(r=>r.genero));
});
const PORT = process.env.SERVER_PORT || 3000;
app.listen(PORT, () => console.log(`QNX Library v2.5 (SQLite) en http://localhost:${PORT} - DB: ${dbPath}`));

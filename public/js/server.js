const express = require('express');
const mysql = require('mysql2/promise');
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

// asegurar carpeta uploads
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

const JWT_SECRET = process.env.JWT_SECRET || 'qnx_dev_secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';

// Fallback en memoria (24 libros v2.3 + campos nuevos)
const fallbackLibros = [
  { id: 1, titulo: 'Cien anos de soledad', autor: 'Gabriel Garcia Marquez', genero: 'Realismo magico', anio: 1967, disponible: 1, stock: 3, imagen_url: null },
  { id: 2, titulo: 'Don Quijote de la Mancha', autor: 'Miguel de Cervantes', genero: 'Clasico', anio: 1605, disponible: 1, stock: 2, imagen_url: null },
  { id: 3, titulo: 'La sombra del viento', autor: 'Carlos Ruiz Zafon', genero: 'Misterio', anio: 2001, disponible: 1, stock: 4, imagen_url: null },
  { id: 4, titulo: 'El principito', autor: 'Antoine de Saint-Exupery', genero: 'Ficcion', anio: 1943, disponible: 1, stock: 5, imagen_url: null },
  { id: 5, titulo: '1984', autor: 'George Orwell', genero: 'Distopia', anio: 1949, disponible: 1, stock: 3, imagen_url: null },
  { id: 6, titulo: 'Rayuela', autor: 'Julio Cortazar', genero: 'Novela', anio: 1963, disponible: 1, stock: 2, imagen_url: null },
  { id: 7, titulo: 'Ficciones', autor: 'Jorge Luis Borges', genero: 'Cuento', anio: 1944, disponible: 0, stock: 0, imagen_url: null },
  { id: 8, titulo: 'La casa de los espiritus', autor: 'Isabel Allende', genero: 'Realismo magico', anio: 1982, disponible: 1, stock: 3, imagen_url: null },
  { id: 9, titulo: 'El amor en los tiempos del colera', autor: 'Gabriel Garcia Marquez', genero: 'Romance', anio: 1985, disponible: 1, stock: 2, imagen_url: null },
  { id: 10, titulo: 'Cronica de una muerte anunciada', autor: 'Gabriel Garcia Marquez', genero: 'Novela', anio: 1981, disponible: 1, stock: 4, imagen_url: null },
  { id: 11, titulo: 'El tunel', autor: 'Ernesto Sabato', genero: 'Novela psicologica', anio: 1948, disponible: 1, stock: 2, imagen_url: null },
  { id: 12, titulo: 'Pedro Paramo', autor: 'Juan Rulfo', genero: 'Realismo magico', anio: 1955, disponible: 1, stock: 3, imagen_url: null },
  { id: 13, titulo: 'Como agua para chocolate', autor: 'Laura Esquivel', genero: 'Romance', anio: 1989, disponible: 0, stock: 0, imagen_url: null },
  { id: 14, titulo: 'El Aleph', autor: 'Jorge Luis Borges', genero: 'Cuento', anio: 1949, disponible: 1, stock: 2, imagen_url: null },
  { id: 15, titulo: 'Orgullo y prejuicio', autor: 'Jane Austen', genero: 'Romance', anio: 1813, disponible: 1, stock: 3, imagen_url: null },
  { id: 16, titulo: 'Moby Dick', autor: 'Herman Melville', genero: 'Aventura', anio: 1851, disponible: 1, stock: 2, imagen_url: null },
  { id: 17, titulo: 'El senor de los anillos: La Comunidad del Anillo', autor: 'J.R.R. Tolkien', genero: 'Fantasia', anio: 1954, disponible: 1, stock: 4, imagen_url: null },
  { id: 18, titulo: 'Harry Potter y la piedra filosofal', autor: 'J.K. Rowling', genero: 'Fantasia', anio: 1997, disponible: 1, stock: 5, imagen_url: null },
  { id: 19, titulo: 'Dune', autor: 'Frank Herbert', genero: 'Ciencia ficcion', anio: 1965, disponible: 1, stock: 3, imagen_url: null },
  { id: 20, titulo: 'Fahrenheit 451', autor: 'Ray Bradbury', genero: 'Ciencia ficcion', anio: 1953, disponible: 1, stock: 3, imagen_url: null },
  { id: 21, titulo: 'Crimen y castigo', autor: 'Fiodor Dostoievski', genero: 'Clasico', anio: 1866, disponible: 0, stock: 0, imagen_url: null },
  { id: 22, titulo: 'El codigo Da Vinci', autor: 'Dan Brown', genero: 'Misterio', anio: 2003, disponible: 1, stock: 4, imagen_url: null },
  { id: 23, titulo: 'Los juegos del hambre', autor: 'Suzanne Collins', genero: 'Distopia', anio: 2008, disponible: 1, stock: 3, imagen_url: null },
  { id: 24, titulo: 'El psicoanalista', autor: 'John Katzenbach', genero: 'Thriller', anio: 2002, disponible: 1, stock: 2, imagen_url: null }
];
let fallbackUsuarios = []; // {id,nombre,email,password,rol}
let fallbackPrestamos = [];
let nextFallbackPrestamoId = 1;
let nextFallbackUserId = 1;

let pool = null;
let dbConnected = false;

async function initDB() {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'biblioteca',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    const conn = await pool.getConnection();
    await conn.ping();
    // auto-migración v2.4: asegurar columnas nuevas sin romper si ya existen
    try {
      const [cols] = await conn.query('SHOW COLUMNS FROM Libros');
      const fields = cols.map(c=>c.Field);
      if (!fields.includes('disponible')) { await conn.query('ALTER TABLE Libros ADD COLUMN disponible TINYINT(1) NOT NULL DEFAULT 1'); console.log('Migración: columna disponible agregada'); }
      if (!fields.includes('stock')) { await conn.query('ALTER TABLE Libros ADD COLUMN stock INT NOT NULL DEFAULT 3'); console.log('Migración: columna stock agregada'); }
      if (!fields.includes('imagen_url')) { await conn.query('ALTER TABLE Libros ADD COLUMN imagen_url VARCHAR(500) DEFAULT NULL'); console.log('Migración: columna imagen_url agregada'); }
      if (!fields.includes('updated_at')) { await conn.query('ALTER TABLE Libros ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'); console.log('Migración: columna updated_at agregada'); }
      const [ucols] = await conn.query('SHOW COLUMNS FROM Usuarios');
      const ufields = ucols.map(c=>c.Field);
      if (!ufields.includes('rol')) { await conn.query("ALTER TABLE Usuarios ADD COLUMN rol ENUM('user','admin') NOT NULL DEFAULT 'user'"); console.log('Migración: columna rol agregada'); }
      await conn.query(`
        CREATE TABLE IF NOT EXISTS Prestamos (
          id INT AUTO_INCREMENT PRIMARY KEY,
          usuario_id INT NOT NULL,
          libro_id INT NOT NULL,
          fecha_prestamo DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          fecha_devolucion DATE DEFAULT NULL,
          fecha_devuelto DATETIME DEFAULT NULL,
          estado ENUM('activo','devuelto','vencido') NOT NULL DEFAULT 'activo',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (usuario_id) REFERENCES Usuarios(id) ON DELETE CASCADE,
          FOREIGN KEY (libro_id) REFERENCES Libros(id) ON DELETE CASCADE,
          INDEX idx_usuario (usuario_id),
          INDEX idx_libro (libro_id)
        )
      `);
    } catch (migErr) { console.warn('Migración v2.4 advertencia:', migErr.message); }
    conn.release();
    dbConnected = true;
    console.log('Conectado a MySQL (pool promise) - v2.4 listo');
  } catch (err) {
    console.error('Error conexion MySQL (fallback en memoria):', err.message);
    console.log('Tip: verifica .env y que MySQL este corriendo. La API usara datos en memoria.');
    dbConnected = false;
  }
}
initDB();

// ---------- Helpers ----------
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
  return e;
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autorizado: token requerido' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalido o expirado' });
  }
}

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = Date.now() + '-' + Math.round(Math.random()*1e9) + ext;
    cb(null, name);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Solo imagenes permitidas'));
    cb(null, true);
  }
});

// Rate limiting auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Demasiados intentos, intenta en 15 minutos' },
  standardHeaders: true,
  legacyHeaders: false
});

// ---------- Auth routes ----------
app.post('/api/auth/register', authLimiter, async (req, res) => {
  const errores = validarRegistro(req.body);
  if (errores.length) return res.status(400).json({ error: errores.join(', ') });
  const { nombre, email, password } = req.body;
  const emailNorm = email.trim().toLowerCase();
  try {
    if (dbConnected) {
      const [exists] = await pool.query('SELECT id FROM Usuarios WHERE email=?', [emailNorm]);
      if (exists.length) return res.status(409).json({ error: 'Email ya registrado' });
      const hash = await bcrypt.hash(password, 10);
      const [result] = await pool.query('INSERT INTO Usuarios (nombre,email,password) VALUES (?,?,?)', [nombre.trim(), emailNorm, hash]);
      const token = jwt.sign({ id: result.insertId, email: emailNorm, nombre: nombre.trim(), rol: 'user' }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
      return res.json({ mensaje: 'Usuario registrado', token, usuario: { id: result.insertId, nombre: nombre.trim(), email: emailNorm, rol: 'user' } });
    } else {
      if (fallbackUsuarios.find(u=>u.email===emailNorm)) return res.status(409).json({ error: 'Email ya registrado (fallback)' });
      const hash = await bcrypt.hash(password, 10);
      const user = { id: nextFallbackUserId++, nombre: nombre.trim(), email: emailNorm, password: hash, rol: 'user' };
      fallbackUsuarios.push(user);
      const token = jwt.sign({ id: user.id, email: user.email, nombre: user.nombre, rol: user.rol }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
      return res.json({ mensaje: 'Usuario registrado (fallback)', token, usuario: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol } });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en registro' });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email y password requeridos' });
  const emailNorm = email.trim().toLowerCase();
  try {
    let user = null;
    if (dbConnected) {
      const [rows] = await pool.query('SELECT * FROM Usuarios WHERE email=?', [emailNorm]);
      if (!rows.length) return res.status(401).json({ error: 'Credenciales invalidas' });
      user = rows[0];
    } else {
      user = fallbackUsuarios.find(u=>u.email===emailNorm);
      if (!user) return res.status(401).json({ error: 'Credenciales invalidas (fallback)' });
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Credenciales invalidas' });
    const token = jwt.sign({ id: user.id, email: user.email, nombre: user.nombre, rol: user.rol || 'user' }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.json({ mensaje: 'Login ok', token, usuario: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol || 'user' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en login' });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    if (dbConnected) {
      const [rows] = await pool.query('SELECT id,nombre,email,rol,created_at FROM Usuarios WHERE id=?', [req.user.id]);
      if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
      return res.json(rows[0]);
    } else {
      const u = fallbackUsuarios.find(x=>x.id===req.user.id);
      if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
      return res.json({ id: u.id, nombre: u.nombre, email: u.email, rol: u.rol });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ---------- Libros ----------
app.get('/api/libros', async (req, res) => {
  const { search, genero, disponible, page, limit, sort, order } = req.query;
  let pageNum = Math.max(1, parseInt(page, 10) || 1);
  let limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 50));
  const allowedSort = ['id','titulo','autor','genero','anio','stock'];
  const sortCol = allowedSort.includes(sort) ? sort : 'id';
  const sortDir = (order && order.toLowerCase()==='desc') ? 'DESC' : 'ASC';

  if (dbConnected) {
    try {
      let where = [];
      let params = [];
      if (search) {
        where.push('(titulo LIKE ? OR autor LIKE ? OR genero LIKE ?)');
        const like = `%${search}%`;
        params.push(like, like, like);
      }
      if (genero) { where.push('genero = ?'); params.push(genero); }
      if (disponible !== undefined && disponible !== '' ) {
        where.push('disponible = ?'); params.push(disponible === '1' || disponible === 'true' ? 1 : 0);
      }
      const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
      const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM Libros ${whereSql}`, params);
      const total = countRows[0].total;
      const offset = (pageNum - 1) * limitNum;
      const [rows] = await pool.query(`SELECT * FROM Libros ${whereSql} ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`, [...params, limitNum, offset]);
      // si piden paginacion explicita devolver objeto, sino array simple por compatibilidad
      if (req.query.page || req.query.limit || req.query.search || req.query.genero || req.query.sort) {
        return res.json({ data: rows, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total/limitNum) });
      }
      return res.json(rows);
    } catch (err) {
      console.error('DB error libros:', err.message);
      return res.json(fallbackLibros);
    }
  } else {
    // fallback filtrado en memoria
    let data = [...fallbackLibros];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(l => l.titulo.toLowerCase().includes(q) || l.autor.toLowerCase().includes(q) || (l.genero||'').toLowerCase().includes(q));
    }
    if (genero) data = data.filter(l=>l.genero===genero);
    if (disponible !== undefined && disponible !== '') {
      const d = disponible === '1' || disponible === 'true' ? 1 : 0;
      data = data.filter(l=>l.disponible===d);
    }
    data.sort((a,b)=> {
      let av = a[sortCol], bv = b[sortCol];
      if (typeof av === 'string') av = av.toLowerCase(); if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir==='ASC'?-1:1; if (av > bv) return sortDir==='ASC'?1:-1; return 0;
    });
    const total = data.length;
    const offset = (pageNum-1)*limitNum;
    const paged = data.slice(offset, offset+limitNum);
    if (req.query.page || req.query.limit || req.query.search || req.query.genero || req.query.sort) {
      return res.json({ data: paged, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total/limitNum) });
    }
    return res.json(data);
  }
});

app.get('/api/libros/generos', async (req,res)=>{
  if (dbConnected) {
    const [rows] = await pool.query('SELECT DISTINCT genero FROM Libros WHERE genero IS NOT NULL ORDER BY genero');
    return res.json(rows.map(r=>r.genero));
  } else {
    const set = [...new Set(fallbackLibros.map(l=>l.genero).filter(Boolean))].sort();
    return res.json(set);
  }
});

app.get('/api/libros/:id', async (req,res)=>{
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({error:'id invalido'});
  if (dbConnected) {
    const [rows] = await pool.query('SELECT * FROM Libros WHERE id=?', [id]);
    if (!rows.length) return res.status(404).json({error:'Libro no encontrado'});
    return res.json(rows[0]);
  } else {
    const libro = fallbackLibros.find(l=>l.id===id);
    if (!libro) return res.status(404).json({error:'Libro no encontrado'});
    return res.json(libro);
  }
});

app.post('/api/libros', authMiddleware, async (req,res)=>{
  const errores = validarLibro(req.body);
  if (errores.length) return res.status(400).json({error: errores.join(', ')});
  const { titulo, autor, genero, anio, stock, disponible, imagen_url } = req.body;
  const stockVal = stock !== undefined && stock !== '' ? Number(stock) : 3;
  const dispVal = disponible !== undefined ? (disponible===1||disponible==='1'||disponible===true?1:0) : (stockVal>0?1:0);
  if (dbConnected) {
    try {
      const [result] = await pool.query('INSERT INTO Libros (titulo,autor,genero,anio,stock,disponible,imagen_url) VALUES (?,?,?,?,?,?,?)',
        [titulo.trim(), autor.trim(), genero||null, anio?Number(anio):null, stockVal, dispVal, imagen_url||null]);
      res.json({ id: result.insertId, mensaje:'Libro registrado' });
    } catch(err){ res.status(500).json({error:err.message}); }
  } else {
    const id = Math.max(...fallbackLibros.map(l=>l.id),0)+1;
    fallbackLibros.push({ id, titulo: titulo.trim(), autor: autor.trim(), genero: genero||null, anio: anio?Number(anio):null, stock: stockVal, disponible: dispVal, imagen_url: imagen_url||null });
    res.json({ id, mensaje:'Libro registrado (fallback)'});
  }
});

app.put('/api/libros/:id', authMiddleware, async (req,res)=>{
  const id = Number(req.params.id);
  const errores = validarLibro(req.body);
  if (errores.length) return res.status(400).json({error: errores.join(', ')});
  const { titulo, autor, genero, anio, stock, disponible, imagen_url } = req.body;
  const stockVal = stock !== undefined && stock !== '' ? Number(stock) : undefined;
  let dispVal = disponible !== undefined ? (disponible===1||disponible==='1'||disponible===true?1:0) : undefined;
  if (dbConnected) {
    try {
      const [rows] = await pool.query('SELECT * FROM Libros WHERE id=?', [id]);
      if (!rows.length) return res.status(404).json({error:'Libro no encontrado'});
      const cur = rows[0];
      const newStock = stockVal !== undefined ? stockVal : cur.stock;
      if (dispVal===undefined) dispVal = newStock>0?1:0;
      const [result] = await pool.query('UPDATE Libros SET titulo=?,autor=?,genero=?,anio=?,stock=?,disponible=?,imagen_url=? WHERE id=?',
        [titulo.trim(), autor.trim(), genero||null, anio?Number(anio):null, newStock, dispVal, imagen_url!==undefined?imagen_url:cur.imagen_url, id]);
      res.json({ mensaje:'Libro actualizado' });
    } catch(err){ res.status(500).json({error:err.message}); }
  } else {
    const idx = fallbackLibros.findIndex(l=>l.id===id);
    if (idx===-1) return res.status(404).json({error:'Libro no encontrado'});
    const cur = fallbackLibros[idx];
    const newStock = stockVal !== undefined ? stockVal : cur.stock;
    if (dispVal===undefined) dispVal = newStock>0?1:0;
    fallbackLibros[idx] = { ...cur, titulo: titulo.trim(), autor: autor.trim(), genero: genero||null, anio: anio?Number(anio):null, stock: newStock, disponible: dispVal, imagen_url: imagen_url!==undefined?imagen_url:cur.imagen_url };
    res.json({ mensaje:'Libro actualizado (fallback)'});
  }
});

app.delete('/api/libros/:id', authMiddleware, async (req,res)=>{
  const id = Number(req.params.id);
  if (dbConnected) {
    const [result] = await pool.query('DELETE FROM Libros WHERE id=?', [id]);
    if (result.affectedRows===0) return res.status(404).json({error:'Libro no encontrado'});
    res.json({ mensaje:'Libro eliminado' });
  } else {
    const idx = fallbackLibros.findIndex(l=>l.id===id);
    if (idx===-1) return res.status(404).json({error:'Libro no encontrado'});
    fallbackLibros.splice(idx,1);
    res.json({ mensaje:'Libro eliminado (fallback)'});
  }
});

// Upload portada
app.post('/api/upload', authMiddleware, upload.single('portada'), (req,res)=>{
  if (!req.file) return res.status(400).json({error:'Archivo requerido'});
  const url = '/uploads/' + req.file.filename;
  res.json({ url, mensaje:'Imagen subida' });
});

// ---------- Prestamos ----------
app.post('/api/prestamos', authMiddleware, async (req,res)=>{
  const { libro_id, dias } = req.body;
  const libroId = Number(libro_id);
  const diasNum = Math.min(30, Math.max(1, parseInt(dias,10)||7));
  if (!Number.isInteger(libroId)) return res.status(400).json({error:'libro_id invalido'});
  try {
    if (dbConnected) {
      const [libros] = await pool.query('SELECT * FROM Libros WHERE id=?', [libroId]);
      if (!libros.length) return res.status(404).json({error:'Libro no encontrado'});
      const libro = libros[0];
      if (!libro.disponible || libro.stock <=0) return res.status(409).json({error:'Libro no disponible'});
      // verificar que usuario no tenga prestamo activo mismo libro
      const [ex] = await pool.query('SELECT id FROM Prestamos WHERE usuario_id=? AND libro_id=? AND estado="activo"', [req.user.id, libroId]);
      if (ex.length) return res.status(409).json({error:'Ya tienes este libro prestado'});
      const fechaDev = new Date(); fechaDev.setDate(fechaDev.getDate()+diasNum);
      const fechaDevStr = fechaDev.toISOString().slice(0,10);
      const [result] = await pool.query('INSERT INTO Prestamos (usuario_id,libro_id,fecha_devolucion) VALUES (?,?,?)', [req.user.id, libroId, fechaDevStr]);
      await pool.query('UPDATE Libros SET stock = stock -1, disponible = CASE WHEN stock-1 <=0 THEN 0 ELSE 1 END WHERE id=?', [libroId]);
      res.json({ id: result.insertId, mensaje:'Prestamo registrado', fecha_devolucion: fechaDevStr });
    } else {
      const libro = fallbackLibros.find(l=>l.id===libroId);
      if (!libro) return res.status(404).json({error:'Libro no encontrado'});
      if (!libro.disponible || libro.stock <=0) return res.status(409).json({error:'Libro no disponible'});
      if (fallbackPrestamos.find(p=>p.usuario_id===req.user.id && p.libro_id===libroId && p.estado==='activo')) return res.status(409).json({error:'Ya tienes este libro prestado'});
      const fechaDev = new Date(); fechaDev.setDate(fechaDev.getDate()+diasNum);
      const p = { id: nextFallbackPrestamoId++, usuario_id: req.user.id, libro_id: libroId, fecha_prestamo: new Date().toISOString(), fecha_devolucion: fechaDev.toISOString().slice(0,10), estado:'activo' };
      fallbackPrestamos.push(p);
      libro.stock -=1; if (libro.stock<=0) libro.disponible=0;
      res.json({ id: p.id, mensaje:'Prestamo registrado (fallback)', fecha_devolucion: p.fecha_devolucion });
    }
  } catch(err){ console.error(err); res.status(500).json({error:err.message}); }
});

app.get('/api/prestamos/mis', authMiddleware, async (req,res)=>{
  try {
    if (dbConnected) {
      const [rows] = await pool.query(
        `SELECT p.*, l.titulo, l.autor, l.genero, l.anio, l.imagen_url FROM Prestamos p JOIN Libros l ON p.libro_id=l.id WHERE p.usuario_id=? ORDER BY p.fecha_prestamo DESC`, [req.user.id]);
      res.json(rows);
    } else {
      const rows = fallbackPrestamos.filter(p=>p.usuario_id===req.user.id).map(p=>{
        const l = fallbackLibros.find(x=>x.id===p.libro_id) || {};
        return { ...p, titulo:l.titulo, autor:l.autor, genero:l.genero, anio:l.anio, imagen_url:l.imagen_url };
      }).sort((a,b)=> new Date(b.fecha_prestamo)-new Date(a.fecha_prestamo));
      res.json(rows);
    }
  } catch(err){ res.status(500).json({error:err.message}); }
});

app.put('/api/prestamos/:id/devolver', authMiddleware, async (req,res)=>{
  const id = Number(req.params.id);
  try {
    if (dbConnected) {
      const [rows] = await pool.query('SELECT * FROM Prestamos WHERE id=?', [id]);
      if (!rows.length) return res.status(404).json({error:'Prestamo no encontrado'});
      const p = rows[0];
      if (p.usuario_id !== req.user.id && req.user.rol !== 'admin') return res.status(403).json({error:'No autorizado'});
      if (p.estado !== 'activo') return res.status(400).json({error:'Prestamo ya devuelto'});
      await pool.query('UPDATE Prestamos SET estado="devuelto", fecha_devuelto=NOW() WHERE id=?', [id]);
      await pool.query('UPDATE Libros SET stock = stock +1, disponible=1 WHERE id=?', [p.libro_id]);
      res.json({ mensaje:'Libro devuelto' });
    } else {
      const p = fallbackPrestamos.find(x=>x.id===id);
      if (!p) return res.status(404).json({error:'Prestamo no encontrado'});
      if (p.usuario_id !== req.user.id) return res.status(403).json({error:'No autorizado'});
      if (p.estado !== 'activo') return res.status(400).json({error:'Ya devuelto'});
      p.estado='devuelto'; p.fecha_devuelto=new Date().toISOString();
      const libro = fallbackLibros.find(l=>l.id===p.libro_id); if(libro){ libro.stock+=1; libro.disponible=1; }
      res.json({ mensaje:'Libro devuelto (fallback)'});
    }
  } catch(err){ res.status(500).json({error:err.message}); }
});

app.get('/api/prestamos', authMiddleware, async (req,res)=>{
  // opcional admin: lista todos
  try {
    if (dbConnected) {
      const [rows] = await pool.query('SELECT p.*, l.titulo, u.nombre, u.email FROM Prestamos p JOIN Libros l ON p.libro_id=l.id JOIN Usuarios u ON p.usuario_id=u.id ORDER BY p.fecha_prestamo DESC LIMIT 100');
      res.json(rows);
    } else {
      const rows = fallbackPrestamos.map(p=>{
        const l=fallbackLibros.find(x=>x.id===p.libro_id)||{}; const u=fallbackUsuarios.find(x=>x.id===p.usuario_id)||{};
        return {...p, titulo:l.titulo, nombre:u.nombre, email:u.email};
      });
      res.json(rows);
    }
  } catch(err){ res.status(500).json({error:err.message}); }
});

// health
app.get('/api/health', async (req,res)=>{
  let dbStatus = dbConnected ? 'mysql' : 'fallback';
  let count = fallbackLibros.length;
  if (dbConnected) {
    try { const [r]=await pool.query('SELECT COUNT(*) as c FROM Libros'); count=r[0].c; } catch(e){ dbStatus='fallback'; }
  }
  res.json({ status:'ok', db: dbStatus, count });
});

// fallback SPA for libro detail (express static already serves)
app.get('/api/generos', async (req,res)=>{ // alias
  if (dbConnected) {
    const [rows] = await pool.query('SELECT DISTINCT genero FROM Libros ORDER BY genero');
    return res.json(rows.map(r=>r.genero));
  } else {
    return res.json([...new Set(fallbackLibros.map(l=>l.genero))]);
  }
});

const PORT = process.env.SERVER_PORT || 3000;
app.listen(PORT, () => console.log(`QNX Library v2.4 en http://localhost:${PORT} - DB: ${dbConnected ? 'MySQL' : 'fallback (iniciando...)'}`));

// actualizar log cuando DB conecta despues
setTimeout(()=>{ if(dbConnected) console.log('DB pool listo'); }, 1500);

// db.js — QNX Library localStorage database (GitHub Pages / static)
// Depends on: crypto-utils.js (sha256hex)

const DB_KEY = 'qnx_db';

// Pre-computed SHA-256 hashes
const HASH_ADMIN    = '3eb3fe66b31e3b4d10fa70b5cad49c7112294af6ae4e476a1c405155d45aa121';
const HASH_VISITANTE = '68ec8208692da824e2e99a22252e1e85e382d9850fc5c5aff9950f9c1e140c90';

const SEED_LIBROS = [
  { id:1,  titulo:'Cien años de soledad',               autor:'Gabriel García Márquez',   genero:'Realismo mágico',    anio:1967, disponible:1, stock:3, imagen_url:null },
  { id:2,  titulo:'Don Quijote de la Mancha',            autor:'Miguel de Cervantes',      genero:'Clásico',           anio:1605, disponible:1, stock:2, imagen_url:null },
  { id:3,  titulo:'La sombra del viento',               autor:'Carlos Ruiz Zafón',        genero:'Misterio',          anio:2001, disponible:1, stock:4, imagen_url:null },
  { id:4,  titulo:'El principito',                      autor:'Antoine de Saint-Exupéry', genero:'Ficción',           anio:1943, disponible:1, stock:5, imagen_url:null },
  { id:5,  titulo:'1984',                               autor:'George Orwell',            genero:'Distopía',          anio:1949, disponible:1, stock:3, imagen_url:null },
  { id:6,  titulo:'Rayuela',                            autor:'Julio Cortázar',           genero:'Novela',            anio:1963, disponible:1, stock:2, imagen_url:null },
  { id:7,  titulo:'Ficciones',                          autor:'Jorge Luis Borges',        genero:'Cuento',            anio:1944, disponible:0, stock:0, imagen_url:null },
  { id:8,  titulo:'La casa de los espíritus',           autor:'Isabel Allende',           genero:'Realismo mágico',    anio:1982, disponible:1, stock:3, imagen_url:null },
  { id:9,  titulo:'El amor en los tiempos del cólera',  autor:'Gabriel García Márquez',   genero:'Romance',           anio:1985, disponible:1, stock:2, imagen_url:null },
  { id:10, titulo:'Crónica de una muerte anunciada',    autor:'Gabriel García Márquez',   genero:'Novela',            anio:1981, disponible:1, stock:4, imagen_url:null },
  { id:11, titulo:'El túnel',                           autor:'Ernesto Sábato',           genero:'Novela psicológica', anio:1948, disponible:1, stock:2, imagen_url:null },
  { id:12, titulo:'Pedro Páramo',                       autor:'Juan Rulfo',               genero:'Realismo mágico',    anio:1955, disponible:1, stock:3, imagen_url:null },
  { id:13, titulo:'Como agua para chocolate',           autor:'Laura Esquivel',           genero:'Romance',           anio:1989, disponible:0, stock:0, imagen_url:null },
  { id:14, titulo:'El Aleph',                           autor:'Jorge Luis Borges',        genero:'Cuento',            anio:1949, disponible:1, stock:2, imagen_url:null },
  { id:15, titulo:'Orgullo y prejuicio',                autor:'Jane Austen',              genero:'Romance',           anio:1813, disponible:1, stock:3, imagen_url:null },
  { id:16, titulo:'Moby Dick',                          autor:'Herman Melville',          genero:'Aventura',          anio:1851, disponible:1, stock:2, imagen_url:null },
  { id:17, titulo:'El señor de los anillos: La Comunidad del Anillo', autor:'J.R.R. Tolkien', genero:'Fantasía', anio:1954, disponible:1, stock:4, imagen_url:null },
  { id:18, titulo:'Harry Potter y la piedra filosofal', autor:'J.K. Rowling',             genero:'Fantasía',          anio:1997, disponible:1, stock:5, imagen_url:null },
  { id:19, titulo:'Dune',                               autor:'Frank Herbert',            genero:'Ciencia ficción',   anio:1965, disponible:1, stock:3, imagen_url:null },
  { id:20, titulo:'Fahrenheit 451',                     autor:'Ray Bradbury',             genero:'Ciencia ficción',   anio:1953, disponible:1, stock:3, imagen_url:null },
  { id:21, titulo:'Crimen y castigo',                   autor:'Fiódor Dostoyevski',       genero:'Clásico',           anio:1866, disponible:0, stock:0, imagen_url:null },
  { id:22, titulo:'El código Da Vinci',                 autor:'Dan Brown',                genero:'Misterio',          anio:2003, disponible:1, stock:4, imagen_url:null },
  { id:23, titulo:'Los juegos del hambre',              autor:'Suzanne Collins',          genero:'Distopía',          anio:2008, disponible:1, stock:3, imagen_url:null },
  { id:24, titulo:'El psicoanalista',                   autor:'John Katzenbach',          genero:'Thriller',          anio:2002, disponible:1, stock:2, imagen_url:null }
];

const SEED_USUARIOS = [
  { id:1, nombre:'Admin QNX',      email:'admin@qnx.local',     password_hash: HASH_ADMIN,     rol:'admin',     created_at: new Date().toISOString() },
  { id:2, nombre:'Visitante Demo', email:'visitante@qnx.local', password_hash: HASH_VISITANTE, rol:'visitante', created_at: new Date().toISOString() }
];

function _load() {
  try { return JSON.parse(localStorage.getItem(DB_KEY)) || null; } catch { return null; }
}
function _save(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}
function _now() { return new Date().toISOString(); }

function initDB() {
  const existing = _load();
  // Force re-seed if admin hash is outdated
  if (existing) {
    const admin = existing.usuarios && existing.usuarios.find(u => u.email === 'admin@qnx.local');
    if (admin && admin.password_hash !== HASH_ADMIN) {
      localStorage.removeItem(DB_KEY);
    } else {
      return;
    }
  }
  const db = {
    libros: SEED_LIBROS.map(l => ({ ...l, created_at: _now(), updated_at: _now() })),
    usuarios: SEED_USUARIOS,
    prestamos: [],
    nextIds: { libros: 25, usuarios: 3, prestamos: 1 }
  };
  _save(db);
}

// ── Libros ────────────────────────────────────────────────────────────
function getLibros(filters = {}) {
  const db = _load();
  let rows = db.libros.slice();
  const { search, genero, disponible, page = 1, limit = 50, sort = 'id', order = 'asc' } = filters;
  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter(l =>
      l.titulo.toLowerCase().includes(q) ||
      l.autor.toLowerCase().includes(q) ||
      (l.genero || '').toLowerCase().includes(q)
    );
  }
  if (genero) rows = rows.filter(l => l.genero === genero);
  if (disponible !== undefined && disponible !== '') {
    const d = disponible === '1' || disponible === true || disponible === 1 ? 1 : 0;
    rows = rows.filter(l => l.disponible === d);
  }
  const allowedSort = ['id','titulo','autor','genero','anio','stock'];
  const sortCol = allowedSort.includes(sort) ? sort : 'id';
  rows.sort((a, b) => {
    const av = a[sortCol] ?? '', bv = b[sortCol] ?? '';
    if (av < bv) return order === 'asc' ? -1 : 1;
    if (av > bv) return order === 'asc' ? 1 : -1;
    return 0;
  });
  const total = rows.length;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 50));
  const totalPages = Math.ceil(total / limitNum) || 1;
  const data = rows.slice((pageNum - 1) * limitNum, pageNum * limitNum);
  return { data, total, page: pageNum, limit: limitNum, totalPages };
}

function getLibro(id) {
  const db = _load();
  return db.libros.find(l => l.id === Number(id)) || null;
}

function createLibro(data) {
  const db = _load();
  const stockVal = data.stock !== undefined && data.stock !== '' ? Number(data.stock) : 3;
  const dispVal = stockVal > 0 ? 1 : 0;
  const libro = {
    id: db.nextIds.libros++,
    titulo: (data.titulo || '').trim(),
    autor: (data.autor || '').trim(),
    genero: data.genero || null,
    anio: data.anio ? Number(data.anio) : null,
    disponible: dispVal,
    stock: stockVal,
    imagen_url: data.imagen_url || null,
    created_at: _now(),
    updated_at: _now()
  };
  db.libros.push(libro);
  _save(db);
  return libro;
}

function updateLibro(id, data) {
  const db = _load();
  const idx = db.libros.findIndex(l => l.id === Number(id));
  if (idx === -1) throw new Error('Libro no encontrado');
  const cur = db.libros[idx];
  const stockVal = data.stock !== undefined && data.stock !== '' ? Number(data.stock) : cur.stock;
  const dispVal = stockVal > 0 ? 1 : 0;
  db.libros[idx] = {
    ...cur,
    titulo: (data.titulo || cur.titulo).trim(),
    autor: (data.autor || cur.autor).trim(),
    genero: data.genero !== undefined ? (data.genero || null) : cur.genero,
    anio: data.anio !== undefined ? (data.anio ? Number(data.anio) : null) : cur.anio,
    stock: stockVal,
    disponible: dispVal,
    imagen_url: data.imagen_url !== undefined ? (data.imagen_url || null) : cur.imagen_url,
    updated_at: _now()
  };
  _save(db);
  return db.libros[idx];
}

function deleteLibro(id) {
  const db = _load();
  const idx = db.libros.findIndex(l => l.id === Number(id));
  if (idx === -1) throw new Error('Libro no encontrado');
  db.libros.splice(idx, 1);
  _save(db);
}

function getGeneros() {
  const db = _load();
  return [...new Set(db.libros.map(l => l.genero).filter(Boolean))].sort();
}

// ── Usuarios ──────────────────────────────────────────────────────────
function getUsuario(email) {
  const db = _load();
  return db.usuarios.find(u => u.email === email.trim().toLowerCase()) || null;
}

async function createUsuario(data) {
  const db = _load();
  const emailNorm = (data.email || '').trim().toLowerCase();
  if (db.usuarios.find(u => u.email === emailNorm)) throw new Error('Email ya registrado');
  const hash = await sha256hex(data.password);
  const user = {
    id: db.nextIds.usuarios++,
    nombre: (data.nombre || '').trim(),
    email: emailNorm,
    password_hash: hash,
    rol: data.rol || 'visitante',
    created_at: _now()
  };
  db.usuarios.push(user);
  _save(db);
  return user;
}

async function validatePassword(plain, hash) {
  const h = await sha256hex(plain);
  return h === hash;
}

function getAllUsuarios() {
  const db = _load();
  return db.usuarios.map(({ password_hash, ...rest }) => rest);
}

function deleteUsuario(id) {
  const db = _load();
  const idx = db.usuarios.findIndex(u => u.id === Number(id));
  if (idx === -1) throw new Error('Usuario no encontrado');
  db.usuarios.splice(idx, 1);
  _save(db);
}

function updateUsuarioRol(id, rol) {
  const db = _load();
  const idx = db.usuarios.findIndex(u => u.id === Number(id));
  if (idx === -1) throw new Error('Usuario no encontrado');
  db.usuarios[idx].rol = rol;
  _save(db);
}

// ── Préstamos ─────────────────────────────────────────────────────────
function createPrestamo(usuarioId, libroId, dias = 7) {
  const db = _load();
  const libro = db.libros.find(l => l.id === Number(libroId));
  if (!libro) throw new Error('Libro no encontrado');
  if (!libro.disponible || libro.stock <= 0) throw new Error('Libro no disponible');
  const existing = db.prestamos.find(p =>
    p.usuario_id === Number(usuarioId) &&
    p.libro_id === Number(libroId) &&
    p.estado === 'activo'
  );
  if (existing) throw new Error('Ya tienes este libro prestado');
  const diasNum = Math.min(30, Math.max(1, parseInt(dias, 10) || 7));
  const fechaDev = new Date();
  fechaDev.setDate(fechaDev.getDate() + diasNum);
  const prestamo = {
    id: db.nextIds.prestamos++,
    usuario_id: Number(usuarioId),
    libro_id: Number(libroId),
    fecha_prestamo: _now(),
    fecha_devolucion: fechaDev.toISOString().slice(0, 10),
    fecha_devuelto: null,
    estado: 'activo',
    created_at: _now()
  };
  db.prestamos.push(prestamo);
  libro.stock -= 1;
  libro.disponible = libro.stock > 0 ? 1 : 0;
  libro.updated_at = _now();
  _save(db);
  return prestamo;
}

function getMisPrestamos(usuarioId) {
  const db = _load();
  return db.prestamos
    .filter(p => p.usuario_id === Number(usuarioId))
    .sort((a, b) => (a.fecha_prestamo < b.fecha_prestamo ? 1 : -1))
    .map(p => {
      const libro = db.libros.find(l => l.id === p.libro_id) || {};
      return { ...p, titulo: libro.titulo, autor: libro.autor, genero: libro.genero, anio: libro.anio, imagen_url: libro.imagen_url };
    });
}

function getAllPrestamos() {
  const db = _load();
  return db.prestamos
    .sort((a, b) => (a.fecha_prestamo < b.fecha_prestamo ? 1 : -1))
    .map(p => {
      const libro = db.libros.find(l => l.id === p.libro_id) || {};
      const user = db.usuarios.find(u => u.id === p.usuario_id) || {};
      return { ...p, titulo: libro.titulo, nombre: user.nombre, email: user.email };
    });
}

function devolverPrestamo(id, usuarioId, userRol) {
  const db = _load();
  const idx = db.prestamos.findIndex(p => p.id === Number(id));
  if (idx === -1) throw new Error('Préstamo no encontrado');
  const p = db.prestamos[idx];
  if (p.usuario_id !== Number(usuarioId) && userRol !== 'admin') throw new Error('No autorizado');
  if (p.estado !== 'activo') throw new Error('Préstamo ya devuelto');
  db.prestamos[idx].estado = 'devuelto';
  db.prestamos[idx].fecha_devuelto = _now();
  const libroIdx = db.libros.findIndex(l => l.id === p.libro_id);
  if (libroIdx !== -1) {
    db.libros[libroIdx].stock += 1;
    db.libros[libroIdx].disponible = 1;
    db.libros[libroIdx].updated_at = _now();
  }
  _save(db);
  return db.prestamos[idx];
}

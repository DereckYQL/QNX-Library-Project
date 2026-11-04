// Read-only static catalogue. Preserve legacy browser data without trusting roles.
const DB_KEY = 'qnx_db';
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


function _load() {
  const raw = localStorage.getItem(DB_KEY);
  if (raw === null) return null;
  let db;
  try { db = JSON.parse(raw); } catch { throw new Error('Datos locales invalidos. Exportalos antes de restaurar; no se han borrado.'); }
  if (!db || !Array.isArray(db.libros)) throw new Error('Formato local desconocido; se conservan los datos originales.');
  return db;
}
function initDB() {
  const existing = _load();
  if (existing) {
    // Version metadata only. Missing demo users or changed hashes never reset data.
    if (!existing.schemaVersion) {
      existing.schemaVersion = 1;
      localStorage.setItem(DB_KEY, JSON.stringify(existing));
    }
    return;
  }
  localStorage.setItem(DB_KEY, JSON.stringify({ schemaVersion: 1, libros: SEED_LIBROS, usuarios: [], prestamos: [], nextIds: { libros: 25, usuarios: 1, prestamos: 1 } }));
}
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

function getGeneros() {
  const db = _load();
  return [...new Set(db.libros.map(l => l.genero).filter(Boolean))].sort();
}

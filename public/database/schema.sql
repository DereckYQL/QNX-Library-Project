-- QNX Library v2.5 - Schema SQLite (DB Browser for SQLite compatible)
-- Abrir con DB Browser for SQLite: Archivo > Abrir base de datos > biblioteca.db
-- Este archivo es solo referencia; la DB real se genera automaticamente al iniciar el servidor (public/database/biblioteca.db)
-- Si quieres recrear manualmente: abre DB Browser y ejecuta este script.

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

-- Datos de ejemplo: 24 libros (se insertan solo si la tabla esta vacia al iniciar el servidor)
-- Para forzar reinsercion: DELETE FROM Libros; luego reinicia el servidor
INSERT INTO Libros (titulo, autor, genero, anio, disponible, stock, imagen_url) VALUES
('Cien anos de soledad', 'Gabriel Garcia Marquez', 'Realismo magico', 1967, 1, 3, NULL),
('Don Quijote de la Mancha', 'Miguel de Cervantes', 'Clasico', 1605, 1, 2, NULL),
('La sombra del viento', 'Carlos Ruiz Zafon', 'Misterio', 2001, 1, 4, NULL),
('El principito', 'Antoine de Saint-Exupery', 'Ficcion', 1943, 1, 5, NULL),
('1984', 'George Orwell', 'Distopia', 1949, 1, 3, NULL),
('Rayuela', 'Julio Cortazar', 'Novela', 1963, 1, 2, NULL),
('Ficciones', 'Jorge Luis Borges', 'Cuento', 1944, 0, 0, NULL),
('La casa de los espiritus', 'Isabel Allende', 'Realismo magico', 1982, 1, 3, NULL),
('El amor en los tiempos del colera', 'Gabriel Garcia Marquez', 'Romance', 1985, 1, 2, NULL),
('Cronica de una muerte anunciada', 'Gabriel Garcia Marquez', 'Novela', 1981, 1, 4, NULL),
('El tunel', 'Ernesto Sabato', 'Novela psicologica', 1948, 1, 2, NULL),
('Pedro Paramo', 'Juan Rulfo', 'Realismo magico', 1955, 1, 3, NULL),
('Como agua para chocolate', 'Laura Esquivel', 'Romance', 1989, 0, 0, NULL),
('El Aleph', 'Jorge Luis Borges', 'Cuento', 1949, 1, 2, NULL),
('Orgullo y prejuicio', 'Jane Austen', 'Romance', 1813, 1, 3, NULL),
('Moby Dick', 'Herman Melville', 'Aventura', 1851, 1, 2, NULL),
('El senor de los anillos: La Comunidad del Anillo', 'J.R.R. Tolkien', 'Fantasia', 1954, 1, 4, NULL),
('Harry Potter y la piedra filosofal', 'J.K. Rowling', 'Fantasia', 1997, 1, 5, NULL),
('Dune', 'Frank Herbert', 'Ciencia ficcion', 1965, 1, 3, NULL),
('Fahrenheit 451', 'Ray Bradbury', 'Ciencia ficcion', 1953, 1, 3, NULL),
('Crimen y castigo', 'Fiodor Dostoievski', 'Clasico', 1866, 0, 0, NULL),
('El codigo Da Vinci', 'Dan Brown', 'Misterio', 2003, 1, 4, NULL),
('Los juegos del hambre', 'Suzanne Collins', 'Distopia', 2008, 1, 3, NULL),
('El psicoanalista', 'John Katzenbach', 'Thriller', 2002, 1, 2, NULL);

-- Usuarios seed (passwords hasheadas con bcrypt 10; se crean automaticamente al iniciar si no existen)
-- admin@qnx.local / Admin123!  (rol admin, todos los permisos: CRUD libros, gestionar usuarios, ver todos los prestamos)
-- visitante@qnx.local / visitante123 (rol visitante, solo lectura y prestamos propios)
-- Puedes agregar mas usuarios via Registro (rol por defecto visitante, persistido en biblioteca.db) o via /api/auth/register
-- INSERT INTO Usuarios (nombre, email, password, rol) VALUES ('Admin QNX', 'admin@qnx.local', '$2a$10$...hash...', 'admin');
-- INSERT INTO Usuarios (nombre, email, password, rol) VALUES ('Visitante Demo', 'visitante@qnx.local', '$2a$10$...hash...', 'visitante');

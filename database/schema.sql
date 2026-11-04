-- Generated from database/migrations/*.sql. Do not edit; run npm run schema:write.

-- 001_core.sql
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

-- 002_security.sql
ALTER TABLE Usuarios ADD COLUMN auth_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE Usuarios ADD COLUMN deleted_at TEXT DEFAULT NULL;
ALTER TABLE Libros ADD COLUMN deleted_at TEXT DEFAULT NULL;
CREATE TRIGGER IF NOT EXISTS historial_usuario_no_borrar BEFORE DELETE ON Usuarios
      WHEN EXISTS(SELECT 1 FROM Prestamos WHERE usuario_id=OLD.id)
      BEGIN SELECT RAISE(ABORT,'Usuario con historial; usa baja logica'); END;
    CREATE TRIGGER IF NOT EXISTS historial_libro_no_borrar BEFORE DELETE ON Libros
      WHEN EXISTS(SELECT 1 FROM Prestamos WHERE libro_id=OLD.id)
      BEGIN SELECT RAISE(ABORT,'Libro con historial; usa baja logica'); END;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_prestamo_pendiente_unico ON Prestamos(usuario_id,libro_id) WHERE estado IN ('activo','vencido');
    CREATE TRIGGER IF NOT EXISTS stock_no_negativo_insert BEFORE INSERT ON Libros WHEN NEW.stock < 0 BEGIN SELECT RAISE(ABORT,'stock negativo'); END;
    CREATE TRIGGER IF NOT EXISTS stock_no_negativo_update BEFORE UPDATE OF stock ON Libros WHEN NEW.stock < 0 BEGIN SELECT RAISE(ABORT,'stock negativo'); END;

-- 003_inventory.sql
-- Normalize availability, then maintain it from stock for every SQL writer.
UPDATE Libros SET disponible=CASE WHEN stock>0 THEN 1 ELSE 0 END;
CREATE TRIGGER stock_entero_insert BEFORE INSERT ON Libros
  WHEN typeof(NEW.stock) != 'integer' OR NEW.stock < 0
  BEGIN SELECT RAISE(ABORT,'stock negativo o no entero'); END;
CREATE TRIGGER stock_entero_update BEFORE UPDATE OF stock ON Libros
  WHEN typeof(NEW.stock) != 'integer' OR NEW.stock < 0
  BEGIN SELECT RAISE(ABORT,'stock negativo o no entero'); END;
CREATE TRIGGER disponibilidad_insert AFTER INSERT ON Libros
  WHEN NEW.disponible != CASE WHEN NEW.stock>0 THEN 1 ELSE 0 END
  BEGIN UPDATE Libros SET disponible=CASE WHEN stock>0 THEN 1 ELSE 0 END WHERE id=NEW.id; END;
CREATE TRIGGER disponibilidad_update AFTER UPDATE OF stock,disponible ON Libros
  WHEN NEW.disponible != CASE WHEN NEW.stock>0 THEN 1 ELSE 0 END
  BEGIN UPDATE Libros SET disponible=CASE WHEN stock>0 THEN 1 ELSE 0 END WHERE id=NEW.id; END;

-- 004_catalogue.sql
-- Seed only the first empty installation. Never recreate users or reset data.
INSERT INTO Libros(titulo,autor,genero,anio,disponible,stock,imagen_url)
SELECT * FROM (VALUES
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
('El psicoanalista', 'John Katzenbach', 'Thriller', 2002, 1, 2, NULL)) WHERE NOT EXISTS (SELECT 1 FROM Libros);

-- 005_session_epoch.sql
-- A backup restore rotates this epoch so pre-restore tokens cannot be reused.
CREATE TABLE SecurityState(id INTEGER PRIMARY KEY CHECK(id=1), epoch TEXT NOT NULL);
INSERT INTO SecurityState(id,epoch) VALUES(1,lower(hex(randomblob(32))));

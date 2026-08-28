-- QNX Library v2.4 - Schema completo
CREATE DATABASE IF NOT EXISTS biblioteca;
USE biblioteca;

-- Libros: con disponibilidad, stock e imagen
CREATE TABLE IF NOT EXISTS Libros (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  autor VARCHAR(255) NOT NULL,
  genero VARCHAR(100),
  anio INT,
  disponible TINYINT(1) NOT NULL DEFAULT 1,
  stock INT NOT NULL DEFAULT 3,
  imagen_url VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_genero (genero),
  INDEX idx_disponible (disponible)
);

CREATE TABLE IF NOT EXISTS Usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  rol ENUM('user','admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
  INDEX idx_libro (libro_id),
  INDEX idx_estado (estado)
);

-- Limpiar datos previos para re-import limpio
DELETE FROM Prestamos;
DELETE FROM Libros;
ALTER TABLE Libros AUTO_INCREMENT = 1;

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

-- Usuario admin de prueba (password: admin123 - hash bcrypt 10 rounds)
-- Se inserta via API /api/auth/register; este es solo ejemplo si quieres insertar manual:
-- INSERT INTO Usuarios (nombre, email, password, rol) VALUES ('Admin QNX', 'admin@qnx.local', '$2a$10$...hash...', 'admin');

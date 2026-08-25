CREATE DATABASE IF NOT EXISTS biblioteca;
USE biblioteca;

CREATE TABLE IF NOT EXISTS Libros (
  id_lib INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(100) NOT NULL,
  autor VARCHAR(100) NOT NULL,
  genero VARCHAR(100),
  disponible BOOLEAN DEFAULT TRUE
);

INSERT IGNORE INTO Libros (id_lib, titulo, autor, genero) VALUES
(1, 'Cien Anos de Soledad', 'Gabriel Garcia Marquez', 'Novela'),
(2, '1984', 'George Orwell', 'Ciencia Ficcion'),
(3, 'El Principito', 'Antoine de Saint-Exupery', 'Fabula'),
(4, 'Don Quijote de la Mancha', 'Miguel de Cervantes', 'Novela Clasica');

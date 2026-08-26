CREATE DATABASE IF NOT EXISTS biblioteca;
USE biblioteca;

CREATE TABLE IF NOT EXISTS Libros (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  autor VARCHAR(255) NOT NULL,
  genero VARCHAR(100),
  anio INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO Libros (titulo, autor, genero, anio) VALUES
('Cien anos de soledad', 'Gabriel Garcia Marquez', 'Realismo magico', 1967),
('Don Quijote de la Mancha', 'Miguel de Cervantes', 'Clasico', 1605),
('La sombra del viento', 'Carlos Ruiz Zafon', 'Misterio', 2001),
('El principito', 'Antoine de Saint-Exupery', 'Ficcion', 1943),


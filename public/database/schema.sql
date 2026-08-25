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
('1984', 'George Orwell', 'Distopia', 1949),
('Rayuela', 'Julio Cortazar', 'Vanguardia', 1963),
('Crimen y castigo', 'Fiodor Dostoievski', 'Drama psicologico', 1866),
('El nombre del viento', 'Patrick Rothfuss', 'Fantasia', 2007),
('Fahrenheit 451', 'Ray Bradbury', 'Ciencia ficcion', 1953),
('La casa de los espiritus', 'Isabel Allende', 'Realismo magico', 1982),
('Orgullo y prejuicio', 'Jane Austen', 'Romance', 1813),
('El senor de los anillos', 'J.R.R. Tolkien', 'Fantasia', 1954),
('Matar a un ruisenor', 'Harper Lee', 'Drama', 1960),
('Los detectives salvajes', 'Roberto Bolano', 'Novela', 1998),
('Ficciones', 'Jorge Luis Borges', 'Cuento', 1944);
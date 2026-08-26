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
('Rayuela', 'Julio Cortazar', 'Novela', 1963),
('Ficciones', 'Jorge Luis Borges', 'Cuento', 1944),
('La casa de los espiritus', 'Isabel Allende', 'Realismo magico', 1982),
('El amor en los tiempos del colera', 'Gabriel Garcia Marquez', 'Romance', 1985),
('Cronica de una muerte anunciada', 'Gabriel Garcia Marquez', 'Novela', 1981),
('El tunel', 'Ernesto Sabato', 'Novela psicologica', 1948),
('Pedro Paramo', 'Juan Rulfo', 'Realismo magico', 1955),
('Como agua para chocolate', 'Laura Esquivel', 'Romance', 1989),
('El Aleph', 'Jorge Luis Borges', 'Cuento', 1949),
('Orgullo y prejuicio', 'Jane Austen', 'Romance', 1813),
('Moby Dick', 'Herman Melville', 'Aventura', 1851),
('El senor de los anillos: La Comunidad del Anillo', 'J.R.R. Tolkien', 'Fantasia', 1954),
('Harry Potter y la piedra filosofal', 'J.K. Rowling', 'Fantasia', 1997),
('Dune', 'Frank Herbert', 'Ciencia ficcion', 1965),
('Fahrenheit 451', 'Ray Bradbury', 'Ciencia ficcion', 1953),
('Crimen y castigo', 'Fiodor Dostoievski', 'Clasico', 1866),
('El codigo Da Vinci', 'Dan Brown', 'Misterio', 2003),
('Los juegos del hambre', 'Suzanne Collins', 'Distopia', 2008),
('El psicoanalista', 'John Katzenbach', 'Thriller', 2002);
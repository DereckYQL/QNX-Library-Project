const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Fallback en memoria si MySQL no esta disponible (24 libros v2.3)
const fallbackLibros = [
  { id: 1, titulo: 'Cien anos de soledad', autor: 'Gabriel Garcia Marquez', genero: 'Realismo magico', anio: 1967 },
  { id: 2, titulo: 'Don Quijote de la Mancha', autor: 'Miguel de Cervantes', genero: 'Clasico', anio: 1605 },
  { id: 3, titulo: 'La sombra del viento', autor: 'Carlos Ruiz Zafon', genero: 'Misterio', anio: 2001 },
  { id: 4, titulo: 'El principito', autor: 'Antoine de Saint-Exupery', genero: 'Ficcion', anio: 1943 },
  { id: 5, titulo: '1984', autor: 'George Orwell', genero: 'Distopia', anio: 1949 },
  { id: 6, titulo: 'Rayuela', autor: 'Julio Cortazar', genero: 'Novela', anio: 1963 },
  { id: 7, titulo: 'Ficciones', autor: 'Jorge Luis Borges', genero: 'Cuento', anio: 1944 },
  { id: 8, titulo: 'La casa de los espiritus', autor: 'Isabel Allende', genero: 'Realismo magico', anio: 1982 },
  { id: 9, titulo: 'El amor en los tiempos del colera', autor: 'Gabriel Garcia Marquez', genero: 'Romance', anio: 1985 },
  { id: 10, titulo: 'Cronica de una muerte anunciada', autor: 'Gabriel Garcia Marquez', genero: 'Novela', anio: 1981 },
  { id: 11, titulo: 'El tunel', autor: 'Ernesto Sabato', genero: 'Novela psicologica', anio: 1948 },
  { id: 12, titulo: 'Pedro Paramo', autor: 'Juan Rulfo', genero: 'Realismo magico', anio: 1955 },
  { id: 13, titulo: 'Como agua para chocolate', autor: 'Laura Esquivel', genero: 'Romance', anio: 1989 },
  { id: 14, titulo: 'El Aleph', autor: 'Jorge Luis Borges', genero: 'Cuento', anio: 1949 },
  { id: 15, titulo: 'Orgullo y prejuicio', autor: 'Jane Austen', genero: 'Romance', anio: 1813 },
  { id: 16, titulo: 'Moby Dick', autor: 'Herman Melville', genero: 'Aventura', anio: 1851 },
  { id: 17, titulo: 'El senor de los anillos: La Comunidad del Anillo', autor: 'J.R.R. Tolkien', genero: 'Fantasia', anio: 1954 },
  { id: 18, titulo: 'Harry Potter y la piedra filosofal', autor: 'J.K. Rowling', genero: 'Fantasia', anio: 1997 },
  { id: 19, titulo: 'Dune', autor: 'Frank Herbert', genero: 'Ciencia ficcion', anio: 1965 },
  { id: 20, titulo: 'Fahrenheit 451', autor: 'Ray Bradbury', genero: 'Ciencia ficcion', anio: 1953 },
  { id: 21, titulo: 'Crimen y castigo', autor: 'Fiodor Dostoievski', genero: 'Clasico', anio: 1866 },
  { id: 22, titulo: 'El codigo Da Vinci', autor: 'Dan Brown', genero: 'Misterio', anio: 2003 },
  { id: 23, titulo: 'Los juegos del hambre', autor: 'Suzanne Collins', genero: 'Distopia', anio: 2008 },
  { id: 24, titulo: 'El psicoanalista', autor: 'John Katzenbach', genero: 'Thriller', anio: 2002 }
];

let dbConnected = false;
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'biblioteca',
  port: process.env.DB_PORT || 3306
});

db.connect(err => {
  if (err) {
    console.error('Error de conexion MySQL (usando fallback en memoria):', err.message);
    console.log('Tip: verifica .env y que MySQL este corriendo (MySQL97 en 3306). La API usara datos en memoria.');
    return;
  }
  dbConnected = true;
  console.log('Conectado a MySQL');
});

app.get('/api/libros', (req, res) => {
  if (!dbConnected) return res.json(fallbackLibros);
  db.query('SELECT * FROM Libros', (err, results) => {
    if (err) {
      console.error('DB error, fallback:', err.message);
      return res.json(fallbackLibros);
    }
    if (!results || results.length === 0) return res.json(fallbackLibros);
    res.json(results);
  });
});

app.get('/api/libros/:id', (req, res) => {
  if (!dbConnected) {
    const libro = fallbackLibros.find(l => l.id == req.params.id);
    if (!libro) return res.status(404).json({ error: 'Libro no encontrado' });
    return res.json(libro);
  }
  db.query('SELECT * FROM Libros WHERE id = ?', [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Libro no encontrado' });
    res.json(results[0]);
  });
});

app.post('/api/libros', (req, res) => {
  const { titulo, autor, genero, anio } = req.body;
  if (!dbConnected) return res.status(503).json({ error: 'DB no disponible en modo fallback' });
  db.query('INSERT INTO Libros (titulo, autor, genero, anio) VALUES (?, ?, ?, ?)',
    [titulo, autor, genero, anio], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: result.insertId, mensaje: 'Libro registrado' });
    });
});

app.put('/api/libros/:id', (req, res) => {
  const { titulo, autor, genero, anio } = req.body;
  if (!dbConnected) return res.status(503).json({ error: 'DB no disponible' });
  db.query('UPDATE Libros SET titulo=?, autor=?, genero=?, anio=? WHERE id=?',
    [titulo, autor, genero, anio, req.params.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ mensaje: 'Libro actualizado' });
    });
});

app.delete('/api/libros/:id', (req, res) => {
  if (!dbConnected) return res.status(503).json({ error: 'DB no disponible' });
  db.query('DELETE FROM Libros WHERE id=?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ mensaje: 'Libro eliminado' });
  });
});

// health
app.get('/api/health', (req, res) => res.json({ status: 'ok', db: dbConnected ? 'mysql' : 'fallback', count: fallbackLibros.length }));

const PORT = process.env.SERVER_PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));

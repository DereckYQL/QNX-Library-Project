const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'biblioteca',
  port: process.env.DB_PORT || 3306
});

db.connect(err => {
  if (err) { console.error('Error de conexion:', err); return; }
  console.log('Conectado a MySQL');
});

app.get('/api/libros', (req, res) => {
  db.query('SELECT * FROM Libros', (err, results) => {
    if (err) { res.status(500).json({ error: err.message }); return; }
    res.json(results);
  });
});

app.get('/api/libros/:id', (req, res) => {
  db.query('SELECT * FROM Libros WHERE id = ?', [req.params.id], (err, results) => {
    if (err) { res.status(500).json({ error: err.message }); return; }
    if (results.length === 0) { res.status(404).json({ error: 'Libro no encontrado' }); return; }
    res.json(results[0]);
  });
});

app.post('/api/libros', (req, res) => {
  const { titulo, autor, genero, anio } = req.body;
  db.query('INSERT INTO Libros (titulo, autor, genero, anio) VALUES (?, ?, ?, ?)',
    [titulo, autor, genero, anio], (err, result) => {
      if (err) { res.status(500).json({ error: err.message }); return; }
      res.json({ id: result.insertId, mensaje: 'Libro registrado' });
    });
});

app.put('/api/libros/:id', (req, res) => {
  const { titulo, autor, genero, anio } = req.body;
  db.query('UPDATE Libros SET titulo=?, autor=?, genero=?, anio=? WHERE id=?',
    [titulo, autor, genero, anio, req.params.id], (err) => {
      if (err) { res.status(500).json({ error: err.message }); return; }
      res.json({ mensaje: 'Libro actualizado' });
    });
});

app.delete('/api/libros/:id', (req, res) => {
  db.query('DELETE FROM Libros WHERE id=?', [req.params.id], (err) => {
    if (err) { res.status(500).json({ error: err.message }); return; }
    res.json({ mensaje: 'Libro eliminado' });
  });
});

const PORT = process.env.SERVER_PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
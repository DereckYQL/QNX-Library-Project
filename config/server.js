require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

app.get('/api/libros', async (req, res) => {
  try {
    const [libros] = await pool.query('SELECT * FROM Libros');
    res.json(libros);
  } catch (error) {
    console.error('Error al obtener libros:', error);
    res.status(500).json({ mensaje: 'Error al obtener los libros' });
  }
});

app.post('/api/libros', async (req, res) => {
  try {
    const { titulo, autor, genero } = req.body;
    await pool.query(
      'INSERT INTO Libros (titulo, autor, genero) VALUES (?, ?, ?)',
      [titulo, autor, genero]
    );
    res.json({ mensaje: 'Libro agregado con exito' });
  } catch (error) {
    console.error('Error al agregar libro:', error);
    res.status(500).json({ mensaje: 'Error al agregar el libro' });
  }
});

app.put('/api/libros/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, autor, genero, disponible } = req.body;
    const [resultado] = await pool.query(
      'UPDATE Libros SET titulo=?, autor=?, genero=?, disponible=? WHERE id_lib=?',
      [titulo, autor, genero, disponible, id]
    );
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Libro no encontrado' });
    }
    res.json({ mensaje: 'Libro actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar libro:', error);
    res.status(500).json({ mensaje: 'Error al actualizar el libro' });
  }
});

app.delete('/api/libros/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [resultado] = await pool.query(
      'DELETE FROM Libros WHERE id_lib=?',
      [id]
    );
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Libro no encontrado' });
    }
    res.json({ mensaje: 'Libro eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar libro:', error);
    res.status(500).json({ mensaje: 'Error al eliminar el libro' });
  }
});

const PORT = process.env.SERVER_PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

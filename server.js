require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'biblioteca',
    port: process.env.DB_PORT || 3306
});

app.get('/api/libros', async (req, res) => {
    try {
        const [libros] = await pool.query('SELECT * FROM Libros');
        res.json(libros);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/libros/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Libros WHERE id_lib = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Libro no encontrado' });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/libros', async (req, res) => {
    try {
        const { titulo, autor, genero, disponible } = req.body;
        if (!titulo || !autor) return res.status(400).json({ error: 'titulo y autor son obligatorios' });
        const [result] = await pool.query(
            'INSERT INTO Libros (titulo, autor, genero, disponible) VALUES (?, ?, ?, ?)',
            [titulo, autor, genero || null, disponible !== false]
        );
        res.status(201).json({ id: result.insertId, mensaje: 'Libro registrado correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/libros/:id', async (req, res) => {
    try {
        const { titulo, autor, genero, disponible } = req.body;
        const [result] = await pool.query(
            'UPDATE Libros SET titulo=?, autor=?, genero=?, disponible=? WHERE id_lib=?',
            [titulo, autor, genero, disponible, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Libro no encontrado' });
        res.json({ mensaje: 'Libro actualizado correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/libros/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM Libros WHERE id_lib=?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Libro no encontrado' });
        res.json({ mensaje: 'Libro eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.SERVER_PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

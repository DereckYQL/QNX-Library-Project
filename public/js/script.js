const API = '/api/libros';

async function cargarLibros() {
  try {
    const res = await fetch(API);
    const libros = await res.json();
    const tbody = document.querySelector('#tablaLibros tbody');
    if (tbody) {
      tbody.innerHTML = libros.map(l =>
        `<tr><td>${l.id}</td><td>${l.titulo}</td><td>${l.autor}</td><td>${l.genero}</td><td>${l.anio}</td></tr>`
      ).join('');
    }
    const destacados = document.getElementById('destacados');
    if (destacados) {
      destacados.innerHTML = libros.map(l =>
        `<div class="card"><h3>${l.titulo}</h3><p>Autor: ${l.autor}</p><p>Genero: ${l.genero} (${l.anio})</p></div>`
      ).join('');
    }
  } catch (err) { console.error('Error:', err); }
}

document.addEventListener('DOMContentLoaded', cargarLibros);
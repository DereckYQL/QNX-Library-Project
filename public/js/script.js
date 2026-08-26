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
      if (libros.length === 0) throw new Error('sin datos');
      destacados.innerHTML = libros.map((l,i) => `
        <div class="book">
          <div class="book-top ${i%2===1?'gold':''}">${l.titulo}</div>
          <div class="book-body">
            <h3>${l.titulo}</h3>
            <p>${l.autor} · ${l.anio}</p>
            <span class="tag">${l.genero}</span>
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error(err);
    const d = document.getElementById('destacados');
    if (d && !d.innerHTML) {
      d.innerHTML = `
        <div class="book"><div class="book-top">Cien años de soledad</div><div class="book-body"><h3>Cien años de soledad</h3><p>García Márquez · 1967</p><span class="tag">Realismo mágico</span></div></div>
        <div class="book"><div class="book-top gold">Don Quijote</div><div class="book-body"><h3>Don Quijote</h3><p>Cervantes · 1605</p><span class="tag">Clásico</span></div></div>
        <div class="book"><div class="book-top">El principito</div><div class="book-body"><h3>El principito</h3><p>Saint-Exupéry · 1943</p><span class="tag">Ficción</span></div></div>`;
    }
  }
}
document.addEventListener('DOMContentLoaded', cargarLibros);

// filtro catálogo
document.addEventListener('input', e=>{
  if(e.target.id==='filtroCatalogo'){
    const q=e.target.value.toLowerCase();
    document.querySelectorAll('#tablaLibros tbody tr').forEach(tr=>{
      tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  }
});

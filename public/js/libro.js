// libro.js — static version (localStorage)
document.addEventListener('DOMContentLoaded', () => {
  if (typeof updateNav === 'function') updateNav();
  if (typeof initDB === 'function') initDB();
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const box = document.getElementById('detalleBox');
  if (!id) { box.innerHTML = '<p class="alert error show">ID no especificado</p>'; return; }
  box.innerHTML = '<p class="loading"><span class="spinner"></span> Cargando...</p>';
  try {
    const l = getLibro(id);
    if (!l) throw new Error('Libro no encontrado');
    document.title = l.titulo + ' - QNX Library';
    box.innerHTML = `
      <div class="detail-grid">
        <div class="detail-cover">${l.imagen_url ? `<img src="${l.imagen_url}" alt="${l.titulo}">` : l.titulo}</div>
        <div class="detail-info">
          <h1>${l.titulo}</h1>
          <p class="detail-meta">${l.autor} · ${l.anio || ''} · <span class="pill ${l.disponible ? 'pill-ok' : 'pill-no'}">${l.disponible ? 'Disponible (' + l.stock + ')' : 'Agotado'}</span></p>
          <p><span class="tag">${l.genero || 'General'}</span></p>
          <div style="margin-top:1rem;display:flex;gap:0.6rem;flex-wrap:wrap">
            <button class="btn-sm primary" id="btnPrestar" ${!l.disponible ? 'disabled' : ''}>Prestar libro</button>
            <a href="catalogo.html" class="btn-sm">← Volver al catálogo</a>
          </div>
          <div class="detail-desc">
            <h3 style="font-family:'Merriweather',serif;color:var(--navy);margin-bottom:0.4rem">Sobre este libro</h3>
            <p style="color:var(--muted);font-size:0.9rem">Obra de <strong>${l.autor}</strong> publicada en <strong>${l.anio || '—'}</strong> dentro del género <strong>${l.genero || 'General'}</strong>. ${l.disponible ? 'Actualmente disponible para préstamo.' : 'Temporalmente sin stock.'}</p>
            <p style="margin-top:0.6rem;font-size:0.85rem;color:var(--muted)">ID: ${l.id} · Stock: ${l.stock} · Estado: ${l.disponible ? 'Disponible' : 'No disponible'}</p>
          </div>
        </div>
      </div>
    `;
    document.getElementById('btnPrestar')?.addEventListener('click', () => {
      const user = getUser();
      if (!user) { toast('Inicia sesión para prestar', 'error'); location.href = 'login.html'; return; }
      try {
        const p = createPrestamo(user.id, l.id);
        toast('Préstamo ok, devolver antes de ' + p.fecha_devolucion, 'success');
        // reload to show updated stock
        location.reload();
      } catch (e) { toast(e.message, 'error'); }
    });
  } catch (err) {
    box.innerHTML = `<p class="alert error show">${err.message}</p><a href="catalogo.html" class="btn-sm">Volver</a>`;
  }
});

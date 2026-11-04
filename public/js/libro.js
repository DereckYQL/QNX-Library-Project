document.addEventListener('DOMContentLoaded', async () => {
  const box = document.getElementById('detalleBox');
  try {
    await QNX.ready; updateNav();
    const id = new URLSearchParams(location.search).get('id');
    if (!id) throw new Error('ID no especificado');
    box.textContent = 'Cargando...';
    const book = await QNX.book(id);
    if (!book) throw new Error('Libro no encontrado');
    document.title = book.titulo + ' - QNX Library';
    const button = actionButton('Prestar libro', async () => {
      if (!getUser()) { location.href = 'login.html'; return; }
      button.disabled = true;
      try { const loan = await QNX.borrow(book.id); toast('Prestamo registrado. Devolucion: ' + loan.fecha_devolucion, 'success'); location.reload(); }
      catch (error) { toast(error.message, 'error'); button.disabled = false; }
    }, { id: 'btnPrestar', className: 'btn-sm primary', disabled: !book.disponible || QNX.mode !== 'server' });
    const info = element('div', { className: 'detail-info' },
      element('h1', {}, book.titulo || ''),
      element('p', { className: 'detail-meta' }, `${book.autor || ''} · ${book.anio || ''} · `,
        element('span', { className: 'pill ' + (book.disponible ? 'pill-ok' : 'pill-no') }, book.disponible ? `Disponible (${book.stock})` : 'Agotado')),
      element('p', {}, element('span', { className: 'tag' }, book.genero || 'General')),
      element('div', { className: 'book-actions' }, button, element('a', { href: 'catalogo.html', className: 'btn-sm' }, '← Volver al catalogo')),
      element('div', { className: 'detail-desc' }, element('h3', {}, 'Sobre este libro'),
        element('p', {}, `Obra de ${book.autor || ''}, publicada en ${book.anio || '—'}, del genero ${book.genero || 'General'}.`),
        element('p', {}, `ID: ${book.id} · Stock: ${book.stock}`)));
    box.replaceChildren(element('div', { className: 'detail-grid' }, cover(book, 'detail-cover'), info));
  } catch (error) {
    box.replaceChildren(element('p', { className: 'alert error show' }, error.message), element('a', { href: 'catalogo.html', className: 'btn-sm' }, 'Volver'));
  }
});

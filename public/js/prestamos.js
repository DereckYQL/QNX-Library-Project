document.addEventListener('DOMContentLoaded', async () => {
  try {
    await QNX.ready; updateNav();
    if (!getUser()) {
      document.getElementById('prestamosBox').replaceChildren(element('p', { className: 'alert error show' }, 'Debes ', element('a', { href: 'login.html' }, 'iniciar sesion'), ' para ver tus prestamos.'));
      return;
    }
    await cargar();
  } catch (error) { toast(error.message, 'error'); }
});
async function cargar() {
  const box = document.getElementById('prestamosBox');
  box.textContent = 'Cargando prestamos...';
  try {
    const data = await QNX.loans();
    if (!data.length) {
      box.replaceChildren(element('p', { className: 'alert info show' }, 'Aun no tienes prestamos. ', element('a', { href: 'catalogo.html' }, 'Explora el catalogo')));
      return;
    }
    const tbody = element('tbody');
    for (const loan of data) {
      const pending = ['activo', 'vencido'].includes(loan.estado);
      tbody.appendChild(element('tr', {},
        element('td', {}, loan.libro_archivado ? element('span', {}, loan.titulo || '', ' (archivado)') : element('a', { href: bookHref(loan.libro_id) }, loan.titulo || '')),
        element('td', {}, loan.autor || ''), element('td', {}, utcDate(loan.fecha_prestamo)),
        element('td', {}, calendarDate(loan.fecha_devolucion)),
        element('td', {}, element('span', { className: 'pill ' + (loan.estado === 'activo' ? 'pill-ok' : 'pill-no') }, loan.estado)),
        element('td', {}, pending ? actionButton('Devolver', () => devolver(loan.id), { className: 'btn-sm primary' }) : (loan.fecha_devuelto ? utcDate(loan.fecha_devuelto) : ''))));
    }
    box.replaceChildren(element('div', { className: 'table-wrap' }, element('table', {},
      element('thead', {}, element('tr', {}, ...['Libro','Autor','Prestamo','Devolucion prevista','Estado','Accion'].map(label => element('th', {}, label)))), tbody)));
  } catch (error) { box.replaceChildren(element('p', { className: 'alert error show' }, error.message)); }
}
async function devolver(id) {
  if (!confirm('¿Confirmar devolucion?')) return;
  try { await QNX.returnLoan(id); toast('Libro devuelto', 'success'); await cargar(); }
  catch (error) { toast(error.message, 'error'); }
}

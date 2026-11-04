// catalogo.js — QNX Library API / read-only static catalogue
let estado = { page: 1, limit: 8, search: '', genero: '', disponible: '', sort: 'id', order: 'asc', total: 0, totalPages: 1 };
let librosCache = [];

function getUserRole() { return getUser()?.rol || null; }
function isAdmin() { return QNX.mode === 'server' && getUserRole() === 'admin'; }

document.addEventListener('DOMContentLoaded', async () => {
  try { await QNX.ready; } catch (error) { toast(error.message, 'error'); return; }
  updateNav();

  const formSection = document.getElementById('formLibro')?.closest('section');
  if (formSection) {
    formSection.style.display = isAdmin() ? '' : 'none';
  }

  const urlParams = new URLSearchParams(location.search);
  if (urlParams.get('q')) estado.search = urlParams.get('q');

  const els = {
    tbody: document.querySelector('#tablaLibros tbody'),
    search: document.getElementById('filtroCatalogo'),
    genero: document.getElementById('filtroGenero'),
    disp: document.getElementById('filtroDisp'),
    limit: document.getElementById('limitSelect'),
    pagination: document.getElementById('paginacion'),
    info: document.getElementById('pageInfo'),
    count: document.getElementById('countInfo'),
    loading: document.getElementById('loadingBox'),
    form: document.getElementById('formLibro'),
    modal: document.getElementById('modalConfirm'),
    grid: document.getElementById('gridLibros'),
  };

  if (els.search) els.search.value = estado.search;
  if (els.limit) els.limit.value = String(estado.limit);

  cargarGeneros();
  cargar();

  let debounce;
  if (els.search) els.search.addEventListener('input', e => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { estado.search = e.target.value.trim(); estado.page = 1; cargar(); }, 350);
  });
  if (els.genero) els.genero.addEventListener('change', e => { estado.genero = e.target.value; estado.page = 1; cargar(); });
  if (els.disp) els.disp.addEventListener('change', e => { estado.disponible = e.target.value; estado.page = 1; cargar(); });
  if (els.limit) els.limit.addEventListener('change', e => { estado.limit = parseInt(e.target.value, 10); estado.page = 1; cargar(); });

  const btnLimpiar = document.getElementById('btnLimpiar');
  if (btnLimpiar) btnLimpiar.addEventListener('click', () => {
    estado.search = ''; estado.genero = ''; estado.disponible = ''; estado.page = 1;
    if (els.search) els.search.value = '';
    if (els.genero) els.genero.value = '';
    if (els.disp) els.disp.value = '';
    cargar();
  });

  document.querySelectorAll('#tablaLibros th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.sort;
      if (estado.sort === col) estado.order = estado.order === 'asc' ? 'desc' : 'asc';
      else { estado.sort = col; estado.order = 'asc'; }
      document.querySelectorAll('#tablaLibros th .sort').forEach(s => s.textContent = '↕');
      const icon = th.querySelector('.sort');
      if (icon) icon.textContent = estado.order === 'asc' ? '▲' : '▼';
      cargar();
    });
  });

  if (els.form) {
    if (!isAdmin()) {
      els.form.querySelector('button[type="submit"]').disabled = true;
      els.form.querySelector('button[type="submit"]').title = 'Solo admin puede agregar/editar';
    }
    els.form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!isAdmin()) return toast('Solo admin puede gestionar libros', 'error');
      const id = document.getElementById('libroId').value;
      const data = {
        titulo: document.getElementById('fTitulo').value.trim(),
        autor: document.getElementById('fAutor').value.trim(),
        genero: document.getElementById('fGenero').value.trim() || null,
        anio: document.getElementById('fAnio').value.trim() || null,
        stock: document.getElementById('fStock').value.trim(),
        imagen_url: document.getElementById('fImagen').value.trim() || null
      };
      if (!data.titulo || !data.autor) return toast('Título y autor requeridos', 'error');
      if (!getToken()) return toast('Debes iniciar sesión para gestionar libros', 'error');
      const btn = els.form.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        const fileInput = document.getElementById('fPortada');
        if (fileInput?.files[0]) data.imagen_url = (await QNX.upload(fileInput.files[0])).url;
        await QNX.saveBook(id, data);
        toast(id ? 'Libro actualizado' : 'Libro creado', 'success');
        els.form.reset();
        document.getElementById('libroId').value = '';
        document.getElementById('formTitle').textContent = 'Agregar libro';
        await cargarGeneros();
        await cargar();
      } catch (err) { toast(err.message, 'error'); }
      finally { btn.disabled = false; }
    });
    document.getElementById('btnCancelarEdit')?.addEventListener('click', () => {
      els.form.reset();
      document.getElementById('libroId').value = '';
      document.getElementById('formTitle').textContent = 'Agregar libro';
    });
  }
});

async function cargarGeneros() {
  try {
    const gens = await QNX.genres();
    if (estado.genero && !gens.includes(estado.genero)) { estado.genero = ''; estado.page = 1; }
    const sel = document.getElementById('filtroGenero');
    const fSel = document.getElementById('fGeneroList');
    if (sel && Array.isArray(gens)) {
      sel.querySelectorAll('option:not(:first-child)').forEach(option => option.remove());
      gens.forEach(g => {
        const o = document.createElement('option'); o.value = g; o.textContent = g; sel.appendChild(o);
      });
    }
    if (sel) sel.value = estado.genero;
    if (fSel && Array.isArray(gens)) {
      fSel.replaceChildren();
      gens.forEach(g => {
        const o = document.createElement('option'); o.value = g; o.textContent = g; fSel.appendChild(o);
      });
    }
  } catch (error) { toast('No se pudieron actualizar los generos', 'error'); }
}

let loadVersion = 0;
async function cargar() {
  const version = ++loadVersion;
  const loading = document.getElementById('loadingBox');
  const tbody = document.querySelector('#tablaLibros tbody');
  if (loading) loading.style.display = 'flex';
  try {
    const json = await QNX.books({
      search: estado.search,
      genero: estado.genero,
      disponible: estado.disponible,
      page: estado.page,
      limit: estado.limit,
      sort: estado.sort,
      order: estado.order
    });
    if (version !== loadVersion) return;
    if (estado.page > json.totalPages) { estado.page = json.totalPages; return cargar(); }
    const data = json.data || [];
    const total = json.total || 0;
    estado.total = total;
    estado.totalPages = json.totalPages || 1;
    librosCache = data;
    renderTabla(data);
    renderGrid(data);
    renderPaginacion(total);
    document.getElementById('countInfo').textContent = `${total} libro(s)`;
  } catch (err) {
    console.error(err);
    if (tbody) tbody.replaceChildren(element('tr', {}, element('td', { colspan: 7 }, 'Error cargando')));
    toast('Error al cargar libros', 'error');
  } finally { if (loading && version === loadVersion) loading.style.display = 'none'; }
}

function renderTabla(libros) {
  const tbody = document.querySelector('#tablaLibros tbody');
  if (!tbody) return;
  if (!libros.length) { tbody.replaceChildren(element('tr', {}, element('td', { colspan: 7 }, 'Sin resultados'))); return; }
  tbody.replaceChildren(...libros.map(book => {
    const actions = element('td', { className: 'actions' },
      actionButton('Prestar', () => prestar(book.id), { disabled: !book.disponible || QNX.mode !== 'server', 'data-action': 'borrow' }));
    if (isAdmin()) actions.append(
      actionButton('Editar', () => editar(book.id), { 'data-action': 'edit' }),
      actionButton('Archivar', () => confirmDelete(book.id), { className: 'btn-sm danger', 'data-action': 'archive' }));
    return element('tr', {}, element('td', {}, book.id),
      element('td', {}, element('a', { href: bookHref(book.id) }, book.titulo || '')),
      element('td', {}, book.autor || ''), element('td', {}, book.genero || ''), element('td', {}, book.anio || ''),
      element('td', {}, element('span', { className: 'pill ' + (book.disponible ? 'pill-ok' : 'pill-no') }, book.disponible ? `Disponible (${book.stock ?? 0})` : 'Agotado')), actions);
  }));
}
function renderGrid(libros) {
  const grid = document.getElementById('gridLibros');
  if (!grid) return;
  grid.replaceChildren(...(libros.length ? libros.map((book, index) => bookCard(book, index, '', prestar)) : [element('p', {}, 'Sin libros')]));
}

function renderPaginacion(total) {
  const pag = document.getElementById('paginacion');
  const info = document.getElementById('pageInfo');
  if (!pag) return;
  pag.replaceChildren();
  const totalPages = estado.totalPages;
  if (info) info.textContent = `Página ${estado.page} de ${totalPages} — ${total} total`;
  const mkBtn = (label, page, disabled = false, active = false) => {
    const b = document.createElement('button');
    b.className = 'page-btn' + (active ? ' active' : '');
    b.textContent = label; b.disabled = disabled;
    b.addEventListener('click', () => { estado.page = page; cargar(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    return b;
  };
  pag.appendChild(mkBtn('‹', Math.max(1, estado.page - 1), estado.page === 1));
  for (let p = 1; p <= totalPages; p++) {
    if (totalPages > 7 && Math.abs(p - estado.page) > 2 && p !== 1 && p !== totalPages) {
      if (p === 2 || p === totalPages - 1) { const s = document.createElement('span'); s.textContent = '…'; s.style.padding = '0 0.3rem'; pag.appendChild(s); }
      continue;
    }
    pag.appendChild(mkBtn(String(p), p, false, p === estado.page));
  }
  pag.appendChild(mkBtn('›', Math.min(totalPages, estado.page + 1), estado.page === totalPages));
}

async function prestar(id) {
  const user = getUser();
  if (QNX.mode !== 'server') return toast('Los prestamos requieren el servidor', 'info');
  if (!user) { toast('Inicia sesión para prestar', 'error'); location.href = 'login.html'; return; }
  try {
    const p = await QNX.borrow(id);
    toast('¡Préstamo registrado! Devolución: ' + p.fecha_devolucion, 'success');
    cargar();
  } catch (err) { toast(err.message, 'error'); }
}

function editar(id) {
  if (!isAdmin()) return toast('Solo admin puede editar', 'error');
  const l = librosCache.find(x => x.id === id);
  if (!l) return;
  document.getElementById('libroId').value = l.id;
  document.getElementById('fTitulo').value = l.titulo;
  document.getElementById('fAutor').value = l.autor;
  document.getElementById('fGenero').value = l.genero || '';
  document.getElementById('fAnio').value = l.anio || '';
  document.getElementById('fStock').value = l.stock ?? 3;
  document.getElementById('fImagen').value = l.imagen_url || '';
  document.getElementById('formTitle').textContent = 'Editar libro #' + l.id;
  document.getElementById('formLibro').scrollIntoView({ behavior: 'smooth' });
}

let deleteId = null;
function confirmDelete(id) {
  if (!isAdmin()) return toast('Solo admin puede eliminar', 'error');
  deleteId = id;
  document.getElementById('modalConfirm').classList.add('show');
  document.getElementById('modalBackdrop').classList.add('show');
  document.getElementById('modalMsg').textContent = '¿Archivar libro #' + id + '? Se conservara su historial.';
}
function closeModal() { document.getElementById('modalBackdrop').classList.remove('show'); document.getElementById('modalConfirm').classList.remove('show'); deleteId = null; }
document.getElementById('modalCancel')?.addEventListener('click', closeModal);
document.getElementById('modalBackdrop')?.addEventListener('click', (e) => { if (e.target.id === 'modalBackdrop') closeModal(); });
document.getElementById('modalConfirmBtn')?.addEventListener('click', async () => {
  if (deleteId == null) return;
  if (!getToken()) return toast('No autorizado', 'error');
  try {
    await QNX.deleteBook(deleteId);
    toast('Libro archivado', 'success');
    closeModal();
    await cargarGeneros();
    await cargar();
  } catch (err) { toast(err.message, 'error'); }
});

// script.js — QNX Library API / read-only static catalogue

// Toast
function toast(msg, type = 'info', ms = 3200) {
  let box = document.getElementById('toastBox');
  if (!box) { box = document.createElement('div'); box.id = 'toastBox'; document.body.appendChild(box); }
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(20px)'; setTimeout(() => el.remove(), 300); }, ms);
}

// Auth helpers
function getToken() { return QNX.token(); }
function getUser() { return QNX.getUser(); }
function isLogged() { return !!getUser(); }
function logout() {
  QNX.logout(); updateNav();
  location.href = location.pathname.includes('/pages/') ? '../index.html' : 'index.html';
}
// All user data becomes text nodes or individual, validated DOM properties.
function element(tag, attributes = {}, ...children) {
  const result = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'className') result.className = value;
    else if (key === 'disabled') result.disabled = !!value;
    else result.setAttribute(key, String(value));
  }
  for (const child of children.flat()) {
    if (child !== null && child !== undefined) result.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return result;
}
function actionButton(label, action, options = {}) {
  const button = element('button', { type: 'button', className: 'btn-sm', ...options }, label);
  button.addEventListener('click', action);
  return button;
}
function safeImage(value) {
  if (!value) return '';
  try { const url = new URL(value, location.href); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
}
function bookHref(id, prefix = '') { return prefix + 'libro.html?id=' + encodeURIComponent(String(id)); }
function cover(book, className) {
  const box = element('div', { className });
  const url = safeImage(book.imagen_url);
  box.appendChild(url ? element('img', { src: url, alt: book.titulo || '', loading: 'lazy', referrerpolicy: 'no-referrer' }) : document.createTextNode(String(book.titulo || '')));
  return box;
}
function bookCard(book, index, prefix = '', borrow = null) {
  const top = cover(book, 'book-top' + (index % 2 ? ' gold' : ''));
  top.appendChild(element('span', { className: 'badge-disponible ' + (book.disponible ? 'badge-ok' : 'badge-no') }, book.disponible ? 'Disponible' : 'Agotado'));
  const body = element('div', { className: 'book-body' },
    element('h3', {}, element('a', { href: bookHref(book.id, prefix) }, book.titulo || '')),
    element('p', {}, `${book.autor || ''} · ${book.anio || ''}`),
    element('span', { className: 'tag' }, book.genero || 'General'));
  if (borrow) body.appendChild(element('div', { className: 'book-actions' },
    element('a', { href: bookHref(book.id, prefix), className: 'btn-sm' }, 'Ver'),
    actionButton('Prestar', () => borrow(book.id), { className: 'btn-sm primary', disabled: !book.disponible || QNX.mode !== 'server', 'data-action': 'borrow' })));
  return element('div', { className: 'book' }, top, body);
}
function utcDate(value) { return value ? new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : value.replace(' ', 'T') + 'Z').toLocaleDateString() : '-'; }
function calendarDate(value) { return value ? new Date(value + 'T12:00:00').toLocaleDateString() : '-'; }

function updateNav() {
  const nav = document.querySelector('header nav');
  if (!nav) return;
  const user = getUser();
  const links = nav.querySelectorAll('a');
  const existingPrestamos = nav.querySelector('a[href="prestamos.html"], a[href="pages/prestamos.html"]');
  const existingLogout = nav.querySelector('#btnLogout');
  if (user) {
    links.forEach(a => {
      if (/(?:^|\/)(login|registro)\.html$/.test(a.getAttribute('href') || '')) a.style.display = 'none';
    });
    if (!existingPrestamos) {
      const a = document.createElement('a');
      const inPages = location.pathname.includes('/pages/');
      a.href = inPages ? 'prestamos.html' : 'pages/prestamos.html'; a.textContent = 'Mis préstamos';
      if (location.pathname.endsWith('prestamos.html')) a.className = 'active';
      nav.appendChild(a);
    }
    if (!existingLogout) {
      const span = document.createElement('span');
      span.className = 'nav-user';
      span.textContent = user.nombre || user.email;
      nav.appendChild(span);
      const btn = document.createElement('button');
      btn.id = 'btnLogout'; btn.className = 'btn-logout'; btn.textContent = 'Salir';
      btn.addEventListener('click', logout);
      nav.appendChild(btn);
    }
  } else {
    links.forEach(a => {
      if (/(?:^|\/)(login|registro)\.html$/.test(a.getAttribute('href') || '')) a.style.display = '';
    });
    if (existingPrestamos) existingPrestamos.remove();
    if (existingLogout) existingLogout.remove();
    const span = nav.querySelector('.nav-user');
    if (span) span.remove();
  }
}

// Cargar destacados en index (static)
async function cargarLibros() {
  const destacados = document.getElementById('destacados');
  if (!destacados) return;
  destacados.replaceChildren(element('p', { className: 'loading' }, element('span', { className: 'spinner' }), ' Cargando libros...'));
  try {
    const result = await QNX.books({ limit: 8 });
    const libros = result.data || result;
    if (!Array.isArray(libros) || libros.length === 0) throw new Error('sin datos');
    destacados.replaceChildren(...libros.map((book, index) => bookCard(book, index, 'pages/')));
  } catch (err) {
    console.error(err);
    destacados.textContent = 'No se pudo cargar el catalogo. Vuelve a intentar.';
    toast('No se pudo conectar con los datos de la biblioteca', 'error');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  try { await QNX.ready; } catch (error) { toast(error.message, 'error'); }
  if (QNX.mode === 'static') {
    const notice = document.createElement('p'); notice.className = 'alert info show';
    notice.textContent = 'Catalogo de demostracion. Inicia el servidor para usar cuentas, prestamos y administracion. Tus datos locales anteriores se conservan.';
    document.querySelector('main')?.prepend(notice);
  }
  updateNav();
  cargarLibros();
  const heroForm = document.querySelector('.hero .searchbar');
  if (heroForm) {
    heroForm.addEventListener('submit', e => {
      e.preventDefault();
      const q = heroForm.querySelector('input')?.value.trim();
      location.href = 'pages/catalogo.html' + (q ? '?q=' + encodeURIComponent(q) : '');
    });
  }
});

window.addEventListener('qnx-session-changed', () => {
  updateNav();
  const management = document.getElementById('formLibro')?.closest('section');
  if (management) management.style.display = getUser()?.rol === 'admin' && QNX.mode === 'server' ? '' : 'none';
});

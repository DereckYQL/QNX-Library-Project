// script.js — QNX Library static version (localStorage)

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
function getToken() { return localStorage.getItem('qnx_token'); }
function getUser() { try { return JSON.parse(localStorage.getItem('qnx_user') || 'null'); } catch { return null; } }
function isLogged() { return !!getToken(); }
function logout() {
  localStorage.removeItem('qnx_token');
  localStorage.removeItem('qnx_user');
  toast('Sesión cerrada', 'info');
  updateNav();
  setTimeout(() => location.href = location.pathname.includes('/pages/') ? '../index.html' : 'index.html', 600);
}
function authHeaders() {
  return { 'Content-Type': 'application/json' };
}

function updateNav() {
  const nav = document.querySelector('header nav');
  if (!nav) return;
  if (nav.dataset.bound === '1') return;
  nav.dataset.bound = '1';
  const user = getUser();
  const links = nav.querySelectorAll('a');
  const existingPrestamos = nav.querySelector('a[href="prestamos.html"], a[href="pages/prestamos.html"]');
  const existingLogout = nav.querySelector('#btnLogout');
  if (user) {
    links.forEach(a => {
      if (a.getAttribute('href') === 'login.html' || a.getAttribute('href') === 'registro.html') a.style.display = 'none';
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
      btn.onclick = logout;
      nav.appendChild(btn);
    }
  } else {
    links.forEach(a => {
      if (a.getAttribute('href') === 'login.html' || a.getAttribute('href') === 'registro.html') a.style.display = '';
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
  destacados.innerHTML = '<p class="loading"><span class="spinner"></span> Cargando libros...</p>';
  try {
    if (typeof initDB === 'function') initDB();
    const result = getLibros({ limit: 8 });
    const libros = result.data || result;
    if (!Array.isArray(libros) || libros.length === 0) throw new Error('sin datos');
    destacados.innerHTML = libros.map((l, i) => `
      <a class="book" href="pages/libro.html?id=${l.id}">
        <div class="book-top ${i % 2 === 1 ? 'gold' : ''}">${l.imagen_url ? `<img src="${l.imagen_url}" alt="${l.titulo}">` : l.titulo}
          <span class="badge-disponible ${l.disponible ? 'badge-ok' : 'badge-no'}">${l.disponible ? 'Disponible' : 'No disponible'}</span>
        </div>
        <div class="book-body">
          <h3>${l.titulo}</h3>
          <p>${l.autor} · ${l.anio || ''}</p>
          <span class="tag">${l.genero || 'General'}</span>
        </div>
      </a>
    `).join('');
  } catch (err) {
    console.error(err);
    destacados.innerHTML = `
      <div class="book"><div class="book-top">Cien años de soledad</div><div class="book-body"><h3>Cien años de soledad</h3><p>García Márquez · 1967</p><span class="tag">Realismo mágico</span></div></div>
      <div class="book"><div class="book-top gold">Don Quijote</div><div class="book-body"><h3>Don Quijote</h3><p>Cervantes · 1605</p><span class="tag">Clásico</span></div></div>
      <div class="book"><div class="book-top">El principito</div><div class="book-body"><h3>El principito</h3><p>Saint-Exupéry · 1943</p><span class="tag">Ficción</span></div></div>`;
    toast('Usando datos de respaldo', 'info');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof initDB === 'function') initDB();
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

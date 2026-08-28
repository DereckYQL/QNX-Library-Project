// QNX Library v2.4 - Script global: inicio + helpers
const API_LIBROS = '/api/libros';

// Toast
function toast(msg, type='info', ms=3200){
  let box = document.getElementById('toastBox');
  if(!box){ box=document.createElement('div'); box.id='toastBox'; document.body.appendChild(box); }
  const el=document.createElement('div');
  el.className='toast '+type;
  el.textContent=msg;
  box.appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transform='translateX(20px)'; setTimeout(()=>el.remove(),300); }, ms);
}

// Auth helpers
function getToken(){ return localStorage.getItem('qnx_token'); }
function getUser(){ try{ return JSON.parse(localStorage.getItem('qnx_user')||'null'); }catch{return null;} }
function isLogged(){ return !!getToken(); }
function logout(){
  localStorage.removeItem('qnx_token');
  localStorage.removeItem('qnx_user');
  toast('Sesión cerrada','info');
  updateNav();
  setTimeout(()=>location.href='index.html', 600);
}
function authHeaders(){
  const t=getToken();
  return t ? { 'Authorization':'Bearer '+t, 'Content-Type':'application/json'} : {'Content-Type':'application/json'};
}
async function fetchAuth(url, opts={}){
  opts.headers = { ...(opts.headers||{}), ...authHeaders()};
  // si opts.body ya es string y content-type json, ok
  return fetch(url, opts);
}

function updateNav(){
  const nav = document.querySelector('header nav');
  if(!nav) return;
  // evita duplicar
  if(nav.dataset.bound==='1') return;
  nav.dataset.bound='1';
  const user=getUser();
  const links = nav.querySelectorAll('a');
  // ocultar login/registro si logueado, mostrar prestamos/logout
  // recreamos nav dinamico si existe placeholder
  const existingPrestamos = nav.querySelector('a[href="prestamos.html"]');
  const existingLogout = nav.querySelector('#btnLogout');
  if(user){
    // ocultar login/registro
    links.forEach(a=>{
      if(a.getAttribute('href')==='login.html' || a.getAttribute('href')==='registro.html') a.style.display='none';
    });
    if(!existingPrestamos){
      const a=document.createElement('a');
      a.href='prestamos.html'; a.textContent='Mis préstamos';
      if(location.pathname.endsWith('prestamos.html')) a.className='active';
      nav.appendChild(a);
    }
    if(!existingLogout){
      const span=document.createElement('span');
      span.className='nav-user';
      span.textContent = user.nombre || user.email;
      nav.appendChild(span);
      const btn=document.createElement('button');
      btn.id='btnLogout'; btn.className='btn-logout'; btn.textContent='Salir';
      btn.onclick=logout;
      nav.appendChild(btn);
    }
  } else {
    links.forEach(a=>{
      if(a.getAttribute('href')==='login.html' || a.getAttribute('href')==='registro.html') a.style.display='';
    });
    if(existingPrestamos) existingPrestamos.remove();
    if(existingLogout) existingLogout.remove();
    const span=nav.querySelector('.nav-user');
    if(span) span.remove();
  }
}

// Cargar destacados en index
async function cargarLibros(){
  const destacados = document.getElementById('destacados');
  if(!destacados) return;
  destacados.innerHTML = '<p class="loading"><span class="spinner"></span> Cargando libros...</p>';
  try{
    const res = await fetch(API_LIBROS);
    let libros = await res.json();
    if(libros.data) libros = libros.data; // soporte paginado
    if(!Array.isArray(libros) || libros.length===0) throw new Error('sin datos');
    // mostrar solo 8 destacados
    const slice = libros.slice(0,8);
    destacados.innerHTML = slice.map((l,i)=>`
      <a class="book" href="libro.html?id=${l.id}">
        <div class="book-top ${i%2===1?'gold':''}">${l.imagen_url?`<img src="${l.imagen_url}" alt="${l.titulo}">`: l.titulo}
          <span class="badge-disponible ${l.disponible? 'badge-ok':'badge-no'}">${l.disponible? 'Disponible':'No disponible'}</span>
        </div>
        <div class="book-body">
          <h3>${l.titulo}</h3>
          <p>${l.autor} · ${l.anio || ''}</p>
          <span class="tag">${l.genero||'General'}</span>
        </div>
      </a>
    `).join('');
  } catch(err){
    console.error(err);
    destacados.innerHTML = `
      <div class="book"><div class="book-top">Cien años de soledad</div><div class="book-body"><h3>Cien años de soledad</h3><p>García Márquez · 1967</p><span class="tag">Realismo mágico</span></div></div>
      <div class="book"><div class="book-top gold">Don Quijote</div><div class="book-body"><h3>Don Quijote</h3><p>Cervantes · 1605</p><span class="tag">Clásico</span></div></div>
      <div class="book"><div class="book-top">El principito</div><div class="book-body"><h3>El principito</h3><p>Saint-Exupéry · 1943</p><span class="tag">Ficción</span></div></div>`;
    toast('Usando datos de respaldo','info');
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  updateNav();
  cargarLibros();
  // hero searchbar redirect with query
  const heroForm = document.querySelector('.hero .searchbar');
  if(heroForm){
    heroForm.addEventListener('submit', e=>{
      e.preventDefault();
      const q = heroForm.querySelector('input')?.value.trim();
      location.href = 'catalogo.html' + (q? '?q='+encodeURIComponent(q):'');
    });
  }
});

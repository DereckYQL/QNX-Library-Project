// catalogo.js - v2.4 avanzado
let estado = { page:1, limit:8, search:'', genero:'', disponible:'', sort:'id', order:'asc', total:0, totalPages:1 };
let librosCache = [];

function getUserRole(){ try{ const u=JSON.parse(localStorage.getItem('qnx_user')||'null'); return u?.rol||null; }catch{ return null; } }
function isAdmin(){ return getUserRole()==='admin'; }

document.addEventListener('DOMContentLoaded', ()=>{
  if(typeof updateNav==='function') updateNav();
  // ocultar form si no es admin (v2.5 SQLite permisos)
  const formSection = document.getElementById('formLibro')?.closest('section');
  if(formSection){
    if(!isAdmin()){
      formSection.style.display='none';
    } else {
      formSection.style.display='';
    }
  }
  const urlParams = new URLSearchParams(location.search);
  if(urlParams.get('q')) estado.search = urlParams.get('q');

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

  // init values
  if(els.search) els.search.value = estado.search;
  if(els.limit) els.limit.value = String(estado.limit);

  cargarGeneros();
  cargar();

  // filtros
  let debounce;
  if(els.search) els.search.addEventListener('input', e=>{
    clearTimeout(debounce);
    debounce=setTimeout(()=>{ estado.search=e.target.value.trim(); estado.page=1; cargar(); }, 350);
  });
  if(els.genero) els.genero.addEventListener('change', e=>{ estado.genero=e.target.value; estado.page=1; cargar(); });
  if(els.disp) els.disp.addEventListener('change', e=>{ estado.disponible=e.target.value; estado.page=1; cargar(); });
  if(els.limit) els.limit.addEventListener('change', e=>{ estado.limit=parseInt(e.target.value,10); estado.page=1; cargar(); });

  const btnLimpiar = document.getElementById('btnLimpiar');
  if(btnLimpiar) btnLimpiar.addEventListener('click', ()=>{
    estado.search=''; estado.genero=''; estado.disponible=''; estado.page=1;
    if(els.search) els.search.value='';
    if(els.genero) els.genero.value='';
    if(els.disp) els.disp.value='';
    cargar();
  });

  // sort click
  document.querySelectorAll('#tablaLibros th[data-sort]').forEach(th=>{
    th.addEventListener('click', ()=>{
      const col=th.dataset.sort;
      if(estado.sort===col) estado.order = estado.order==='asc'?'desc':'asc';
      else { estado.sort=col; estado.order='asc'; }
      document.querySelectorAll('#tablaLibros th .sort').forEach(s=>s.textContent='↕');
      const icon = th.querySelector('.sort');
      if(icon) icon.textContent = estado.order==='asc'?'▲':'▼';
      cargar();
    });
  });

  // form libro (crear/editar)
  if(els.form){
    // si no es admin, bloquear submit
    if(!isAdmin()){
      els.form.querySelector('button[type="submit"]').disabled=true;
      els.form.querySelector('button[type="submit"]').title='Solo admin puede agregar/editar';
    }
    els.form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      if(!isAdmin()) return toast('Solo admin puede gestionar libros','error');
      const id = document.getElementById('libroId').value;
      const data = {
        titulo: document.getElementById('fTitulo').value.trim(),
        autor: document.getElementById('fAutor').value.trim(),
        genero: document.getElementById('fGenero').value.trim(),
        anio: document.getElementById('fAnio').value.trim(),
        stock: document.getElementById('fStock').value.trim(),
        imagen_url: document.getElementById('fImagen').value.trim() || null
      };
      if(!data.titulo || !data.autor) return toast('Título y autor requeridos','error');
      const token = localStorage.getItem('qnx_token');
      if(!token) return toast('Debes iniciar sesión para gestionar libros','error');
      const btn = els.form.querySelector('button[type="submit"]');
      btn.disabled=true;
      try{
        // si hay archivo portada, subir primero
        const fileInput = document.getElementById('fPortada');
        if(fileInput && fileInput.files[0]){
          const fd = new FormData();
          fd.append('portada', fileInput.files[0]);
          const up = await fetch('/api/upload', { method:'POST', headers:{'Authorization':'Bearer '+token}, body: fd });
          const jd = await up.json();
          if(up.ok && jd.url) data.imagen_url = jd.url;
          else throw new Error(jd.error||'Error subida imagen');
        }
        const url = id ? `/api/libros/${id}` : '/api/libros';
        const method = id ? 'PUT':'POST';
        const res = await fetch(url, { method, headers:{'Content-Type':'application/json','Authorization':'Bearer '+token}, body: JSON.stringify(data)});
        const j = await res.json();
        if(!res.ok) throw new Error(j.error||'Error');
        toast(id? 'Libro actualizado':'Libro creado','success');
        els.form.reset(); document.getElementById('libroId').value='';
        document.getElementById('formTitle').textContent='Agregar libro';
        cargar();
      } catch(err){ toast(err.message,'error'); }
      finally{ btn.disabled=false; }
    });
    document.getElementById('btnCancelarEdit')?.addEventListener('click', ()=>{
      els.form.reset(); document.getElementById('libroId').value='';
      document.getElementById('formTitle').textContent='Agregar libro';
    });
  }
});

async function cargarGeneros(){
  try{
    const res=await fetch('/api/libros/generos');
    const gens=await res.json();
    const sel=document.getElementById('filtroGenero');
    const fSel=document.getElementById('fGeneroList');
    if(sel && Array.isArray(gens)){
      gens.forEach(g=>{
        const o=document.createElement('option'); o.value=g; o.textContent=g; sel.appendChild(o);
      });
    }
  }catch{}
}

async function cargar(){
  const loading=document.getElementById('loadingBox');
  const tbody=document.querySelector('#tablaLibros tbody');
  const grid=document.getElementById('gridLibros');
  if(loading) loading.style.display='flex';
  const params = new URLSearchParams();
  if(estado.search) params.set('search', estado.search);
  if(estado.genero) params.set('genero', estado.genero);
  if(estado.disponible) params.set('disponible', estado.disponible);
  params.set('page', estado.page);
  params.set('limit', estado.limit);
  params.set('sort', estado.sort);
  params.set('order', estado.order);
  try{
    const res=await fetch('/api/libros?'+params.toString());
    const json=await res.json();
    let data, total;
    if(Array.isArray(json)){ data=json; total=json.length; estado.totalPages=1; }
    else { data=json.data||[]; total=json.total||0; estado.total=json.total; estado.totalPages=json.totalPages||1; }
    librosCache=data;
    renderTabla(data);
    renderGrid(data);
    renderPaginacion(total);
    document.getElementById('countInfo').textContent = `${total} libro(s)`;
  } catch(err){
    console.error(err);
    if(tbody) tbody.innerHTML=`<tr><td colspan="7" style="text-align:center;color:#991b1b">Error cargando</td></tr>`;
    toast('Error al cargar libros','error');
  } finally { if(loading) loading.style.display='none'; }
}

function renderTabla(libros){
  const tbody=document.querySelector('#tablaLibros tbody');
  if(!tbody) return;
  if(!libros.length){
    tbody.innerHTML=`<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:1.2rem">Sin resultados</td></tr>`;
    return;
  }
  const admin = isAdmin();
  tbody.innerHTML = libros.map(l=>`
    <tr>
      <td>${l.id}</td>
      <td><a href="libro.html?id=${l.id}" style="color:var(--blue);font-weight:700">${l.titulo}</a></td>
      <td>${l.autor}</td>
      <td>${l.genero||''}</td>
      <td>${l.anio||''}</td>
      <td><span class="pill ${l.disponible?'pill-ok':'pill-no'}">${l.disponible? 'Disponible ('+ (l.stock??0)+')':'Agotado'}</span></td>
      <td class="actions">
        <button class="btn-sm" onclick="prestar(${l.id})" ${!l.disponible?'disabled':''}>Prestar</button>
        ${admin? `<button class="btn-sm" onclick="editar(${l.id})">Editar</button><button class="btn-sm danger" onclick="confirmDelete(${l.id})">Eliminar</button>`:''}
      </td>
    </tr>
  `).join('');
}

function renderGrid(libros){
  const grid=document.getElementById('gridLibros');
  if(!grid) return;
  if(!libros.length){ grid.innerHTML='<p style="color:var(--muted)">Sin libros</p>'; return; }
  grid.innerHTML = libros.map((l,i)=>`
    <div class="book">
      <div class="book-top ${i%2===1?'gold':''}">${l.imagen_url?`<img src="${l.imagen_url}" alt="">`:l.titulo}
        <span class="badge-disponible ${l.disponible?'badge-ok':'badge-no'}">${l.disponible?'Disponible':'Agotado'}</span>
      </div>
      <div class="book-body">
        <h3><a href="libro.html?id=${l.id}">${l.titulo}</a></h3>
        <p>${l.autor} · ${l.anio||''}</p>
        <span class="tag">${l.genero||''}</span>
        <div class="book-actions">
          <a href="libro.html?id=${l.id}" class="btn-sm">Ver</a>
          <button class="btn-sm primary" onclick="prestar(${l.id})" ${!l.disponible?'disabled':''}>Prestar</button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderPaginacion(total){
  const pag=document.getElementById('paginacion');
  const info=document.getElementById('pageInfo');
  if(!pag) return;
  pag.innerHTML='';
  const totalPages = estado.totalPages;
  info.textContent = `Página ${estado.page} de ${totalPages} — ${total} total`;
  const mkBtn=(label, page, disabled=false, active=false)=>{
    const b=document.createElement('button');
    b.className='page-btn'+(active?' active':'');
    b.textContent=label; b.disabled=disabled;
    b.onclick=()=>{ estado.page=page; cargar(); window.scrollTo({top:0, behavior:'smooth'}); };
    return b;
  };
  pag.appendChild(mkBtn('‹', Math.max(1,estado.page-1), estado.page===1));
  for(let p=1;p<=totalPages;p++){
    if(totalPages>7 && Math.abs(p-estado.page)>2 && p!==1 && p!==totalPages){
      if(p===2 || p===totalPages-1){ const s=document.createElement('span'); s.textContent='…'; s.style.padding='0 0.3rem'; pag.appendChild(s); }
      continue;
    }
    pag.appendChild(mkBtn(String(p), p, false, p===estado.page));
  }
  pag.appendChild(mkBtn('›', Math.min(totalPages,estado.page+1), estado.page===totalPages));
}

// acciones globales
async function prestar(id){
  const token=localStorage.getItem('qnx_token');
  if(!token){ toast('Inicia sesión para prestar','error'); location.href='login.html'; return; }
  try{
    const res=await fetch('/api/prestamos', { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+token}, body: JSON.stringify({ libro_id:id })});
    const j=await res.json();
    if(!res.ok) throw new Error(j.error);
    toast('¡Préstamo registrado! Devolución: '+j.fecha_devolucion,'success');
    cargar();
  }catch(err){ toast(err.message,'error'); }
}

function editar(id){
  if(!isAdmin()) return toast('Solo admin puede editar','error');
  const l=librosCache.find(x=>x.id===id);
  if(!l) return;
  document.getElementById('libroId').value=l.id;
  document.getElementById('fTitulo').value=l.titulo;
  document.getElementById('fAutor').value=l.autor;
  document.getElementById('fGenero').value=l.genero||'';
  document.getElementById('fAnio').value=l.anio||'';
  document.getElementById('fStock').value=l.stock??3;
  document.getElementById('fImagen').value=l.imagen_url||'';
  document.getElementById('formTitle').textContent='Editar libro #'+l.id;
  document.getElementById('formLibro').scrollIntoView({behavior:'smooth'});
}

let deleteId=null;
function confirmDelete(id){
  if(!isAdmin()) return toast('Solo admin puede eliminar','error');
  deleteId=id;
  document.getElementById('modalConfirm').classList.add('show');
  document.getElementById('modalMsg').textContent='¿Eliminar libro #'+id+'? Esta acción no se puede deshacer.';
}
function closeModal(){ document.getElementById('modalConfirm').classList.remove('show'); deleteId=null; }
document.getElementById('modalCancel')?.addEventListener('click', closeModal);
document.getElementById('modalBackdrop')?.addEventListener('click', (e)=>{ if(e.target.id==='modalBackdrop') closeModal(); });
document.getElementById('modalConfirmBtn')?.addEventListener('click', async ()=>{
  if(deleteId==null) return;
  const token=localStorage.getItem('qnx_token');
  if(!token) return toast('No autorizado','error');
  try{
    const res=await fetch('/api/libros/'+deleteId, { method:'DELETE', headers:{'Authorization':'Bearer '+token}});
    const j=await res.json();
    if(!res.ok) throw new Error(j.error);
    toast('Libro eliminado','success');
    closeModal(); cargar();
  }catch(err){ toast(err.message,'error'); }
});

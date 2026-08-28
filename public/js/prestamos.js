document.addEventListener('DOMContentLoaded', ()=>{
  if(typeof updateNav==='function') updateNav();
  const token=localStorage.getItem('qnx_token');
  if(!token){
    document.getElementById('prestamosBox').innerHTML='<p class="alert error show">Debes <a href="login.html" style="text-decoration:underline">iniciar sesión</a> para ver tus préstamos.</p>';
    return;
  }
  cargar();
});

async function cargar(){
  const box=document.getElementById('prestamosBox');
  box.innerHTML='<p class="loading"><span class="spinner"></span> Cargando préstamos...</p>';
  try{
    const res=await fetch('/api/prestamos/mis', { headers:{'Authorization':'Bearer '+localStorage.getItem('qnx_token')}});
    const data=await res.json();
    if(!res.ok) throw new Error(data.error||'Error');
    if(!data.length){
      box.innerHTML='<p class="alert info show">Aún no tienes préstamos. <a href="catalogo.html" style="text-decoration:underline">Explora el catálogo</a>.</p>';
      return;
    }
    box.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Libro</th><th>Autor</th><th>Préstamo</th><th>Devolución prevista</th><th>Estado</th><th>Acción</th></tr></thead>
          <tbody>
            ${data.map(p=>`
              <tr>
                <td><a href="libro.html?id=${p.libro_id}" style="color:var(--blue);font-weight:700">${p.titulo}</a></td>
                <td>${p.autor||''}</td>
                <td>${new Date(p.fecha_prestamo).toLocaleDateString()}</td>
                <td>${p.fecha_devolucion ? new Date(p.fecha_devolucion).toLocaleDateString() : '-'}</td>
                <td><span class="pill ${p.estado==='activo'?'pill-ok':'pill-no'}">${p.estado}</span></td>
                <td>${p.estado==='activo'? `<button class="btn-sm primary" onclick="devolver(${p.id})">Devolver</button>`: `<span style="color:var(--muted);font-size:0.8rem">${p.fecha_devuelto? new Date(p.fecha_devuelto).toLocaleDateString():''}</span>`}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }catch(err){
    box.innerHTML=`<p class="alert error show">${err.message}</p>`;
  }
}

async function devolver(id){
  if(!confirm('¿Confirmar devolución?')) return;
  try{
    const res=await fetch('/api/prestamos/'+id+'/devolver', { method:'PUT', headers:{'Authorization':'Bearer '+localStorage.getItem('qnx_token')}});
    const j=await res.json();
    if(!res.ok) throw new Error(j.error);
    toast('Libro devuelto','success');
    cargar();
  }catch(err){ toast(err.message,'error'); }
}

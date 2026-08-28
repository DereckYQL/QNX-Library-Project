// auth.js - login / registro
document.addEventListener('DOMContentLoaded', ()=>{
  if(typeof updateNav==='function') updateNav();
  const loginForm = document.getElementById('loginForm');
  const registroForm = document.getElementById('registroForm');

  function showAlert(form, msg, type='error'){
    let el = form.querySelector('.alert');
    if(!el){ el=document.createElement('div'); el.className='alert'; form.prepend(el); }
    el.textContent=msg;
    el.className='alert show '+type;
    setTimeout(()=>el.classList.remove('show'), 4000);
  }

  if(loginForm){
    loginForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const btn = loginForm.querySelector('button[type="submit"]');
      btn.disabled=true; btn.textContent='Entrando...';
      try{
        const res = await fetch('/api/auth/login', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if(!res.ok) throw new Error(data.error||'Error login');
        localStorage.setItem('qnx_token', data.token);
        localStorage.setItem('qnx_user', JSON.stringify(data.usuario));
        if(typeof toast==='function') toast('Bienvenido '+data.usuario.nombre,'success');
        setTimeout(()=> location.href='catalogo.html', 700);
      } catch(err){
        showAlert(loginForm, err.message, 'error');
        if(typeof toast==='function') toast(err.message,'error');
      } finally { btn.disabled=false; btn.textContent='Entrar'; }
    });
  }

  if(registroForm){
    registroForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const nombre = document.getElementById('nombre').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const btn = registroForm.querySelector('button[type="submit"]');
      btn.disabled=true; btn.textContent='Registrando...';
      try{
        const res = await fetch('/api/auth/register', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ nombre, email, password })
        });
        const data = await res.json();
        if(!res.ok) throw new Error(data.error||'Error registro');
        localStorage.setItem('qnx_token', data.token);
        localStorage.setItem('qnx_user', JSON.stringify(data.usuario));
        if(typeof toast==='function') toast('Cuenta creada','success');
        showAlert(registroForm, 'Cuenta creada, redirigiendo...','success');
        setTimeout(()=> location.href='catalogo.html', 800);
      } catch(err){
        showAlert(registroForm, err.message, 'error');
        if(typeof toast==='function') toast(err.message,'error');
      } finally { btn.disabled=false; btn.textContent='Registrarse'; }
    });
  }
});

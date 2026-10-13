// auth.js — static version (localStorage, no server)
document.addEventListener('DOMContentLoaded', () => {
  // Always init DB first
  if (typeof initDB === 'function') initDB();
  if (typeof updateNav === 'function') updateNav();

  const loginForm    = document.getElementById('loginForm');
  const registroForm = document.getElementById('registroForm');

  function showAlert(form, msg, type = 'error') {
    let el = form.querySelector('.alert');
    if (!el) {
      el = document.createElement('div');
      el.className = 'alert';
      form.prepend(el);
    }
    el.textContent = msg;
    el.className = 'alert show ' + type;
    setTimeout(() => el.classList.remove('show'), 4000);
  }

  // ── Login ────────────────────────────────────────────────────────────
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email    = document.getElementById('email').value.trim().toLowerCase();
      const password = document.getElementById('password').value;
      const btn      = loginForm.querySelector('button[type="submit"]');
      btn.disabled   = true;
      btn.textContent = 'Entrando...';

      try {
        if (!email || !password) throw new Error('Email y contraseña requeridos');

        const user = getUsuario(email);
        if (!user) throw new Error('Credenciales inválidas');

        const ok = await validatePassword(password, user.password_hash);
        if (!ok) throw new Error('Credenciales inválidas');

        const sesion = { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };
        localStorage.setItem('qnx_user', JSON.stringify(sesion));
        localStorage.setItem('qnx_token', 'static-' + user.id);

        if (typeof toast === 'function') toast('Bienvenido ' + user.nombre, 'success');
        showAlert(loginForm, 'Acceso correcto, redirigiendo...', 'success');

        setTimeout(() => { location.href = 'catalogo.html'; }, 700);
      } catch (err) {
        showAlert(loginForm, err.message, 'error');
        if (typeof toast === 'function') toast(err.message, 'error');
      } finally {
        btn.disabled    = false;
        btn.textContent = 'Entrar';
      }
    });
  }

  // ── Registro ─────────────────────────────────────────────────────────
  if (registroForm) {
    registroForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nombre   = document.getElementById('nombre').value.trim();
      const email    = document.getElementById('email').value.trim().toLowerCase();
      const password = document.getElementById('password').value;
      const btn      = registroForm.querySelector('button[type="submit"]');
      btn.disabled   = true;
      btn.textContent = 'Registrando...';

      try {
        if (!nombre || nombre.length < 2)
          throw new Error('Nombre requerido (mín. 2 caracteres)');
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
          throw new Error('Email inválido');
        if (!password || password.length < 6)
          throw new Error('Contraseña mínimo 6 caracteres');

        const user = await createUsuario({ nombre, email, password });
        const sesion = { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };
        localStorage.setItem('qnx_user', JSON.stringify(sesion));
        localStorage.setItem('qnx_token', 'static-' + user.id);

        if (typeof toast === 'function') toast('Cuenta creada', 'success');
        showAlert(registroForm, 'Cuenta creada, redirigiendo...', 'success');

        setTimeout(() => { location.href = 'catalogo.html'; }, 800);
      } catch (err) {
        showAlert(registroForm, err.message, 'error');
        if (typeof toast === 'function') toast(err.message, 'error');
      } finally {
        btn.disabled    = false;
        btn.textContent = 'Registrarse';
      }
    });
  }
});

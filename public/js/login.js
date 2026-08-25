document.getElementById('form-login').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const msgDiv = document.getElementById('mensaje-login');

  if (!email || !password) {
    mostrarMensaje(msgDiv, 'Completa todos los campos.', 'error');
    return;
  }

  mostrarMensaje(msgDiv, 'Inicio de sesion no disponible aun.', 'info');
});

function mostrarMensaje(div, texto, tipo) {
  div.textContent = texto;
  div.className = `mensaje mensaje-${tipo}`;
}

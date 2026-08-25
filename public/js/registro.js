const API_URL = '/api';

document.getElementById('form-libro').addEventListener('submit', async (e) => {
  e.preventDefault();
  const titulo = document.getElementById('titulo').value.trim();
  const autor = document.getElementById('autor').value.trim();
  const genero = document.getElementById('genero').value.trim();
  const msgDiv = document.getElementById('mensaje-form');

  if (!titulo || !autor) {
    mostrarMensaje(msgDiv, 'Titulo y Autor son obligatorios.', 'error');
    return;
  }

  try {
    const respuesta = await fetch(`${API_URL}/libros`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo, autor, genero })
    });
    if (!respuesta.ok) throw new Error();
    mostrarMensaje(msgDiv, 'Libro registrado con exito.', 'ok');
    e.target.reset();
  } catch {
    mostrarMensaje(msgDiv, 'Error al registrar el libro. Intente de nuevo.', 'error');
  }
});

function mostrarMensaje(div, texto, tipo) {
  div.textContent = texto;
  div.className = `mensaje mensaje-${tipo}`;
}

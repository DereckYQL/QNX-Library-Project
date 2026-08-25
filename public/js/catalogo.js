const API_URL = '/api';

async function cargarCatalogo() {
  try {
    const respuesta = await fetch(`${API_URL}/libros`);
    if (!respuesta.ok) throw new Error('Error del servidor');
    const libros = await respuesta.json();
    renderizarTabla(libros);
  } catch (e) {
    document.getElementById('mensaje-error').style.display = 'block';
  }
}

function renderizarTabla(libros) {
  const tbody = document.getElementById('cuerpo-tabla');
  if (libros.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5">No hay libros registrados.</td></tr>';
    return;
  }
  tbody.innerHTML = libros.map(libro => {
    const estado = libro.disponible ? 'Si' : 'No';
    const clase = libro.disponible ? 'disponible-si' : 'disponible-no';
    return `
      <tr>
        <td>${libro.titulo}</td>
        <td>${libro.autor}</td>
        <td>${libro.genero || '-'}</td>
        <td class="${clase}">${estado}</td>
        <td>
          <button onclick="cambiarEstado(${libro.id_lib}, ${libro.disponible})">Cambiar estado</button>
          <button class="btn-secundario" onclick="eliminar(${libro.id_lib})">Eliminar</button>
        </td>
      </tr>`;
  }).join('');
}

async function eliminar(id) {
  if (!confirm('Eliminar este libro?')) return;
  try {
    const r = await fetch(`${API_URL}/libros/${id}`, { method: 'DELETE' });
    if (!r.ok) throw new Error();
    cargarCatalogo();
  } catch {
    alert('No se pudo eliminar el libro.');
  }
}

async function cambiarEstado(id, estadoActual) {
  try {
    const r = await fetch(`${API_URL}/libros`);
    const libros = await r.json();
    const libro = libros.find(l => l.id_lib === id);
    await fetch(`${API_URL}/libros/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titulo: libro.titulo,
        autor: libro.autor,
        genero: libro.genero,
        disponible: !estadoActual
      })
    });
    cargarCatalogo();
  } catch {
    alert('No se pudo actualizar el libro.');
  }
}

cargarCatalogo();

const API_URL = '/api';

async function cargarCatalogo() {
  const respuesta = await fetch(`${API_URL}/libros`);
  const libros = await respuesta.json();
  renderizarCatalogo(libros);
}

function renderizarCatalogo(libros) {
  const tbody = document.getElementById('cuerpo-tabla');
  let filasHTML = '';

  libros.forEach(function (libro) {
    const estado = libro.disponible ? 'Sí' : 'No';
    const claseEstado = libro.disponible ? 'disponible-si' : 'disponible-no';

    filasHTML += `
      <tr>
        <td>${libro.titulo}</td>
        <td>${libro.autor}</td>
        <td>${libro.genero || '-'}</td>
        <td class="${claseEstado}">${estado}</td>
        <td>
          <button onclick="cambiarDisponibilidad(${libro.id_lib}, ${libro.disponible})">
            Cambiar estado
          </button>
          <button onclick="eliminarLibro(${libro.id_lib})">
            Eliminar
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = filasHTML;
}

document.getElementById('form-libro').addEventListener('submit', async (e) => {
  e.preventDefault();

  const titulo = document.getElementById('titulo').value;
  const autor = document.getElementById('autor').value;
  const genero = document.getElementById('genero').value;

  await fetch(`${API_URL}/libros`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ titulo, autor, genero })
  });

  e.target.reset();
  cargarCatalogo();
});

async function eliminarLibro(id) {
  const confirmar = confirm('¿Seguro que quieres eliminar este libro?');
  if (!confirmar) return;

  try {
    const respuesta = await fetch(`${API_URL}/libros/${id}`, {
      method: 'DELETE'
    });

    if (!respuesta.ok) {
      throw new Error('No se pudo eliminar el libro');
    }

    cargarCatalogo();
  } catch (error) {
    console.error(error);
    alert('Ocurrió un error al eliminar el libro');
  }
}

async function cambiarDisponibilidad(id, estadoActual) {
  try {
    const respuestaLibros = await fetch(`${API_URL}/libros`);
    const libros = await respuestaLibros.json();
    const libro = libros.find(l => l.id_lib === id);

    const respuesta = await fetch(`${API_URL}/libros/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titulo: libro.titulo,
        autor: libro.autor,
        genero: libro.genero,
        disponible: !estadoActual
      })
    });

    if (!respuesta.ok) {
      throw new Error('No se pudo actualizar el libro');
    }

    cargarCatalogo();
  } catch (error) {
    console.error(error);
    alert('Ocurrió un error al actualizar el libro');
  }
}

cargarCatalogo();
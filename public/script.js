const API = '/api/libros';

const portadas = {
    'Cien Anos de Soledad': 'https://covers.openlibrary.org/b/isbn/9780060929732-M.jpg',
    'Cien Años de Soledad': 'https://covers.openlibrary.org/b/isbn/9780060929732-M.jpg',
    '1984': 'https://covers.openlibrary.org/b/isbn/9780451524935-M.jpg',
    'El Principito': 'https://covers.openlibrary.org/b/isbn/9780156012195-M.jpg',
    'Don Quijote de la Mancha': 'https://covers.openlibrary.org/b/isbn/9788420412146-M.jpg'
};

function getPortada(titulo) {
    return portadas[titulo] || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&q=60';
}

async function cargarCatalogo() {
    const contenedor = document.getElementById('lista-libros');
    if (!contenedor) return;

    try {
        const res = await fetch(API);
        if (!res.ok) throw new Error();
        const libros = await res.json();
        renderizarLibros(libros);
    } catch {
        contenedor.innerHTML = '<p class="loading" style="color:#991b1b">No se pudo cargar el catálogo. Asegúrate de que el servidor esté corriendo.</p>';
    }
}

function renderizarLibros(libros) {
    const contenedor = document.getElementById('lista-libros');
    if (libros.length === 0) {
        contenedor.innerHTML = '<p class="loading">No hay libros registrados.</p>';
        return;
    }

    contenedor.innerHTML = libros.map(libro => {
        const disponible = libro.disponible == 1 || libro.disponible === true;
        const badge = disponible
            ? '<span class="badge disponible">Disponible</span>'
            : '<span class="badge no-disponible">No disponible</span>';
        const btnToggle = disponible
            ? `<button class="btn-toggle" onclick="cambiarEstado(${libro.id_lib}, true)">Marcar no disp.</button>`
            : `<button class="btn-toggle no-disp" onclick="cambiarEstado(${libro.id_lib}, false)">Marcar disp.</button>`;

        return `
        <div class="book" id="libro-${libro.id_lib}">
            <img src="${getPortada(libro.titulo)}" alt="${libro.titulo}" class="book-cover">
            <h3>${libro.titulo}</h3>
            <p>${libro.autor}</p>
            <p class="genero">${libro.genero || ''}</p>
            ${badge}
            <div class="book-actions">
                ${btnToggle}
                <button class="btn-delete" onclick="eliminarLibro(${libro.id_lib})">Eliminar</button>
            </div>
        </div>`;
    }).join('');
}

async function cambiarEstado(id, estadoActual) {
    try {
        const res = await fetch(API);
        const libros = await res.json();
        const libro = libros.find(l => l.id_lib === id);

        await fetch(`${API}/${id}`, {
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

async function eliminarLibro(id) {
    if (!confirm('¿Eliminar este libro?')) return;
    try {
        const r = await fetch(`${API}/${id}`, { method: 'DELETE' });
        if (!r.ok) throw new Error();
        cargarCatalogo();
    } catch {
        alert('No se pudo eliminar el libro.');
    }
}

function buscarLibro() {
    const input = document.getElementById('searchInput');
    if (!input) return;
    const texto = input.value.trim().toLowerCase();
    const libros = document.querySelectorAll('.book');
    let encontrados = 0;

    libros.forEach(libro => {
        const titulo = libro.querySelector('h3').textContent.toLowerCase();
        const autor = libro.querySelector('p').textContent.toLowerCase();
        if (titulo.includes(texto) || autor.includes(texto) || texto === '') {
            libro.style.display = 'block';
            encontrados++;
        } else {
            libro.style.display = 'none';
        }
    });

    if (texto !== '' && encontrados === 0) {
        alert('No se encontraron libros con ese criterio.');
    }
}

const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') buscarLibro();
    });
}

async function registrarLibro(e) {
    e.preventDefault();
    const titulo = document.getElementById('titulo').value.trim();
    const autor = document.getElementById('autor').value.trim();
    const genero = document.getElementById('generoSelect').value;
    const disponible = document.getElementById('disponibles').value === 'true';
    const msg = document.getElementById('registro-msg');

    if (!titulo || !autor) {
        msg.textContent = 'Por favor completa todos los campos obligatorios.';
        msg.className = 'form-msg error';
        return;
    }

    try {
        const res = await fetch(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ titulo, autor, genero, disponible })
        });
        if (!res.ok) throw new Error();
        msg.textContent = `✓ Libro "${titulo}" registrado correctamente.`;
        msg.className = 'form-msg success';
        e.target.reset();
    } catch {
        msg.textContent = 'Error al registrar el libro. Intente de nuevo.';
        msg.className = 'form-msg error';
    }
}

function iniciarSesion(e) {
    e.preventDefault();
    const msg = document.getElementById('login-msg');
    msg.textContent = 'Inicio de sesión no disponible aún.';
    msg.className = 'form-msg error';
}

cargarCatalogo();
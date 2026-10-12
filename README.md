# QNX Library

Sistema de gestión de biblioteca digital con catálogo de 24 libros, autenticación por roles, préstamos y modo 100% estático (sin servidor). Toda la lógica corre en el navegador usando `localStorage` como base de datos, lo que lo hace compatible con GitHub Pages y Cloudflare Pages sin necesidad de backend.

---

## Estructura del proyecto

```
QNX-Library-Project/
├── public/
│   ├── index.html              # Página principal
│   ├── css/
│   │   └── style.css           # Estilos globales
│   ├── js/
│   │   ├── db.js               # Base de datos en localStorage
│   │   ├── crypto-utils.js     # Hashing SHA-256 vía Web Crypto API
│   │   ├── script.js           # Helpers globales, navegación, toast
│   │   ├── auth.js             # Login y registro
│   │   ├── catalogo.js         # Lógica del catálogo
│   │   ├── libro.js            # Detalle y préstamo individual
│   │   ├── prestamos.js        # Mis préstamos y devolución
│   │   └── server.js           # Backend Express (modo servidor local)
│   ├── pages/
│   │   ├── catalogo.html       # Catálogo con filtros y paginación
│   │   ├── libro.html          # Detalle de libro
│   │   ├── login.html          # Inicio de sesión
│   │   ├── registro.html       # Registro de usuario
│   │   └── prestamos.html      # Mis préstamos
│   ├── database/
│   │   ├── biblioteca.db       # Base de datos SQLite (modo servidor)
│   │   └── schema.sql          # Schema de referencia
│   ├── img/
│   │   └── logo.svg
│   └── uploads/                # Portadas subidas (modo servidor)
├── package.json
├── .env.example
└── CHANGELOG.md
```

---

## Credenciales por defecto

| Usuario | Contraseña | Rol | Permisos |
|---------|-----------|-----|---------|
| `admin@qnx.local` | `Admin123!` | admin | CRUD libros, gestión de usuarios, todos los préstamos |
| `visitante@qnx.local` | `visitante123` | visitante | Catálogo (solo lectura) + préstamos propios |

Los usuarios registrados desde el formulario obtienen el rol `visitante` por defecto.

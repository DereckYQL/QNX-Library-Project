# QNX Library

**Sistema de gestión de biblioteca digital** con catálogo, préstamos, autenticación por roles y soporte para dos modos de ejecución: servidor local (Node.js + SQLite) y despliegue estático en GitHub Pages.

---

## Tabla de contenidos

- [Características](#características)
- [Modos de ejecución](#modos-de-ejecución)
- [Inicio rápido](#inicio-rápido)
- [Credenciales por defecto](#credenciales-por-defecto)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Stack tecnológico](#stack-tecnológico)
- [API REST](#api-rest)
- [Roles y permisos](#roles-y-permisos)
- [Base de datos](#base-de-datos)
- [Despliegue en GitHub Pages](#despliegue-en-github-pages)
- [Solución de problemas](#solución-de-problemas)
- [Changelog](#changelog)

---

## Características

- **Catálogo de 24 libros** con búsqueda, filtros por género y disponibilidad, paginación y ordenamiento.
- **Autenticación JWT** con roles diferenciados: `admin` y `visitante`.
- **Sistema de préstamos**: registrar préstamo, fecha de devolución y devolución desde el perfil del usuario.
- **Panel de administración**: CRUD completo de libros, gestión de usuarios y cambio de roles.
- **Subida de portadas** (modo servidor): imágenes almacenadas localmente vía Multer.
- **Modo offline / GitHub Pages**: toda la lógica corre en el navegador con `localStorage` como base de datos.
- **Compatible con DB Browser for SQLite** para inspección y edición directa de la base de datos (modo servidor).

---

## Modos de ejecución

| Modo | Tecnología | Persistencia | Cuándo usarlo |
|------|-----------|-------------|---------------|
| **Servidor local** | Node.js + Express + SQLite | Archivo `.db` en disco | Desarrollo, uso en red local |
| **GitHub Pages** | HTML/CSS/JS puro | `localStorage` del navegador | Demo público, sin servidor |

---

## Inicio rápido

### Modo servidor local

**Requisitos:** Node.js 18+ y npm.

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar el servidor
npm start
```

O bien, hacer doble clic en **`Iniciar QNX Library v2.5.bat`** — abre el navegador automáticamente y el servidor queda corriendo en segundo plano.

El servidor estará disponible en `http://localhost:3000`.

> Para detener el servidor: Administrador de tareas → `Node.js JavaScript Runtime` → Finalizar tarea, o ejecutar `taskkill /F /IM node.exe` en CMD.

### Modo GitHub Pages / archivo local

Abrir directamente `public/index.html` en el navegador, o visitar la URL de GitHub Pages del repositorio. No requiere instalación ni Node.js.

---

## Credenciales por defecto

| Usuario | Contraseña | Rol | Permisos |
|---------|-----------|-----|---------|
| `admin@qnx.local` | `Admin123!` | admin | CRUD libros, gestión de usuarios, todos los préstamos |
| `visitante@qnx.local` | `visitante123` | visitante | Catálogo (solo lectura) + préstamos propios |

Los usuarios adicionales registrados desde el formulario obtienen el rol `visitante` por defecto.

---

## Estructura del proyecto

```
QNX-Library-Project/
├── public/
│   ├── index.html              # Página principal
│   ├── catalogo.html           # Catálogo con filtros y paginación
│   ├── libro.html              # Detalle de libro
│   ├── login.html              # Inicio de sesión
│   ├── registro.html           # Registro de usuario
│   ├── prestamos.html          # Mis préstamos
│   ├── css/
│   │   └── style.css           # Estilos globales
│   ├── js/
│   │   ├── server.js           # Backend Express (modo servidor)
│   │   ├── db.js               # Base de datos en localStorage (modo estático)
│   │   ├── crypto-utils.js     # Hashing SHA-256 vía Web Crypto API
│   │   ├── script.js           # Helpers globales, navegación, toast
│   │   ├── auth.js             # Login y registro
│   │   ├── catalogo.js         # Lógica del catálogo
│   │   ├── libro.js            # Detalle y préstamo individual
│   │   └── prestamos.js        # Mis préstamos y devolución
│   ├── database/
│   │   ├── biblioteca.db       # Base de datos SQLite (modo servidor)
│   │   └── schema.sql          # Schema de referencia
│   ├── img/
│   │   └── logo.svg
│   └── uploads/                # Portadas subidas (modo servidor)
├── .nojekyll                   # Necesario para GitHub Pages
├── index.html                  # Redirección a public/index.html
├── package.json
├── .env                        # Variables de entorno (no subir a repositorios públicos)
├── .env.example
├── Iniciar QNX Library v2.5.bat
└── CHANGELOG.md
```

---

## Stack tecnológico

### Modo servidor
| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express 4.19 |
| Base de datos | SQLite (`sqlite3` + `sqlite`) |
| Autenticación | JSON Web Tokens (`jsonwebtoken`) |
| Passwords | `bcryptjs` (bcrypt, factor 10) |
| Upload | Multer (max 3 MB, solo imágenes) |
| Rate limiting | `express-rate-limit` |
| Config | `dotenv` |

### Modo estático (GitHub Pages)
| Capa | Tecnología |
|------|-----------|
| Persistencia | `localStorage` (JSON) |
| Autenticación | Sesión en `localStorage`, passwords con SHA-256 (Web Crypto API) |
| Sin dependencias externas | HTML + CSS + JS vanilla |

---

## API REST

Disponible únicamente en el modo servidor local (`http://localhost:3000`).

### Autenticación

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/auth/register` | — | Registrar usuario |
| `POST` | `/api/auth/login` | — | Iniciar sesión, devuelve JWT |
| `GET` | `/api/auth/me` | JWT | Perfil del usuario autenticado |

### Libros

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/libros` | — | Listar libros (soporta `search`, `genero`, `disponible`, `page`, `limit`, `sort`, `order`) |
| `GET` | `/api/libros/:id` | — | Detalle de un libro |
| `GET` | `/api/libros/generos` | — | Lista de géneros disponibles |
| `POST` | `/api/libros` | admin | Crear libro |
| `PUT` | `/api/libros/:id` | admin | Actualizar libro |
| `DELETE` | `/api/libros/:id` | admin | Eliminar libro |

### Préstamos

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/prestamos` | JWT | Registrar préstamo |
| `GET` | `/api/prestamos/mis` | JWT | Mis préstamos |
| `PUT` | `/api/prestamos/:id/devolver` | JWT | Devolver libro |
| `GET` | `/api/prestamos` | admin | Todos los préstamos |

### Usuarios

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/usuarios` | admin | Listar usuarios |
| `DELETE` | `/api/usuarios/:id` | admin | Eliminar usuario |
| `PUT` | `/api/usuarios/:id/rol` | admin | Cambiar rol |

### Utilidades

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/upload` | admin | Subir imagen de portada |
| `GET` | `/api/health` | — | Estado del servidor y la base de datos |

---

## Roles y permisos

```
admin
 ├── CRUD completo de libros
 ├── Subida de portadas
 ├── Ver todos los préstamos
 └── Gestión de usuarios (listar, eliminar, cambiar rol)

visitante / user
 ├── Ver catálogo y detalle de libros
 ├── Registrar préstamos propios
 └── Devolver préstamos propios
```

Solo un admin puede crear otro usuario con rol `admin` (enviando su JWT en la cabecera al registrar).

---

## Base de datos

### Modo servidor — SQLite

Archivo: `public/database/biblioteca.db`

Las tablas se crean automáticamente al iniciar el servidor si no existen. El modo WAL (`PRAGMA journal_mode=WAL`) y las claves foráneas (`PRAGMA foreign_keys=ON`) están activos por defecto.

**Inspección con DB Browser for SQLite:**
1. Descargar desde https://sqlitebrowser.org/
2. Archivo → Abrir base de datos → seleccionar `public/database/biblioteca.db`
3. Los cambios realizados desde DB Browser se reflejan en el sitio al recargar.

**Tablas:**

| Tabla | Descripción |
|-------|-------------|
| `Libros` | Catálogo (24 libros seed) |
| `Usuarios` | Cuentas con roles |
| `Prestamos` | Historial de préstamos con estado |

Para recrear la base de datos desde cero, eliminar `biblioteca.db` y reiniciar el servidor.

### Modo GitHub Pages — localStorage

La base de datos se almacena en `localStorage` bajo la clave `qnx_db` como un objeto JSON con la misma estructura de tablas. Se inicializa con los 24 libros y 2 usuarios seed la primera vez que se abre la aplicación. Los datos persisten entre sesiones del navegador pero son locales al dispositivo.

---

## Despliegue en GitHub Pages

1. Subir el repositorio a GitHub.
2. En **Settings → Pages**, seleccionar la rama principal como fuente.
3. GitHub Pages servirá `index.html` en la raíz, que redirige automáticamente a `public/index.html`.
4. El archivo `.nojekyll` en la raíz evita el procesamiento por Jekyll.

> Los datos del modo GitHub Pages son locales al navegador del visitante. Cada usuario empieza con la base de datos seed y sus cambios no se comparten con otros usuarios.

---

## Variables de entorno

Archivo `.env` en la raíz (solo aplica al modo servidor):

```env
SERVER_PORT=3000
DB_PATH=public/database/biblioteca.db
JWT_SECRET=cambia_esto_por_un_secreto_seguro
JWT_EXPIRES_IN=7d
```

> No subir el archivo `.env` a repositorios públicos. Usar `.env.example` como referencia.

---

## Solución de problemas

| Problema | Solución |
|----------|---------|
| `Cannot find module 'sqlite3'` | Ejecutar `npm install`. En Windows puede requerir las herramientas de compilación nativas de Node.js. |
| `403 Requiere rol admin` al crear libro | Iniciar sesión con `admin@qnx.local`. |
| `biblioteca.db` bloqueada en DB Browser | Cerrar DB Browser antes de usar el sitio, o dejar que el modo WAL gestione los accesos concurrentes. |
| Puerto 3000 ocupado | Cambiar `SERVER_PORT` en `.env`, o liberar el puerto con `netstat -ano | findstr :3000`. |
| Datos perdidos en GitHub Pages | Los datos viven en `localStorage`. Limpiar el almacenamiento del navegador reinicia la base de datos al estado seed. |
| El `.bat` no abre el navegador | Verificar que Node.js esté instalado y accesible en el PATH del sistema. |

---

## Changelog

### v2.5.0 — 2026-08-28
- Migración de MySQL a SQLite (`sqlite3` + `sqlite`), compatible con DB Browser for SQLite.
- Usuarios seed persistidos en la base de datos: admin y visitante.
- Middleware `requireAdmin` en todas las rutas de escritura.
- Endpoints de gestión de usuarios para administradores.
- `Iniciar QNX Library v2.5.bat` reescrito para ejecutar el servidor en segundo plano (sin bloquear la terminal).
- Schema SQLite en `public/database/schema.sql`.

### v2.5.1 — 2026-10-12
- Versión estática para GitHub Pages: `public/js/db.js` (localStorage), `public/js/crypto-utils.js` (SHA-256).
- Todos los JS del frontend adaptados para funcionar sin servidor.
- Añadidos `index.html` de redirección y `.nojekyll` para GitHub Pages.

### Versiones anteriores
| Versión | Descripción |
|---------|-------------|
| v2.4.0 | Auth JWT, sistema de préstamos, catálogo avanzado (MySQL) |
| v2.3.0 | Catálogo con 24 libros |
| v2.2.0 | Interfaz híbrida |
| v2.1.0 | Tema Dark Neon |

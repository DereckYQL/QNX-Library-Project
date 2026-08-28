# QNX Library v2.5 - SQLite (DB Browser)

Biblioteca virtual **Express + SQLite** - Colección digital QNX. **v2.5** migra de MySQL a **SQLite** (compatible **DB Browser for SQLite**), agrega usuarios seed **admin** (todos los permisos) y **visitante** con persistencia real.

## Novedades v2.5 (vs v2.4 MySQL)

- **SQLite + DB Browser:** `better-sqlite3` + archivo `public/database/biblioteca.db` (WAL, FK ON). Abre directo con **DB Browser for SQLite**: Archivo > Abrir base de datos > `biblioteca.db`. Sin instalar MySQL.
- **Usuarios seed persistidos:** al iniciar se crean si no existen:
  - **Admin** `admin@qnx.local` / `Admin123!` → `rol=admin` (todos los permisos: CRUD libros, gestionar usuarios, ver todos los préstamos, subir portada)
  - **Visitante** `visitante@qnx.local` / `visitante123` → `rol=visitante` (solo lectura + préstamos propios)
- **Registro persistente:** `POST /api/auth/register` guarda en SQLite (nuevos usuarios quedan en `biblioteca.db`, rol por defecto `visitante`; solo admin con token puede crear otro admin vía `rol: admin`).
- **Roles y permisos:** middleware `requireAdmin` protege `POST/PUT/DELETE /api/libros`, `POST /api/upload`, `GET /api/usuarios`, `DELETE /api/usuarios/:id`, `GET /api/prestamos` (global). Visitante solo puede `GET /api/libros`, `POST /api/prestamos` y `GET /api/prestamos/mis`.
- **Gestión usuarios (admin):** `GET /api/usuarios` lista, `DELETE /api/usuarios/:id`, `PUT /api/usuarios/:id/rol`.
- **BAT sin terminal bloqueada:** `Iniciar QNX Library v2.5.bat` lanza `node` en **segundo plano oculto** (`WindowStyle Hidden`). Cerrar la ventana **NO** tumba el localhost (queda `node.exe` oculto hasta apagar Windows). Se eliminó `Detener .bat` como pediste.
- **24 libros** igual, con `disponible/stock/imagen_url` + índices, seed automático si tabla vacía.

## Cómo ejecutar (sin MySQL)

### Requisitos
- Node.js 18+ y npm
- **DB Browser for SQLite** opcional (para ver `biblioteca.db`): https://sqlitebrowser.org/

### 1) Abrir
- Doble click en **`Iniciar QNX Library v2.5.bat`** (recomendado) → abre http://localhost:3000 en 4s y se cierra solo. El servidor queda oculto.
- O manual: `npm install` → `npm start`

### 2) .env (ya incluido)
```
SERVER_PORT=3000
DB_PATH=public/database/biblioteca.db
JWT_SECRET=qnx_library_secret_2026_cambia_en_produccion
JWT_EXPIRES_IN=7d
```

### 3) Ver base de datos
- Abre **DB Browser for SQLite** → Abrir `QNX-Library v2.5/public/database/biblioteca.db`
- Tablas: `Libros` (24), `Usuarios` (admin+visitante + los que registres), `Prestamos`
- Puedes editar/insertar/borrar y los cambios se reflejan al recargar el sitio (WAL).

### 4) Probar
- http://localhost:3000 → Inicio
- http://localhost:3000/catalogo.html → catálogo (filtros, paginación). **Solo admin ve form y botones Editar/Eliminar**
- http://localhost:3000/api/health → `{ status:"ok", db:"sqlite", count:24, usuarios:2 }`
- Login admin: `admin@qnx.local` / `Admin123!` → puede crear libros y ver `GET /api/usuarios`
- Login visitante: `visitante@qnx.local` / `visitante123` → solo presta, si intenta crear libro recibe `403`
- Registro: crea usuarios `visitante` persistidos en `biblioteca.db`

### Para detener el servidor (como no hay Detener.bat)
- Administrador de tareas → Procesos → `Node.js JavaScript Runtime` → Finalizar tarea, o reiniciar Windows, o `taskkill /F /IM node.exe` en CMD.

## Estructura v2.5
```
public/database/biblioteca.db  # SQLite real (DB Browser)
public/database/schema.sql     # Schema SQLite de referencia
public/js/server.js            # Express + better-sqlite3 + JWT + roles
Iniciar QNX Library v2.5.bat   # Lanzador oculto (no bloquea terminal)
```

## Stack
- Backend: Express 4.19 + better-sqlite3 9.2 + bcryptjs + jsonwebtoken + express-rate-limit + multer
- Frontend: HTML/CSS/JS (fetch + localStorage JWT + control rol admin)
- DB: SQLite `Libros` + `Usuarios(rol admin/visitante)` + `Prestamos`

## Versiones
| Tag | Descripción |
|-----|-------------|
| `v2.5.0` | SQLite + Admin/Visitante + DB Browser + BAT oculto |
| `v2.4.0` | MySQL + Auth + Préstamos |
| `v2.3.0` | 24 libros |

## Troubleshooting
- `Cannot find module better-sqlite3`: ejecuta `npm install` (requiere compilación nativa, en Windows usa Node 18/20 con prebuild).
- `403 Requiere rol admin` al crear libro → loguéate como admin@qnx.local
- `biblioteca.db` bloqueada en DB Browser → cierra DB Browser o usa WAL (ya activo).
- Puerto 3000 ocupado → el .bat mata instancia previa automáticamente.

# Changelog - QNX Library

## [v2.5.0] - 2026-08-28 - SQLite + Admin/Visitante + DB Browser + BAT oculto

**Base:** v2.4 MySQL

- **Migración MySQL → SQLite (`better-sqlite3`):** archivo `public/database/biblioteca.db` (WAL, FK). Compatible **DB Browser for SQLite** (abrir/cambiar/editar). `server.js` usa `Database(biblioteca.db)` + `initDB()` que crea tablas e índices si no existen. Eliminada dependencia `mysql2`.
- **Usuarios seed con permisos:**
  - `admin@qnx.local` / `Admin123!` rol `admin` (todos los permisos)
  - `visitante@qnx.local` / `visitante123` rol `visitante` (solo lectura/préstamos)
  - Hash `bcryptjs` 10, insertados al iniciar si no existen. Registro `POST /api/auth/register` persiste en SQLite (rol visitante por defecto; solo admin puede crear admin).
- **Roles:** middleware `requireAdmin` protege `POST/PUT/DELETE /api/libros`, `POST /api/upload`, `GET /api/usuarios`, `DELETE /api/usuarios/:id`, `PUT /api/usuarios/:id/rol`, `GET /api/prestamos` global. Visitante recibe `403` en CRUD libros.
- **Gestión usuarios:** nuevos endpoints admin `GET /api/usuarios`, `DELETE /api/usuarios/:id`, `PUT /api/usuarios/:id/rol` + `GET /api/auth/me`. Frontend `catalogo.js` oculta form y botones Editar/Eliminar si no es admin.
- **BAT sin terminal bloqueada:** reescrito `Iniciar QNX Library v2.5.bat` con `powershell Start-Process -WindowStyle Hidden` → cerrar la ventana NO mata localhost (queda `node.exe` oculto). Eliminado `Detener QNX Library v2.4.bat` como solicitado. Se indica detener vía Administrador de tareas o `taskkill`.
- **.env:** simplificado a `SERVER_PORT`, `DB_PATH`, `JWT_SECRET` (sin DB_HOST/USER).
- **Schema:** `public/database/schema.sql` reescrito para SQLite (TEXT, CHECK rol, índices) + notas DB Browser.
- **Package:** `qnx-library@2.5.0` `better-sqlite3 9.2.2` reemplaza `mysql2`.

## [v2.4.0] - 2026-08-28 - MySQL Auth + Préstamos
- Auth JWT + validación + prestamos + catálogo avanzado (ver README v2.4)

## [v2.3.0] - Clásico + 24 libros
## [v2.2.0] - Híbrido clásico
## [v2.1.0] - Dark Neon

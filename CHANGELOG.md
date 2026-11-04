# Changelog - QNX Library

## [v3.0.0] - 2026-11-03

- API e interfaz compartidas, SQLite/portadas privados y catalogo estatico de solo lectura.
- Corregidos los hallazgos criticos, altos y medios de la auditoria: permisos,
  sesiones revocables, validacion, concurrencia, XSS, portadas y entorno nativo.
- Migraciones SQL con SHA-256 y esquema generado; stock consistente y vencimientos UTC.
- Backups completos verificados, restauracion probada y nueva epoca de sesion.
- Logs JSON sin datos sensibles, cierre ordenado y plantillas HTTPS/systemd.
- CI con navegador, auditoria de dependencias, Gitleaks y Dependabot semanal.
- Documentacion operativa y criterios minimos de uso real con pruebas.
- Cambio incompatible: no hay cuentas demo de servidor, se invalidan JWT antiguos
  y el modo estatico ya no ofrece escritura ni autenticacion local.


## [v2.5.0] - 2026-08-28 - SQLite + Admin/Visitante + DB Browser + BAT oculto

**Base:** v2.4 MySQL

- **Migración MySQL → SQLite (`sqlite3` + `sqlite`):** archivo `public/database/biblioteca.db` (WAL, FK). Compatible **DB Browser for SQLite**. `server.js` usa `open(biblioteca.db)` + `initDB()` que crea tablas e índices si no existen. Eliminada dependencia `mysql2`.
- **Usuarios seed con permisos:**
  - `admin@qnx.local` / `Admin123!` rol `admin` (todos los permisos)
  - `visitante@qnx.local` / `visitante123` rol `visitante` (solo lectura/préstamos)
  - Hash `bcryptjs` 10, insertados al iniciar si no existen. Registro persiste en SQLite (rol visitante por defecto; solo admin puede crear admin).
- **Roles:** middleware `requireAdmin` protege `POST/PUT/DELETE /api/libros`, `POST /api/upload`, `GET /api/usuarios`, `DELETE /api/usuarios/:id`, `PUT /api/usuarios/:id/rol`, `GET /api/prestamos` global. Visitante recibe `403` en CRUD libros.
- **Gestión usuarios:** nuevos endpoints admin `GET /api/usuarios`, `DELETE /api/usuarios/:id`, `PUT /api/usuarios/:id/rol` + `GET /api/auth/me`. Frontend `catalogo.js` oculta form y botones si no es admin.
- **BAT sin terminal bloqueada:** reescrito `Iniciar QNX Library v2.5.bat` con `powershell Start-Process -WindowStyle Hidden` → cerrar la ventana NO mata localhost (queda `node.exe` oculto). Eliminado `Detener QNX Library v2.4.bat`.
- **.env:** simplificado a `SERVER_PORT`, `DB_PATH`, `JWT_SECRET`.
- **Schema:** `public/database/schema.sql` reescrito para SQLite (TEXT, CHECK rol)
- **Package:** `qnx-library@2.5.0` `sqlite3 5.1.7` reemplaza `mysql2`.

## [v2.4.0] - 2026-08-28 - MySQL Auth + Préstamos
- Auth JWT + validación + prestamos + catálogo avanzado

## [v2.3.0] - Clásico + 24 libros
## [v2.2.0] - Híbrido clásico
## [v2.1.0] - Dark Neon

# Changelog - QNX Library Project

Todos los cambios notables por versión (tags).

---

## [v2.4.0] - 2026-08-28 - Auth + Préstamos + Catálogo avanzado

**Base:** v2.3.0 (24 libros, diseño clásico #0B1C2B/#C9A86A se mantiene)

### Críticas de Claude corregidas

| Crítica v2.3 | Solución v2.4 |
|--------------|---------------|
| Login/registro solo HTML sin backend | `POST /api/auth/register` + `POST /api/auth/login` + `GET /api/auth/me`, tabla `Usuarios` real, `bcryptjs` (hash 10 rounds), `JWT` (7d), `fetch` en `auth.js`, `localStorage` token |
| Rutas sin protección | `authMiddleware` verifica `Bearer` en `POST/PUT/DELETE /api/libros`, `POST /api/upload`, `POST/GET /api/prestamos` |
| Sin validación inputs | `validarLibro()` y `validarRegistro()`: titulo/autor min 2, anio 1000-2100, stock 0-999, email regex, password min 6 |
| `mysql2` callbacks | Migrado a `mysql2/promise` con `createPool` + `async/await` + `try/catch` |

### Funcionalidad catálogo nueva
- **Buscador/filtro:** `?search=` (titulo/autor/genero LIKE), `?genero=` exacto, `?disponible=0/1`
- **Paginación:** `?page` + `?limit` (max 50), respuesta `{data,total,page,totalPages}`
- **Ordenar columnas:** click en `<th data-sort>` alterna `asc/desc`
- **CRUD desde frontend:** botones Editar/Eliminar + form crear/editar con subida portada (`multer` → `/uploads`)
- **Página detalle:** `libro.html?id=X` + `GET /api/libros/:id`
- **Disponibilidad:** `disponible` + `stock` en `Libros`, 3 libros agotados

### Sistema préstamos
- **Tabla `Prestamos`:** `id, usuario_id FK, libro_id FK, fecha_prestamo, fecha_devolucion, estado`
- **Endpoints:** `POST /api/prestamos`, `GET /api/prestamos/mis`, `PUT /api/prestamos/:id/devolver`, `GET /api/prestamos`

### UX
- Toast, modal delete, loading spinner, manejo errores visible

### Otros
- `.env` agrega `JWT_SECRET` y `JWT_EXPIRES_IN`
- Rate limiting `express-rate-limit` en `/api/auth/*` (20 req / 15 min)
- Subida portada `multer` + `POST /api/upload` → `/uploads`

### Migración desde v2.3
- `npm install` (nuevas deps)
- Re-ejecutar `schema.sql` (agrega columnas `disponible,stock,imagen_url` + tabla `Prestamos`)

---

## [v2.3.0] - 2026-08-26 - Clásico + 24 libros

**Base:** v2.2.0 (diseño clásico se mantiene)

### Novedades
- **Base de datos ampliada:** `public/database/schema.sql` pasa de **4 a 24 libros** (+20)
- **Mantiene diseño v2.2:** paleta #0B1C2B + dorado, hero searchbar, grid `book` con top dorado alterno
- **Package:** `qnx-library@2.3.0`

---

## [v2.2.0] - 2026-08-26 - Híbrido Clásico (El Libro Total + UdeC)
- Rediseño a clásico elegante #0B1C2B/#C9A86A, hero searchbar, 4 accesos rápidos

---

## [v2.1.0] - 2026-08-26 - Dark Neon Edition
- Universo neon #0F172A/#2563EB, hero Q glow, 4 libros seed, CRUD Express

---

## Historial previo
- **v2.1 (2026-08-25)** - Biblioteca DK básica
- **v2.0 (2026-08-25)** - Estructura `public/` + `.env.example`
- **v1.5 (2026-08-25)** - Config modular
- **v1.0 (2026-08-20)** - Init

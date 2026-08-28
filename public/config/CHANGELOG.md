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
- **Buscador/filtro:** `?search=` (titulo/autor/genero LIKE), `?genero=` exacto, `?disponible=0/1`, inputs + selects en `catalogo.html`, debounce 350ms
- **Paginación:** `?page` + `?limit` (max 50), respuesta `{data,total,page,limit,totalPages}`, controles `‹ 1 2 … N ›` en frontend
- **Ordenar columnas:** click en `<th data-sort>` alterna `asc/desc` (`id,titulo,autor,genero,anio,stock`)
- **CRUD desde frontend:** botones Editar/Eliminar en tabla + grid, form crear/editar con validación, `DELETE` con modal confirmación, `PUT` reutiliza form
- **Página detalle:** `libro.html?id=X` + `GET /api/libros/:id`, muestra stock/disponibilidad, botón Prestar
- **Disponibilidad:** columna `disponible` + `stock` en `Libros`, badge `Disponible/Agotado`, 3 libros seed agotados para probar

### Sistema préstamos
- **Tabla `Prestamos`:** `id, usuario_id FK, libro_id FK, fecha_prestamo, fecha_devolucion, fecha_devuelto, estado (activo/devuelto/vencido)`
- **Endpoints:** `POST /api/prestamos` (descuenta stock), `GET /api/prestamos/mis` (JOIN Libros), `PUT /api/prestamos/:id/devolver` (restaura stock), `GET /api/prestamos` (lista global)
- **Frontend:** botón "Prestar" en catálogo/detalle, vista `prestamos.html` con tabla y botón Devolver, bloqueo si ya prestado o sin stock

### UX/Frontend
- **Loading states:** `spinner` + `loading` en catálogo/detalle/préstamos, `skeleton` CSS
- **Manejo errores visible:** `.alert` en forms, `toast` global (`#toastBox`) success/error/info con animación
- **Toast/notificación:** `toast(msg,type)` en crear/editar/eliminar/prestar/devolver/login/registro
- **Modal confirmación:** `modal-backdrop` para delete, con Cancelar/Eliminar
- **Auth nav dinámica:** `updateNav()` muestra `Mis préstamos` + nombre + `Salir` si logueado, oculta Login/Registro

### Otros
- **.env.example:** agrega `JWT_SECRET` y `JWT_EXPIRES_IN`
- **Rate limiting:** `express-rate-limit` en `/api/auth/*` (20 req / 15 min)
- **Subida portada:** `multer` (`1.4.5-lts.1`) + `POST /api/upload` (3MB, solo `image/*`) → `/uploads/:filename` + campo `imagen_url` en Libros
- **Nuevos archivos:** `libro.html`, `prestamos.html`, `js/auth.js`, `js/catalogo.js`, `js/libro.js`, `js/prestamos.js`, `uploads/` (creado al iniciar)
- **Package:** `qnx-library@2.4.0` + deps `bcryptjs`, `jsonwebtoken`, `express-rate-limit`, `multer`

### Migración desde v2.3
- `npm install` (nuevas deps)
- Re-ejecutar `public/database/schema.sql` (agrega columnas `disponible,stock,imagen_url` e índices + tabla `Prestamos`; hace `DELETE FROM Libros` y re-inserta 24 con nuevos campos)
- Copiar `.env.example` → `.env` si no tienes `JWT_SECRET` (o agregar manualmente)

---

## [v2.3.0] - 2026-08-26 - Clásico + 24 libros

**Base:** v2.2.0 (diseño clásico se mantiene)

### Novedades
- **Base de datos ampliada:** `public/database/schema.sql` pasa de **4 a 24 libros** (+20):
  `1984`, `Rayuela`, `Ficciones`, `La casa de los espíritus`, `El amor en los tiempos del cólera`, `Crónica de una muerte anunciada`, `El túnel`, `Pedro Páramo`, `Como agua para chocolate`, `El Aleph`, `Orgullo y prejuicio`, `Moby Dick`, `El señor de los anillos: La Comunidad del Anillo`, `Harry Potter y la piedra filosofal`, `Dune`, `Fahrenheit 451`, `Crimen y castigo`, `El código Da Vinci`, `Los juegos del hambre`, `El psicoanalista`.
- **Mantiene diseño v2.2:** paleta #0B1C2B + dorado, hero searchbar, grid `book` con top dorado alterno, filtro `#filtroCatalogo`.
- **Ajustes menores:** `style.css` +12 B, `logo.svg` vuelve a versión detallada 2085 B, footer actualizado.
- **Package:** `qnx-library@2.3.0`.

---

## [v2.2.0] - 2026-08-26 - Híbrido Clásico (El Libro Total + UdeC)

- Rediseño a clásico elegante #0B1C2B/#C9A86A, hero searchbar, 4 accesos rápidos, grid books, filtro.
- 9 archivos, 338 ins / 846 del vs v2.1.

---

## [v2.1.0] - 2026-08-26 - Dark Neon Edition

- Universo neon #0F172A/#2563EB, hero Q glow, 4 libros seed, CRUD Express.

---

## Historial previo
- **v2.1 (2026-08-25)** - Biblioteca DK básica
- **v2.0 (2026-08-25)** - Estructura `public/` + `.env.example`
- **v1.5 (2026-08-25)** - Config modular
- **v1.0 (2026-08-20)** - Init

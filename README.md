# QNX Library Project

Biblioteca virtual **Express + MySQL** - Colección digital QNX. **v2.4** incorpora auth real, préstamos y catálogo avanzado.

Repositorio: https://github.com/DereckYQL/QNX-Library-Project  
Demo Pages: https://dereckyql.github.io/QNX-Library-Project/

## Novedades v2.4 (vs v2.3)

- **Auth real:** `POST /api/auth/register` y `/api/auth/login` con `bcryptjs` + `JWT`, tabla `Usuarios` con `rol`, rate-limit `express-rate-limit` (20/15min), middleware que protege POST/PUT/DELETE y préstamos.
- **Validación:** `titulo`/`autor` obligatorios, `anio` 1000-2100, `stock` 0-999, `genero` texto, `email` regex, `password` min 6.
- **mysql2/promise + async/await:** pool `mysql2/promise`, `pool.query` con await, fallback en memoria si MySQL cae.
- **Catálogo avanzado:** buscador por `?search=`, filtro `genero` y `disponible`, orden click en `<th>` (`sort`+`order`), paginación `?page&limit` (respuesta `{data,total,page,totalPages}`), `GET /api/libros/generos`.
- **CRUD desde frontend:** botones Editar/Eliminar en tabla y grid, form crear/editar con subida de portada (`multer` → `/uploads` + `imagen_url`), modal confirmación delete, toast notificaciones, loading spinner.
- **Detalle libro:** `libro.html?id=XX` y `GET /api/libros/:id` con stock/disponibilidad.
- **Préstamos:** tabla `Prestamos` (FK usuario/libro, `fecha_prestamo`, `fecha_devolucion`, `estado`), `POST /api/prestamos`, `GET /api/prestamos/mis`, `PUT /api/prestamos/:id/devolver`, descuenta/restaura `stock` y `disponible`, botón "Prestar" en catálogo/detalle, vista `prestamos.html`.
- **UX:** `toast` (success/error/info), `modal` delete, `loading` + `spinner`, manejo errores visible (alerts), responsive mejorado.
- **.env:** agregado `JWT_SECRET` y `JWT_EXPIRES_IN`.
- **24 libros** ahora con `disponible` + `stock` + `imagen_url` (3 agotados para probar préstamos).

## Localhost - Cómo ejecutar

### Requisitos
- Node.js 18+ (`node -v`) y npm
- MySQL 9.7 (servicio `MySQL97` en `localhost:3306`) o XAMPP

### 1) Clonar y entrar
```bash
git clone https://github.com/DereckYQL/QNX-Library-Project.git
cd QNX-Library-Project
# si usas la carpeta suelta:
cd "QNX-Library v2.4"
```

### 2) Configurar .env
```bash
copy .env.example .env
# edita JWT_SECRET si quieres (ya tiene uno por defecto para dev)
```
Contenido `.env`:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=biblioteca
DB_PORT=3306
SERVER_PORT=3000
JWT_SECRET=qnx_library_secret_2026_cambia_en_produccion
JWT_EXPIRES_IN=7d
```

### 3) Instalar dependencias
```bash
npm install
# instala express, mysql2, cors, dotenv, bcryptjs, jsonwebtoken, express-rate-limit, multer
```

### 4) Inicializar base de datos (24 libros + nuevas tablas v2.4)
```bash
"C:\Program Files\MySQL\MySQL Server 9.7\bin\mysql.exe" -u root -proot biblioteca < public/database/schema.sql
# o desde Workbench/phpMyAdmin -> importar public/database/schema.sql
```
Verifica:
```bash
"C:\Program Files\MySQL\MySQL Server 9.7\bin\mysql.exe" -u root -proot -e "USE biblioteca; SHOW TABLES; SELECT COUNT(*) FROM Libros; SELECT COUNT(*) FROM Usuarios; SHOW CREATE TABLE Prestamos;"
# debe dar 24 libros, tablas Libros/Usuarios/Prestamos
```

### 5) Iniciar servidor
```bash
npm start
# Servidor en http://localhost:3000
# Conectado a MySQL (pool) o "fallback en memoria" si MySQL apagado
```

### 6) Probar
- http://localhost:3000 -> Inicio v2.4
- http://localhost:3000/catalogo.html -> buscador + filtros + paginación + ordenar + CRUD
- http://localhost:3000/libro.html?id=1 -> detalle + prestar
- http://localhost:3000/prestamos.html -> mis préstamos (requiere login)
- http://localhost:3000/api/libros -> JSON (con paginación si usas ?page=1&limit=8)
- http://localhost:3000/api/libros?search=garcia&genero=Novela&sort=anio&order=desc&page=1&limit=5
- http://localhost:3000/api/health -> { status: "ok", db: "mysql" }

> **Fallback:** Si MySQL no está disponible, `public/js/server.js` usa datos en memoria (24 libros + usuarios/préstamos en memoria). POST/PUT/DELETE y auth funcionan en modo fallback (sin persistencia).

### Flujo auth + préstamos (curl)
```bash
# registro
curl -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d "{\"nombre\":\"Test\",\"email\":\"test@test.com\",\"password\":\"123456\"}"
# login
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"test@test.com\",\"password\":\"123456\"}"
# -> guarda token
# prestar (con token)
curl -X POST http://localhost:3000/api/prestamos -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" -d "{\"libro_id\":1}"
# mis prestamos
curl http://localhost:3000/api/prestamos/mis -H "Authorization: Bearer <TOKEN>"
# devolver
curl -X PUT http://localhost:3000/api/prestamos/1/devolver -H "Authorization: Bearer <TOKEN>"
```

## Estructura
```
public/
  index.html          # Inicio + destacados
  catalogo.html       # Catálogo avanzado (filtros, paginación, CRUD)
  libro.html          # Detalle libro + prestar
  prestamos.html      # Mis préstamos
  login.html / registro.html  # Auth JWT
  css/style.css       # Estilos + toast/modal/loading/pagination
  js/
    script.js         # Global: toast, auth nav, destacados, hero search
    auth.js           # Login/registro fetch
    catalogo.js       # Filtros, sort, paginación, CRUD, prestar, modal
    libro.js          # Detalle + prestar
    prestamos.js      # Listar/devolver préstamos
    server.js         # Express + MySQL2/promise + JWT + Prestamos + Upload
  database/schema.sql # 24 libros + Usuarios + Prestamos
  uploads/            # Portadas subidas (multer)
  img/logo.svg
```

## Stack
- Backend: `public/js/server.js` Express 4.19.2 + mysql2/promise 3.10.0 + cors + dotenv + bcryptjs + jsonwebtoken + express-rate-limit + multer
- Frontend: HTML5/CSS3/JS vanilla (fetch + localStorage JWT)
- DB: MySQL `Libros(id,titulo,autor,genero,anio,disponible,stock,imagen_url)` + `Usuarios(id,nombre,email,password,rol)` + `Prestamos(id,usuario_id,libro_id,fecha_prestamo,fecha_devolucion,estado)`

## Versiones (tags)

| Tag | Descripción |
|-----|-------------|
| `v2.4.0` | **Auth JWT + Préstamos + Catálogo avanzado + Validación + mysql2/promise** |
| `v2.3.0` | Clásico + 24 libros |
| `v2.2.0` | Híbrido clásico #0B1C2B/dorado |
| `v2.1.0` | Dark Neon |

Ver `CHANGELOG.md` para detalle.

## Troubleshooting
- `EADDRINUSE 3000`: `netstat -ano | findstr 3000` y matar proceso o cambiar `SERVER_PORT` en `.env`
- `Access denied root@localhost`: password es `root` en MySQL97; revisa `my.ini`
- `Unknown column disponible/stock`: re-importa `schema.sql` v2.4 (DROP + CREATE)
- `Cannot find module bcryptjs/jsonwebtoken`: ejecuta `npm install` en la raíz donde está `package.json`
- `Token invalido`: re-loguea; verifica `JWT_SECRET` coincide entre `.env` y servidor
- `Solo imagenes permitidas` / `File too large`: multer limita a 3MB y solo `image/*`

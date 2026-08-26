# QNX Library Project

Biblioteca virtual modular **Express + MySQL** - Colección digital QNX.


## Localhost 
- http://localhost:3000 -> Inicio v2.3 (hero clásico)
- http://localhost:3000/catalogo.html -> tabla + filtro
- http://localhost:3000/api/libros -> JSON 24 libros
- http://localhost:3000/api/health -> { status: "ok", db: "mysql" }

## Estructura

```
public/
  index.html          # Inicio
  catalogo.html       # Catálogo con filtro #filtroCatalogo
  login.html / registro.html
  css/style.css
  js/
    script.js         # fetch /api/libros + fallback 3 libros + filtro
    server.js         # Express + MySQL + fallback 24 libros
  config/package.json
  database/schema.sql # 24 libros v2.3
  img/logo.svg
```

## Stack

- Backend: `public/js/server.js:1` Express 4.19.2 + mysql2 3.10.0 + cors + dotenv
- Frontend: HTML5/CSS3/JS (`public/js/script.js:1` cargarLibros)
- DB: MySQL `Libros(id,titulo,autor,genero,anio)` + `Usuarios`

## Versiones (tags)

| Tag | Descripción |
|-----|-------------|
| `v2.1.0` | Dark Neon - #0F172A/#2563EB, hero Q glow, 4 libros |
| `v2.2.0` | Híbrido El Libro Total + UdeC - navy #0B1C2B/dorado, searchbar, 4 accesos, filtro |
| `v2.3.0` | Clásico + 24 libros - mismo diseño + 20 libros extra |

Ver `CHANGELOG.md` y releases para detalle.

## Troubleshooting localhost

- `EADDRINUSE 3000`: `netstat -ano | findstr 3000` y matar proceso o cambiar `SERVER_PORT` en `.env`
- `Access denied root@localhost`: password es `root` en este instalador MySQL97; revisa `my.ini`
- `Unknown column anio`: re-importa `schema.sql` (DROP + CREATE resuelve)
- `Cannot find module mysql2`: ejecuta `npm install` en la raíz donde está `package.json`

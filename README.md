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


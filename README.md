# QNX Library Project

Biblioteca virtual modular con **Express + MySQL** - Colección digital QNX.

Repositorio oficial: https://github.com/DereckYQL/QNX-Library-Project  
Demo Pages: https://dereckyql.github.io/QNX-Library-Project/

## Estructura

\\\
public/
  index.html          # Inicio (hero + destacados)
  catalogo.html       # Catálogo con tabla/filtro
  login.html          # Login
  registro.html       # Registro
  css/style.css       # Estilos (versión según tag)
  js/
    script.js         # Lógica frontend (fetch /api/libros)
    server.js         # Backend Express + MySQL
  config/package.json # Config npm
  database/schema.sql # Schema MySQL + seed
  img/logo.svg        # Logo QNX
\\\

## Stack

- **Backend:** Node.js + Express 4.19.2 + mysql2 3.10.0 + cors + dotenv
- **Frontend:** HTML5 / CSS3 / Vanilla JS
- **DB:** MySQL - tablas \Libros\ y \Usuarios\

## Versiones (tags)

| Tag | Fecha | Descripción |
|-----|-------|-------------|
| \2.1.0\ | 2026-08-26 | **Dark Neon Edition** - universo visual QNX oscuro, luminoso y futurista. Paleta #0F172A/#2563EB/#60A5FA, hero Q gigante con glow radial, 4 libros seed. |
| \2.2.0\ | 2026-08-26 | **Híbrido Clásico** - rediseño completo inspirado en *El Libro Total* + *Bibliotecas UdeC*. Paleta navy #0B1C2B + dorado #C9A86A, hero con searchbar, 4 accesos rápidos, filtro catálogo. |
| \2.3.0\ | 2026-08-26 | **Clásico + 24 libros** - mismo diseño v2.2 + BBDD ampliada de 4 a 24 libros (clásicos, fantasía, sci-fi). Ajustes CSS/Logo sutiles. |

Ver [CHANGELOG.md](CHANGELOG.md) para novedades detalladas.

## Instalación local

\\\ash
npm install
# configurar .env con DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, SERVER_PORT
npm start
# http://localhost:3000
\\\

## Tags y releases

Cada versión está publicada como **tag anotado** y **release** en GitHub con sus novedades:

\\\ash
git fetch --tags
git checkout v2.3.0   # última versión
git checkout v2.2.0
git checkout v2.1.0
\\\


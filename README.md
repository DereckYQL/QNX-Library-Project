# QNX Library Project

Biblioteca virtual modular **Express + MySQL** - Colección digital QNX.

Repositorio: https://github.com/DereckYQL/QNX-Library-Project  
Demo Pages: https://dereckyql.github.io/QNX-Library-Project/

## Localhost - Cómo ejecutar

### Requisitos
- Node.js 18+ (`node -v`) y npm
- MySQL 9.7 (servicio `MySQL97` en `localhost:3306`) o XAMPP

### 1) Clonar y entrar al proyecto unificado
```bash
git clone https://github.com/DereckYQL/QNX-Library-Project.git
cd QNX-Library-Project
```

### 2) Configurar .env
```bash
copy .env.example .env
# editar si tu password no es "root"
```
Contenido `.env` por defecto (ya funciona en este PC):
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=biblioteca
DB_PORT=3306
SERVER_PORT=3000
```

### 3) Instalar dependencias
```bash
npm install
# instala en ./node_modules (express, mysql2, cors, dotenv)
```

### 4) Inicializar base de datos (24 libros v2.3)
```bash
# Opción A: con cliente MySQL 9.7
"C:\Program Files\MySQL\MySQL Server 9.7\bin\mysql.exe" -u root -proot biblioteca < public/database/schema.sql

# Opción B: desde MySQL Workbench / phpMyAdmin -> importar public/database/schema.sql
```
Verifica:
```bash
"C:\Program Files\MySQL\MySQL Server 9.7\bin\mysql.exe" -u root -proot -e "USE biblioteca; SELECT COUNT(*) FROM Libros;"
# debe dar 24
```

### 5) Iniciar servidor
```bash
npm start
# Servidor en http://localhost:3000
# Conectado a MySQL  (o "usando fallback en memoria" si MySQL está apagado)
```

### 6) Probar
- http://localhost:3000 -> Inicio v2.3 (hero clásico)
- http://localhost:3000/catalogo.html -> tabla + filtro
- http://localhost:3000/api/libros -> JSON 24 libros
- http://localhost:3000/api/health -> { status: "ok", db: "mysql" }

> **Fallback:** Si MySQL no está disponible, `public/js/server.js:11` usa 24 libros en memoria (`fallbackLibros`) para que el frontend siempre funcione. Los `POST/PUT/DELETE` requieren MySQL.

### Ejecutar versiones antiguas (tags)
```bash
git fetch --tags
git checkout v2.1.0  # Dark Neon
npm install; npm start  # http://localhost:3000

git checkout v2.2.0  # Híbrido clásico
git checkout v2.3.0  # Clásico + 24 libros (actual)
git checkout master  # última
```

Carpetas sueltas `QNX-Library-Project-2.1` / `2.2` / `2.3` también funcionan copiando su `public/config/package.json` a `./package.json` y su `.env`.

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

# QNX Library

Biblioteca virtual con Node.js, Express y MySQL.

## Requisitos

- Node.js
- MySQL

## Configuración

1. Crea un archivo `.env` en la raíz con tus datos de MySQL:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contrasena
DB_NAME=biblioteca
DB_PORT=3306
SERVER_PORT=3000
```

2. Crea la base de datos:

```
mysql -u root -p < schema.sql
```

3. Instala dependencias:

```
npm install
```

4. Inicia el servidor:

```
npm start
```

5. Abre en el navegador:

```
http://localhost:3000
```

## Estructura

```
├── index.html
├── catalogo.html
├── registro.html
├── login.html
├── style.css
├── script.js
├── server.js
├── schema.sql
├── package.json
├── .env.example
└── .env
```

## API REST

| Método | Ruta              | Descripción              |
|--------|-------------------|--------------------------|
| GET    | /api/libros       | Obtener todos los libros |
| GET    | /api/libros/:id   | Obtener un libro por ID  |
| POST   | /api/libros       | Registrar un nuevo libro |
| PUT    | /api/libros/:id   | Actualizar un libro      |
| DELETE | /api/libros/:id   | Eliminar un libro        |

# QNX Library Beta

Sistema de gestion de biblioteca virtual.

## Requisitos

- Node.js
- MySQL

## Crear la base de datos

Desde la terminal, en la raiz del proyecto:

```
mysql -u root -p < schema.sql
```

Esto crea la base de datos `biblioteca`, la tabla `Libros` y carga los cuatro libros de ejemplo.

## Iniciar el servidor

```
npm install
npm start
```

El servidor corre en http://localhost:3000

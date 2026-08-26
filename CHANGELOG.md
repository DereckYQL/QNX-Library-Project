# Changelog - QNX Library Project

Todos los cambios notables por versión (tags).

---

## [v2.3.0] - 2026-08-26 - Clásico + 24 libros

**Base:** v2.2.0 (diseño clásico se mantiene)

### Novedades
- **Base de datos ampliada:** \public/database/schema.sql\ pasa de **4 a 24 libros** (+20):
  \1984\, \Rayuela\, \Ficciones\, \La casa de los espíritus\, \El amor en los tiempos del cólera\, \Crónica de una muerte anunciada\, \El túnel\, \Pedro Páramo\, \Como agua para chocolate\, \El Aleph\, \Orgullo y prejuicio\, \Moby Dick\, \El señor de los anillos: La Comunidad del Anillo\, \Harry Potter y la piedra filosofal\, \Dune\, \Fahrenheit 451\, \Crimen y castigo\, \El código Da Vinci\, \Los juegos del hambre\, \El psicoanalista\.
- **Mantiene diseño v2.2:** paleta #0B1C2B + dorado, hero searchbar, grid \ook\ con top dorado alterno, filtro \#filtroCatalogo\.
- **Ajustes menores:** \style.css\ +12 B, \logo.svg\ vuelve a versión detallada 2085 B (igual que v2.1 neon pero header navy clásico), footer actualizado a v2.3.
- **Package:** \qnx-library@2.3.0\ - descripción "Diseño clásico v2.2 + 24 libros".
- **8 archivos cambiados:** 63 ins / 16 del vs v2.2.

### Migración desde v2.2
- Re-ejecutar \schema.sql\ para obtener 24 libros, o hacer INSERT incremental.

---

## [v2.2.0] - 2026-08-26 - Híbrido Clásico (El Libro Total + UdeC)

**Base:** v2.1 dark neon (reemplazo total)

### Novedades
- **Rediseño visual completo:** de neon oscuro a clásico elegante.
  - Paleta nueva: **#0B1C2B navy, #C9A86A dorado, blanco** (vs #0F172A/#1E3A8A/#2563EB/#60A5FA).
  - \style.css\: **6345 B** vs 14806 B (-57% / -716 líneas), más ligero y minimalista.
  - Logo: de gradiente neon 2085 B a flat clásico **821 B** (\#0B1C2B\ + dorado).
- **Hero nuevo:** título "Biblioteca clásica y digital" + **searchbar** con input "¿Qué buscas hoy?" + botón Buscar (redirige a catálogo).
- **Accesos rápidos (UdeC):** grilla 4 cards: *Horarios, Préstamo, Reservas, Certificado* con iconos SVG stroke (vs destacados neon).
- **Libros destacados:** nueva grilla \grid-books\ + componente \.book\ (\ook-top\ + \ook-body\ + \	ag\), top dorado alterno \gold\ cada 2º libro.
- **Script.js:** + lógica fallback si API vacía/error (3 libros hardcodeados) + filtro en vivo \#filtroCatalogo\ (input event filtra filas tabla).
- **Catálogo:** tabla simplificada cabecera navy/borde dorado + **filtro + botón Limpiar**.
- **Login/Registro:** simplificados, sin glass/glow, cabecera compacta.
- **9 archivos:** 338 ins / 846 del net vs v2.1.
- **Package:** rename \iblioteca_dk@2.1.0\ → \qnx-library@2.2.0\ + descripción híbrida.

### Breaking
- Estética incompatible con v2.1 (cambio total CSS/HTML). No hay migración automática de temas.

---

## [v2.1.0] - 2026-08-26 - Dark Neon Edition

**Base:** v2.1 anterior (Biblioteca DK simple, 2145 B CSS)

### Novedades
- **Universo visual QNX neon:** oscuro, luminoso, futurista.
  - Paleta **#0F172A, #1E3A8A, #2563EB, #60A5FA** (mostrada en footer).
  - \style.css\ **14806 B** (+127% vs 2145 B) con glass, glow azul, gradientes, cards neon.
- **Hero premium:** Q gigante con glow radial (\adialGradient #hg\), libro central con pitch + "pixeles" flotantes, wordmark QNX LIBRARY con divider, badge "Sistema v2.1 — Colección digital", CTA "Explorar catálogo →" + "Crear cuenta".
- **Header brand SVG:** Q + libro + pixeles mini con linearGradients.
- **Libros destacados:** \card-grid\ + \card\ neon con fetch \/api/libros\.
- **Catálogo:** \	able-wrap + tabla-libros\ con estética glass + glow azul.
- **4 libros seed:** \schema.sql\ 4 inserts (Cien años..., Don Quijote, Sombra del viento, Principito).
- **Backend:** \server.js\ Express CRUD completo (\GET /api/libros, GET /:id, POST, PUT, DELETE\) + MySQL.
- **Package:** \iblioteca_dk@2.1.0\, dependencies express, mysql2, cors, dotenv.

### Nota
- Este tag reemplaza el contenido previo de v2.1 (Biblioteca DK básica) con la edición neon completa.

---

## Historial previo (remoto)

- **v2.1 (2026-08-25)** - Biblioteca DK básica (2145 B CSS, hero simple).
- **v2.0 (2026-08-25)** - Estructura \public/\ + \.env.example\ + README.
- **v1.5 (2026-08-25)** - Config modular + package-lock 968 líneas.
- **v1.0 (2026-08-20)** - Init: index, style 67 líneas, server vacío.


# Operacion de QNX Library 3.0

## Dos modos

`npm start` ejecuta la biblioteca compartida: cuentas, permisos, prestamos y
portadas pertenecen a SQLite privado. Publicar exclusivamente `public/` en un
hosting estatico proporciona un catalogo de demostracion de solo lectura.
Una falla de API nunca activa una base local alternativa.

## Instalacion y variables

Usa Node 26.12.0 (`.node-version`) y ejecuta `npm ci`, `npm run check:runtime` y
`npm run schema:check`. En sistemas sin binarios precompilados de SQLite se
requieren Python y compilador C/C++. No copies `node_modules` entre plataformas.

Copia `.env.example` a `.env`, con permisos de lectura solo para el operador.
Genera un JWT_SECRET nuevo con `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

| Variable | Valor inicial / funcion |
| --- | --- |
| SERVER_HOST | 127.0.0.1; interfaz donde escucha la API |
| SERVER_PORT | 3000; puerto local |
| DB_PATH | data/biblioteca.db; fuera de public, tambien tras resolver symlinks |
| JWT_SECRET | obligatorio, al menos 32 caracteres, sin valores de ejemplo |
| JWT_EXPIRES_IN | 7d; duracion del token |
| TRUST_PROXY | vacio; usa loopback solo con un proxy local confiable |
| BACKUP_DIR | data/backups por defecto, siempre fuera de public |

Inicia con `npm start` y crea el administrador con el comando de stdin explicado
en el README. No hay cuentas administrativas predeterminadas. Las contrasenas
no se pasan como argumentos del proceso ni se imprimen en logs.

## Migraciones y actualizacion desde 2.x

Deten la version anterior y guarda un backup antes de cambiar el codigo. Si la
base sigue en public/database, conserva biblioteca.db y sus archivos -wal/-shm,
muevelos a data y actualiza DB_PATH; no copies solo el archivo principal de una
base abierta. Nunca publiques esos archivos ni las portadas privadas en Git.

La fuente de verdad es `database/migrations/*.sql`. El inicio aplica cada
migracion en una transaccion y registra su nombre y SHA-256 en SchemaMigrations.
Las columnas existentes de instalaciones previas se adoptan sin destruir tablas.
No modifiques migraciones ya aplicadas: agrega otra. `database/schema.sql` se
genera con `npm run schema:write`; CI exige que coincida con los archivos fuente.
El seed se aplica una sola vez y no restaura cuentas ni datos borrados.

Si hay prestamos pendientes duplicados o inventario invalido, la migracion se
detiene: conserva el backup y corrige esos datos de forma supervisada. No se
borra historial automaticamente para conseguir que el inicio pase.

La version 3.0 rechaza los JWT antiguos sin epoca de sesion. Los cambios de rol
y las bajas revocan sesiones inmediatamente. Las cuentas demo heredadas con
contrasenas conocidas se deshabilitan al iniciar. Los datos locales del navegador
se conservan para recuperacion y no se importan automaticamente al servidor.

## HTTPS y recuperacion del proceso

`deploy/Caddyfile` configura un proxy local y HTTPS automatico para un dominio
real. Configura QNX_DOMAIN, su DNS y los puertos 80/443. La API debe seguir en
127.0.0.1:3000; usa TRUST_PROXY=loopback para obtener el protocolo y la IP real
del proxy confiable. No expongas directamente el puerto de Node a Internet.
La aplicacion incluye CSP y nosniff; agrega HSTS cuando la solicitud es HTTPS.
CORS no habilita origenes externos. El estado /api/health solo devuelve salud,
version y numero de libros, sin rutas privadas ni usuarios.

Los archivos `deploy/qnx-library.service`, `qnx-backup.service` y
`qnx-backup.timer` son plantillas para una instalacion en /opt/qnx-library con
usuario qnx y Node en /usr/bin/node. Ajusta usuario, rutas, ejecutable y
ReadWritePaths a tu servidor; no se instalan automaticamente en este equipo.
El servicio reinicia ante fallas, limita los reinicios y usa journal y umask 0077.
El timer hace un backup diario a las 03:15 con hasta cinco minutos de demora.

Se escriben logs JSON con evento, fecha, request_id, metodo, estado y duracion.
No se registran tokens, headers, cuerpos, correos ni valores de query. Los
request_id se devuelven en X-Request-ID para correlacionar fallas. SIGTERM/SIGINT
cierran el servidor y SQLite antes de liberar el lock privado de la base.

## Backups verificados

Ejecuta `npm run backup`. SQLite crea un snapshot consistente mediante VACUUM
INTO, incluyendo transacciones confirmadas en WAL. Se copian las portadas
referenciadas, tambien las de libros archivados. No se incluyen JWT_SECRET ni
.env: respalda esa configuracion por separado en un almacen seguro.

Cada backup es un directorio privado con database.db, uploads y manifest.json
que contiene SHA-256 de cada archivo. Se verifican integridad SQLite, claves
foraneas y hashes antes de informar exito. Si falta una portada referenciada,
el backup falla y elimina su salida incompleta. Las portadas antiguas de otras
instalaciones deben recodificarse mediante nueva subida antes del backup.

Guarda una copia cifrada fuera de la maquina. El timer no elimina backups:
aplica una politica de retencion y comprueba espacio disponible. El cifrado y
el almacenamiento externo dependen de la infraestructura del operador.

## Restauracion

Prueba primero un destino independiente:

```bash
npm run restore -- /ruta/backup --server-stopped --target data/ensayo/biblioteca.db
```

Para restaurar el servicio real, detenlo y ejecuta:

```bash
npm run restore -- /ruta/backup --server-stopped --replace
npm start
```

El comando rechaza un proceso activo, un backup corrupto, archivos no regulares,
rutas no permitidas o WAL/SHM pendientes. Un cierre limpio del servidor retira
los WAL/SHM; si hubo un crash, inicia y deten limpiamente antes de restaurar.
Si el destino existe, --replace crea primero otro backup para rollback. Los
archivos se preparan antes de reemplazar la base; no se sobreescriben portadas
con el mismo nombre y contenido distinto. La restauracion aplica migraciones
pendientes y genera una epoca de sesion nueva: los tokens previos dejan de valer.
Solo restaures backups de procedencia confiable.

## Inventario, vencimientos y bajas

El stock es entero y no negativo. Triggers mantienen disponible = (stock > 0)
incluso si un escritor SQL intenta establecer valores contradictorios.
Prestamos y devoluciones usan transacciones, control de duplicados y una cola
de escritores para no agotar los trabajadores de Node esperando locks.

Las fechas de devolucion son fechas de calendario UTC. La API devuelve vencido
cuando estado es activo y fecha_devolucion es anterior al dia UTC actual; no
requiere un proceso nocturno ni reescribe el historial. Activo y vencido siguen
siendo prestamos pendientes para bloquear duplicados y bajas. La devolucion
es atomica y se admite una sola vez. La interfaz conserva el dia de calendario
y muestra timestamps SQLite como UTC, tambien desde Chile.

DELETE archiva libros o desactiva usuarios; no purga su historial. Los prestamos
pendientes bloquean la baja. La purga de datos, restauracion de bajas y politicas
de retencion requieren procedimientos operativos separados.

## Portadas y mantenimiento

Se aceptan raster no animados PNG/JPEG/WebP/GIF hasta 3 MiB, 16 megapixeles y
12000 pixeles por lado. Se decodifican y producen WebP nuevos, hasta 1600x2400,
sin metadatos ni contenido anexado. El directorio privado no se publica completo.
`npm run cleanup-uploads` es dry-run. Para aplicar, deten el servidor, haz backup
y ejecuta `npm run cleanup-uploads -- --apply`. Conserva archivos referenciados
por libros archivados, recientes y symlinks; solo elimina huerfanos generados
de mas de 24 horas.

## Revision y repositorio

`npm run test:minimum` ejecuta runtime, esquema, pruebas y Chromium. El navegador
requiere ChromeDriver y Chromium; CHROMEDRIVER y CHROMIUM permiten cambiar rutas.
`npm audit` consulta avisos vigentes. Dependabot revisa npm y GitHub Actions cada
semana; no hay auto-merge de actualizaciones mayores.

Instala Gitleaks 8.30.1 desde su release oficial y verifica el archivo con los
checksums oficiales; `npm run scan:secrets` revisa el arbol y el historial con
redaccion de hallazgos. CI repite los controles y no recibe secretos de produccion.
Los ejemplos retirados que el servidor rechaza se exceptuan de forma exacta;
no se excluyen carpetas de pruebas ni todo el historial del analisis.

La publicacion de GitHub distribuye codigo, no despliega un servidor con tus
datos. Las bases de versiones antiguas pueden permanecer en el historial remoto;
retirar el archivo actual no lo borra del pasado ni invalida credenciales reales.

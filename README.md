# QNX Library 3.0

Biblioteca con catalogo, autenticacion, administracion y prestamos. Hay dos
modos explicitos:

- **Servidor:** Express + SQLite privado. La interfaz usa la API para usuarios,
  catalogo y prestamos compartidos entre navegadores. Los permisos se verifican
  en el servidor y las sesiones se revocan al eliminar usuarios o cambiar roles.
- **Estatico:** catalogo de demostracion de solo lectura, compatible con GitHub
  Pages/Cloudflare Pages. No admite cuentas, administracion ni prestamos. Los
  datos locales heredados se conservan; no se importan automaticamente a SQLite.

Express entrega `/js/runtime-config.js` con el modo servidor. El archivo del
mismo nombre en `public` configura el modo estatico. Un error de API nunca cambia
el modo ni sustituye datos compartidos por una base local.

## Estructura

```text
public/                HTML, CSS e interfaz del navegador
public/js/server.js    Entrada de Express; no se sirve por HTTP
public/js/data-api.js  Acceso compartido a la API
public/js/db.js        Catalogo estatico y preservacion de datos heredados
config/security.js     Validacion de rutas privadas y secreto JWT
database/migrations/   Fuente de verdad SQL con SHA-256
database/schema.sql    Esquema generado, comprobado por CI
data/                  SQLite privado, ignorado por Git
scripts/create-admin.js
tests/                Regresion de seguridad y prueba real de navegador
```

## Ejecutar el servidor

Requiere Node.js >=22.9 y dependencias nativas para el sistema operativo actual.
No copies `node_modules` desde otro sistema. Ejecuta `npm ci`; si no hay binario
precompilado de SQLite, necesitaras Python, compilador C/C++ y herramientas de
compilacion compatibles con node-gyp.

1. Copia `.env.example` a `.env`.
2. Genera un secreto con
   `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
   y asignalo a `JWT_SECRET`. No publiques el valor ni reutilices ejemplos.
3. Usa `DB_PATH=data/biblioteca.db`, siempre fuera de `public`.
4. Ejecuta `npm start` para inicializar el esquema y los 24 libros del catalogo.
5. Crea el primer administrador desde otra terminal (Bash):

```bash
read -r -s -p 'Nueva contrasena (16 caracteres minimo): ' QNX_ADMIN_PASSWORD
printf '\n'
printf '%s' "$QNX_ADMIN_PASSWORD" | ADMIN_EMAIL='tu-correo@example.org' ADMIN_NAME='Administrador' npm run create-admin
unset QNX_ADMIN_PASSWORD
```

La contrasena llega por stdin, no como argumento. El maximo es 72 bytes por el
limite de bcrypt. Un correo existente no se sobrescribe. Eliminar un administrador
no provoca su recreacion. No hay cuentas demo habilitadas en el servidor.

El registro web crea visitantes: contrasena minima de 12 caracteres y maxima de
72 bytes. Solo un administrador autenticado puede crear otros administradores.
Express escucha en `127.0.0.1`; configura `SERVER_HOST` expresamente si necesitas
otra interfaz. Para un despliegue externo usa HTTPS. CORS no habilita otros
origenes por defecto.

## Actualizar una instalacion anterior

Deten el servidor y haz un backup privado consistente antes de actualizar.
Si SQLite sigue en `public/database/`, mueve `biblioteca.db` y sus archivos
`-wal`/`-shm` a `data/`, conservando los nombres, y cambia `DB_PATH` en `.env`.
No ejecutes otras instancias durante la migracion.

El inicio agrega `auth_version`, un indice unico de prestamos pendientes y
restricciones que impiden stock negativo. No borra usuarios ni prestamos.
Si existen prestamos pendientes duplicados, el indice no puede crearse y el
servidor se detiene: revisa esos registros con un backup antes de resolverlos;
no se elimina historial automaticamente.

La version nueva de sesiones rechaza JWT anteriores sin version. Rota tambien
`JWT_SECRET` si fue publicado o se uso un secreto de ejemplo. Al iniciar se
retiran las contrasenas conocidas `Admin123!` y `visitante123`, preservando los
usuarios; usa el comando de alta administrativa para crear una cuenta segura.

Los datos antiguos del navegador no se borran cuando faltan cuentas demo o
cambian sus hashes. Un JSON corrupto produce un error y permanece intacto para
recuperacion. No uses esos datos ni roles locales como autoridad del servidor.

Los usuarios y libros se retiran mediante bajas logicas; los que tienen prestamos
pendientes no se pueden retirar hasta recibir la devolucion. Las devoluciones de prestamos activos
o vencidos se realizan una sola vez, de forma atomica.

Eliminar una base del arbol actual de Git no borra el historial remoto. Considera
expuestos los datos previamente publicados y rota sus credenciales.

## Pruebas

- `npm test`: entradas invalidas, rutas privadas, JWT y revocacion, preservacion
  local, prestamos concurrentes, doble devolucion, rollback y clientes aislados.
- `npm run test:browser`: flujo real de login, registro, alta de libro, prestamo y
  devolucion entre dos sesiones temporales de Chromium; prueba XSS, roles locales
  falsificados y modo estatico. Requiere `chromedriver` y `/usr/bin/chromium`,
  configurables mediante `CHROMEDRIVER` y `CHROMIUM`. No usa el perfil personal.
- `npm audit`: consulta avisos actuales del arbol de dependencias.

Las pruebas utilizan bases y servidores locales temporales. No modifican los
datos reales del proyecto.

## Endurecimiento de nivel medio

La interfaz construye los datos con nodos DOM y `textContent`, sin interpretar
HTML de libros o prestamos. Una CSP permite JavaScript solo del mismo origen y
bloquea scripts/eventos inline tanto en Express como en el HTML estatico. Se
mantienen los estilos inline existentes para conservar el aspecto de las paginas.

`DELETE /api/libros/:id` archiva el libro y `DELETE /api/usuarios/:id` desactiva la
cuenta mediante `deleted_at`; los registros y los prestamos devueltos permanecen.
Las bajas con prestamos activos o vencidos responden 409 hasta su devolucion.
Un usuario desactivado pierde sus sesiones y no puede iniciar sesion. No se
reutilizan automaticamente sus correos. No hay purga automatica del historial;
los triggers tambien impiden borrar directamente sus usuarios/libros asociados.

Las nuevas portadas deben ser PNG, JPEG, WebP o GIF no animado, de hasta 3 MiB,
16 megapixeles y 12000 pixeles por lado. Se decodifican y recodifican como WebP,
sin metadatos ni datos anexados, con salida maxima de 1600 x 2400 pixeles. Se
guardan en `uploads/` junto al archivo SQLite privado; Express solo publica los
nombres generados y el tipo `image/webp`. El directorio antiguo `public/uploads`
ya no se sirve: las portadas de otras instalaciones antiguas deben importarse
mediante una nueva subida para validarlas, conservando antes los originales.

`npm run cleanup-uploads` solo informa candidatos huerfanos de mas de 24 horas.
Para borrarlos expresamente, detén el servidor, guarda un backup y ejecuta
`npm run cleanup-uploads -- --apply`. Las referencias de libros archivados,
archivos recientes y enlaces simbolicos se conservan. No se ejecuta una purga
sobre los datos reales como parte de las pruebas.

Ya no se distribuye el helper SHA-256 de contrasenas ni se crean cuentas locales.
El servidor usa bcrypt con sal y coste 12. Los datos historicos del navegador
siguen intactos para recuperacion; las contrasenas antiguas no se importan ni se
convierten en cuentas del servidor.

Para reproducir el entorno, usa la version exacta de `.node-version`, ejecuta
`npm ci`, `npm run check:runtime` y `npm test`. El workflow `.github/workflows/ci.yml`
realiza esos pasos desde cero y consulta `npm audit`. CI ejecuta esas comprobaciones en GitHub al publicar cambios y semanalmente.


## Version 3.0: operacion y criterios de salida

Consulta [OPERACION.md](docs/OPERACION.md) para variables, migraciones, HTTPS,
supervision, backups programados y restauracion. Los [criterios minimos](docs/CRITERIOS_MINIMOS.md)
y la evidencia de la version se recogen en `VERSION_3_0.txt`.

- `npm run backup`: snapshot SQLite + portadas con manifest y SHA-256.
- `npm run restore -- RUTA --server-stopped --target data/ensayo/biblioteca.db`:
  ensayo de restauracion, con revocacion de sesiones previas.
- `npm run schema:check`: evita divergencias entre esquema y migraciones.
- `npm run test:minimum`: runtime, esquema, regresiones y Chromium.
- `npm run scan:secrets`: Gitleaks en el arbol y el historial (instalacion documentada).

Dependabot revisa dependencias y Actions semanalmente. CI ejecuta pruebas,
navegador, auditoria npm y Gitleaks. Las plantillas de `deploy/` se revisan y
adaptan antes de instalarlas; publicar el codigo no activa servicios en tu equipo.

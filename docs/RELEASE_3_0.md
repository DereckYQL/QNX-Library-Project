QNX Library 3.0 convierte el backend y la interfaz en una biblioteca compartida
con controles de acceso verificables y recuperacion probada.

- SQLite y portadas fuera de public; sin cuentas ni secretos predeterminados.
- Roles actuales, sesiones revocables, bajas logicas e historial conservado.
- Prestamos y devoluciones atomicos, stock consistente y vencimientos por fecha UTC.
- Portadas recodificadas, DOM seguro y CSP; catalogo estatico de solo lectura.
- Migraciones SQL versionadas con checksums y esquema generado.
- Backup completo verificado, restauracion y revocacion de tokens anteriores.
- Logs JSON sin credenciales, cierre ordenado, HTTPS y plantillas systemd.
- CI, Dependabot, auditoria de dependencias y deteccion de secretos.

Actualizacion desde 2.x: guarda un backup, mueve SQLite fuera de public, configura
un JWT_SECRET propio y consulta docs/OPERACION.md. Los JWT antiguos se invalidan;
crea el administrador con npm run create-admin. No se importan cuentas del
navegador. Los criterios minimos y sus pruebas estan en docs/CRITERIOS_MINIMOS.md.

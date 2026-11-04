# Criterios minimos de la version 3.0

Estos controles se aplican a la biblioteca con servidor. El catalogo estatico
no ofrece cuentas, administracion ni prestamos.

| Criterio | Evidencia automatizada |
| --- | --- |
| Ningun archivo privado accesible por HTTP | critical-security: DB, WAL/SHM, backups, .env y codigo privado responden 404; medium-security: uploads privados |
| Sin cuentas ni secretos predeterminados | critical-security: rechazo de secretos conocidos, ausencia de seed de usuarios y retirada de contrasenas demo |
| Roles y bajas invalidan permisos inmediatamente | high-security: usuario actual, auth_version y tokens revocados; medium-security: bajas logicas |
| Sin stock negativo ni devoluciones duplicadas | high-security: concurrencia, ultima copia, doble devolucion y rollback; release-v3: integridad SQL |
| Entradas invalidas sin caidas | high-security: tipos, JSON y multipart invalidos, limites de subida y health posterior |
| Datos coherentes entre navegadores | browser-smoke: dos sesiones, registro/login, alta/edicion/archivo, prestamo y devolucion |
| Restauracion comprobada y regresiones aprobadas | release-v3: snapshot WAL + portadas, hashes, integridad, restauracion y epoca de sesion renovada |

Validacion complementaria: CSP y XSS, instalacion limpia, schema:check, runtime,
Gitleaks sobre arbol e historial y npm audit. Las pruebas operan sobre bases y
perfiles temporales, sin modificar cuentas ni prestamos reales.

La verificacion local completa se registra en `VERSION_3_0.txt`; CI repite las
pruebas al publicar. Las plantillas HTTPS, supervision y backup programado se
incluyen en `deploy/`; su instalacion y el dominio pertenecen al entorno de
produccion y no se confunden con la publicacion del repositorio.

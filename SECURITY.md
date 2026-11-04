# Seguridad

La version mantenida es 3.0.x. Instala las actualizaciones de dependencias y
comprueba los avisos de GitHub y `npm audit` antes de desplegar.

Para informar una vulnerabilidad usa **Security > Advisories > Report a
vulnerability** del repositorio. No publiques contrasenas, tokens, bases de
usuarios ni ejemplos con datos personales en issues publicas.

El modo estatico es un catalogo de solo lectura. El uso real requiere la API,
un secreto JWT propio, SQLite fuera de `public`, HTTPS y backups privados.
Los datos publicados en el historial antiguo deben considerarse expuestos;
retirar archivos de la rama actual no elimina su historial.

Consulta `docs/OPERACION.md` y `docs/CRITERIOS_MINIMOS.md` para despliegue y
verificacion. Gitleaks y Dependabot complementan las pruebas; no sustituyen la
revision de los cambios y del entorno de produccion.

# Protocolo del Migrador Seguro (`DbMigrator`), Bootstrap y Soporte SQL

## 1. Responsabilidades y blindaje de `DbMigrator`

- Es un ejecutable de consola independiente que **jamás** es referenciado por el proyecto de la API.
- Embebe los archivos SQL de semilla como recursos compilados dentro del binario (nunca busca archivos subiendo directorios relativos en el servidor).
- Imprime únicamente servidor/base saneados, cantidad de migraciones pendientes, checksum verificado, ticket y código de salida (`0` o `1` + tipo de excepción), **sin imprimir jamás cadenas de conexión, contraseñas ni sentencias SQL completas con datos**.

## 2. Flujo exacto para entornos remotos (QA / PreProducción / Producción)

1. **Generación determinista en CI (`--script-only`)**:
   - Compilar `DbMigrator` en `Release` y generar `migrations.sql` idempotente sin abrir conexión real.
   - Emitir `migrations.manifest.json` junto al script registrando el `SHA-256` de `migrations.sql` y de los binarios del migrador e infraestructura.
   - **Prohibido regenerar el SQL después de revisarlo**: las migraciones se aprueban sobre ese artefacto inmutable exacto.
2. **Bootstrap del primer administrador sin contraseñas locales**:
   - En entornos remotos, el bootstrap vincula el correo institucional y el identificador inmutable del proveedor de identidad federado (`oid` / `sub`), exigiendo MFA en el proveedor externo y rechazando crear contraseñas locales iniciales.
   - El proceso hijo limpia de su entorno cualquier variable temporal de bootstrap antes de terminar.
3. **Ejecución validada en Release**:
   - Inyectar la cadena `MigrationDatabase` exclusiva de release.
   - Exigir argumentos explícitos: `--target-database <NombreExacto> --backup-ticket <TicketAprobado> --reviewed-script migrations.sql --reviewed-sha256 <HashAprobado>`.
   - Antes de abrir transacción, el migrador comprueba que el nombre de base coincida exactamente con el de la cadena de conexión y recalcula el `SHA-256` del archivo en disco contra `<HashAprobado>`. Si cualquiera difiere o el entorno no es `Development` en loopback, aborta antes de conectar.

## 3. Scripts SQL de Soporte Excepcional (`Break-Glass`)

Para correcciones operativas extraordinarias que no tienen pantalla por diseño (p. ej. anular un registro huérfano bajo autorización formal):
- El script exige parámetros obligatorios: identificador del registro, `actorUserId` activo responsable, motivo detallado y número de ticket.
- Verifica al inicio que la sesión SQL pertenezca al rol `break_glass` o `sysadmin` (rol que la cuenta de la API jamás posee) y rechaza operar si existen dependencias financieras/legales activas.
- Ejecuta el cambio y la inserción en la bitácora de auditoría (incluyendo el login SQL original del operador) dentro de **una única transacción explícita**.

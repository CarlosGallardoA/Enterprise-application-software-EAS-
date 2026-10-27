---
name: production-release-and-migrations
description: >-
  Úsala al diseñar o ejecutar herramientas de migración de base de datos,
  separación de privilegios SQL, pipelines de CI/CD con compuertas de calidad y
  seguridad, empaquetado de artefactos o despliegues a servidores productivos
  (QA, PreProducción, Producción). Activators: despliegue, deployment, CI/CD,
  pipeline, migraciones de base de datos, DbMigrator, scripts SQL revisados,
  health checks, secretos en servidor, checklist post-deploy, IIS, producción.
---

# Migraciones Seguras, Pipelines CI/CD y Despliegue a Producción (`production-release-and-migrations`)

Garantiza que ningún cambio llegue a QA, PreProducción o Producción sin pasar por compuertas verificables de calidad y seguridad, sin auto-migraciones accidentales al reiniciar el servidor y con separación real de privilegios.

## Cuándo activar esta skill

- Al crear o modificar el pipeline de integración continua (CI) o entrega (CD).
- Al diseñar cómo se aplican migraciones de esquema, semillas iniciales, bootstrap del primer administrador o scripts de soporte de emergencia.
- Al preparar configuración por entorno, cabeceras de caché HTTP, variables de servidor o listas de verificación post-despliegue.

## Las 5 leyes operativas de despliegue

1. **La API jamás migra el esquema ni crea administradores al arrancar**:
   - Un reinicio o reciclado de proceso en producción nunca debe disparar `DDL` ni alterar cuentas privilegiadas.
   - Existe una **única herramienta CLI independiente (`DbMigrator`)** autorizada para migrar esquemas, sembrar catálogos cerrados o ejecutar mantenimiento criptográfico offline.
2. **Tres identidades de base de datos separadas en entornos reales**:
   - `runtime` (API): solo lectura/escritura de datos (`DML`) y bloqueos transaccionales de aplicación; **cero permisos DDL**, cero `db_owner`/`sysadmin`.
   - `migrator` (proceso de release): permisos `DDL` inyectados únicamente durante la ejecución aprobada del migrador; jamás instalados en el servidor web.
   - `break_glass` (soporte excepcional): rol auditado otorgado temporalmente por el DBA bajo ticket para scripts transaccionales de emergencia que exigen motivo, usuario activo responsable y registro obligatorio en bitácora.
3. **Protocolo de SQL revisado + manifiesto `SHA-256` fuera de Desarrollo**:
   - Solo en Desarrollo local contra base loopback se permite migración directa automática.
   - En QA/PreProd/Prod: el pipeline compila el migrador y genera `--script-only migrations.sql` + `manifest.json` (con hashes `SHA-256` del SQL y los binarios). Tras revisión humana y respaldo verificado, el release ejecuta ese archivo exacto exigiendo `--target-database`, `--backup-ticket`, `--reviewed-script` y `--reviewed-sha256` coincidente.
4. **Validación *Fail-Fast* en el arranque y triple aislamiento físico en disco**:
   - **Configuración validada al iniciar (`ValidateOnStart`)**: toda sección de configuración (conexiones, orígenes HTTPS, presupuestos de memoria `> 0`, plazos Outbox y llaves criptográficas) se valida en el arranque del proceso; si falta un valor crítico (p. ej. la llave de cifrado documental), la API **se niega a arrancar de inmediato** en lugar de degradarse en silencio a texto plano o fallar a mitad de una petición.
   - **Triple separación en servidor**:
     1. *Carpeta de publicación* (reemplazada en cada deploy): jamás almacena secretos, logs ni documentos subidos por usuarios.
     2. *Directorio documental (`RootPath`)*: carpeta persistente externa con ACL exclusivo del proceso para los archivos cifrados.
     3. *Llave maestra `AES-256-GCM` y anillo de claves*: resguardados y respaldados **fuera del directorio documental** (guardar la llave junto a los archivos cifrados anula la protección ante copia de carpeta, y perderla vuelve ilegible el histórico).
5. **Coherencia entre arquitectura en memoria y topología del servidor**:
   - Si el sistema usa workers en segundo plano (Outbox, barridos SLA), desactivar la suspensión por inactividad del proceso (*Idle Timeout = 0* / *AlwaysRunning*).
   - Si el sistema usa cachés o almacén de tickets en memoria local del proceso, fijar explícitamente **1 único worker process / 1 instancia** hasta introducir almacenamiento distribuido revocable.

Consulta el detalle completo paso a paso en:
- [safe-db-migrator-protocol.md](./references/safe-db-migrator-protocol.md) — diseño del CLI migrador, bootstrap federado sin contraseña local, manifiesto `SHA-256` y scripts SQL de soporte.
- [ci-cd-and-server-checklist.md](./references/ci-cd-and-server-checklist.md) — las 10 etapas del pipeline CI/CD, validación de artefactos antes de publicar, política `Cache-Control` y checklists post-deploy.

## Compuertas mínimas del Pipeline CI antes de publicar artefactos

1. Checkout limpio (`clean: true`) para no arrastrar residuos entre ejecuciones.
2. Escaneo de secretos en el repositorio con salida redactada (cero exposición del secreto en logs si falla).
3. Auditoría oficial de vulnerabilidades en dependencias directas y transitivas (backend y frontend).
4. Validación previa de archivos de entorno del cliente (cortando con `exit 1` si falta configurar `apiUrl` u orígenes requeridos).
5. Compilación en modo `Release` con **0 advertencias y 0 errores**.
6. Ejecución de pruebas unitarias + pruebas de integración contra instancia de base de datos efímera privada del job, seguida de paso de limpieza con condición `always()`.
7. Linters de código, formato, gobierno documental (`check-docs-governance.mjs`), fronteras arquitectónicas (`check-architecture-boundaries.mjs`), higiene (`audit-code-hygiene.mjs`) y sistema de diseño + paridad i18n (`check-design-system.mjs`, `check-i18n-parity.mjs`).
8. Suite E2E de endurecimiento (CSP, Trusted Types, retornos inseguros) sobre el artefacto web compilado.
9. Verificación estructural de los 3 artefactos separados antes de subirlos: `api` (binarios + manifiestos + config de servidor), `web` (bundle + reglas de reescritura SPA + `i18n`) y `reviewed-migrations` (`migrations.sql` + `manifest.json` + binario migrador).

## Verificación antes de dar por cerrado un cambio operativo

- [ ] El migrador rechaza ejecutarse contra una base remota si falta el ticket de respaldo, el nombre exacto de la base o no coincide el `SHA-256` del script revisado.
- [ ] `index.html` y archivos JSON de traducción sin hash se sirven con `Cache-Control: no-cache`, mientras los assets JS/CSS con hash usan `public, max-age=31536000, immutable`.
- [ ] `/health/live` y `/health/ready` públicos no filtran detalles internos, y `/health/details` responde `401` sin sesión administrativa.

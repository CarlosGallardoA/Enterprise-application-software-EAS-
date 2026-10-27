---
name: security-and-auditability
description: >-
  Úsala al diseñar, implementar o endurecer autenticación, sesiones revocables,
  autorización por permisos y alcance organizacional (anti-IDOR), recuperación de
  contraseña, carga y cifrado en reposo de documentos (AES-256-GCM con AAD),
  cabeceras de seguridad web (CSP, Trusted Types, CSRF, CORS) o logs estructurados
  sin PII. Activators: seguridad, autenticación, autorización, permisos, IDOR,
  sesiones revocables, cifrado documental, CSP, Trusted Types, antiforgery,
  logs estructurados, bitácora, redacción de PII, hardening.
---

# Seguridad Defensiva en Profundidad y Trazabilidad (`security-and-auditability`)

Integra controles de seguridad de nivel institucional desde el diseño de la arquitectura hasta los encabezados HTTP, la criptografía en reposo y los registros operativos, de forma 100 % independiente de lenguaje o framework.

## Cuándo activar esta skill

- Al implementar inicio/cierre de sesión, federación SSO, recuperación de credenciales o administración de usuarios/roles.
- Al proteger endpoints, consultas y mutaciones con permisos y alcance organizacional.
- Al manejar carga, validación, visualización o cifrado de archivos y plantillas documentales.
- Al configurar cabeceras HTTP, políticas CORS/CSRF o registro de logs y errores del navegador.

## Implementación Defensiva vs. Auditoría Adversarial (`security-audit`)

- **Esta skill (`security-and-auditability`)** rige **cómo diseñar, codificar y remediar** controles defensivos en la aplicación.
- **Cuando el usuario solicita una auditoría de seguridad, pen test o revisión formal**, es **obligatorio** activar la skill oficial **`security-audit`** de Cloudflare (`cloudflare/security-audit-skill`) coordinada por [`audit-and-skill-orchestration`](../audit-and-skill-orchestration/SKILL.md):
  - En **auditorías completas (`Full audit mode`)**: ejecutar las 6 fases completas, mantener el repositorio en **estricto solo lectura** (sin tocar cambios locales sin commitear), escribir artefactos fuera del repositorio (`~/security-audit-skill/<repo>/run-<N>`), separar `confirmed` / `needs_validation` / `rejected` sin inventar puntajes y no ejecutar código objetivo salvo sandbox de SO verificado.
  - En **revisiones focalizadas o validación de remediaciones (`Guidance mode`)**: combinar el análisis ofensivo de `security-audit` con los 6 controles estructurales de esta skill y pruebas reales que bloqueen regresiones sin debilitar jamás tests existentes.

## Los 6 controles estructurales obligatorios

### 1. Sesiones revocables en servidor y validación de versión en cada petición
- Vincular identidades externas (OIDC/Entra/SAML) siempre por su identificador inmutable (`oid` / `sub`), jamás solo por email.
- Almacenar las sesiones activas en un almacén revocable del servidor (para que cerrar sesión invalide también una cookie copiada) con vencimiento absoluto acotado (p. ej. 14 días).
- Verificar en cada petición un **sello/versión de seguridad** calculado sobre usuario activo + hash de credencial + roles + permisos: cualquier revocación o cambio de contraseña invalida la sesión al instante.
- Nunca confiar en los claims guardados dentro de la cookie/JWT como fuente definitiva de permisos: revalidar permisos en servidor contra la base de datos.

### 2. Autorización por permisos + alcance organizacional (cero IDOR)
- Toda ruta de lectura o escritura valida dos ejes independientes en el servidor:
  1. **Permiso funcional** (`modulo.recurso.accion`), separado en constantes con namespace de puntos. Para áreas críticas (gestión de usuarios/roles), exigir además rol administrativo explícito.
  2. **Alcance de objeto / jerarquía organizacional** (región → sede → expediente): comprobar que el recurso solicitado pertenezca al alcance vigente del actor usando GUIDs no secuenciales.
- Proteger contra enumeración de cuentas: ejecutar trabajo criptográfico equivalente para usuarios inexistentes/bloqueados y responder códigos uniformes (`204` o mensaje genérico), dejando el motivo exacto únicamente en la bitácora interna.
- Ver [auth-session-and-idor-controls.md](./references/auth-session-and-idor-controls.md).

### 3. Recuperación de credenciales endurecida
- Hashear códigos de un solo uso con **HMAC-SHA-256** usando clave secreta derivada por propósito + identidad del usuario y comparación en tiempo constante (jamás SHA-256 plano sobre códigos cortos enumerables offline).
- Serializar generación, conteo de intentos (máx. 5) y consumo mediante un **bloqueo transaccional exclusivo por usuario** en la base de datos.
- Proteger el código con cifrado autenticado antes de encolarlo en el Outbox y descartar eventos vencidos sin enviarlos.

### 4. Seguridad documental: inspección previa + `AES-256-GCM` con AAD
- **Antes de almacenar o abrir transacción**: validar lista blanca estricta de extensiones y MIME derivado por el servidor, cuotas individuales y acumuladas, contención estricta de rutas contra *path traversal*, límites de decodificación de imágenes e inspección estructural de plantillas PDF (rechazando cifrado, acciones automáticas, JavaScript, archivos embebidos, XFA y referencias externas; documentar que no sustituye antivirus/CDR externo).
- **En reposo**: cifrar cada archivo con `AES-256-GCM`, nonce criptográfico único por archivo, encabezado versionado con `keyId` y **datos autenticados adicionales (`AAD`) ligados a la clave/ruta de almacenamiento** (impidiendo intercambiar archivos cifrados entre expedientes). Fallar en el arranque si falta la llave de cifrado.
- Ver [document-crypto-and-upload-safety.md](./references/document-crypto-and-upload-safety.md).

### 5. Endurecimiento Web y HTTP
- **API**: CORS base vacío con orígenes HTTPS explícitos por entorno (rechazando HTTP y `localhost` fuera de desarrollo), rechazo en el arranque de adaptadores simulados (*fakes*) fuera de desarrollo, protección CSRF/antiforgery en todas las mutaciones con cookie, límites de tasa (*rate limiting*) por cuenta e IP, `HSTS` (365 días), `COOP`/`CORP` y `Permissions-Policy`.
- **Cliente Web (SPA)**: `Content-Security-Policy` sin scripts inline + `Trusted Types`, `X-Frame-Options: DENY` / `frame-ancestors 'none'`, desactivación de `inlineCritical` que inyecte manejadores inline, validación estricta de `returnUrl` (rechazando `//`, `\`, esquemas y controles) y visor documental que jamás construye URLs confiables sobre HTML disfrazado.

### 6. Separación entre Bitácora de Negocio y Logs Estructurados libres de PII
- **Bitácora de negocio**: persistida en base de datos dentro de la misma transacción del cambio (`quién`, `qué`, `antes/después`, `cuándo`).
- **Logs operativos**: líneas JSON estructuradas (p. ej. CLEF) con correlación W3C (`traceId`/`spanId`), compilados sin interpolación costosa y **con prohibición absoluta de registrar contraseñas, códigos OTP, tokens, cookies, llaves, cuerpos HTTP, `payloadJson` de Outbox o query strings**. Para identificar a un actor basta su `userId`.
- Ver [structured-logging-and-pii-redaction.md](./references/structured-logging-and-pii-redaction.md).

## Checklist de verificación de seguridad

- [ ] Cerrar sesión revoca el ticket en el servidor (una copia previa de la cookie deja de funcionar de inmediato).
- [ ] Revocar un permiso o desactivar al usuario bloquea la siguiente petición sin esperar al vencimiento de la cookie.
- [ ] El servidor falla explícitamente al arrancar fuera de Desarrollo si algún adaptador simulado sigue activo o falta la clave documental.
- [ ] Ningún log ni columna `lastError` persiste payloads, correos completos innecesarios, secretos ni mensajes crudos de excepción con PII.
- [ ] La suite E2E de seguridad pasa con `CSP` + `Trusted Types` activos y rechaza redirecciones abiertas en login.

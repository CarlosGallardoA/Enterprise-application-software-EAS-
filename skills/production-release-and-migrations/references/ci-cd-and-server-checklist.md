# Plantilla de Pipeline CI/CD, Artefactos y Checklist de Servidor

## 1. Los 3 Artefactos Inmutables del Build

Un pipeline limpio nunca despliega desde carpetas sucias de compilación intermedia (`bin/` o árbol fuente crudo); publica tres paquetes verificados con destinos separados:

| Artefacto | Contenido verificado antes de publicar | Destino |
| --- | --- | --- |
| `app-api` | Salida completa de `publish` en modo `Release`, manifiestos de runtime, librerías de logging y archivo de configuración del host/proxy (p. ej. `web.config` o equivalente). | Servicio/sitio del Backend API |
| `app-web` | Bundle estático optimizado, archivos `i18n/` y reglas de reescritura de rutas SPA + cabeceras de seguridad/caché. | Servidor estático del Frontend |
| `reviewed-migrations` | `migrations.sql` idempotente, `migrations.manifest.json` (`SHA-256`) y binarios del `DbMigrator`. | Etapa aprobada de migración de base de datos |

### Validación previa de entorno en el build del Frontend
Antes de empaquetar el cliente web para QA/PreProd/Prod, correr un script rápido `check-environment` que falle con `exit 1` si algún campo obligatorio (`apiUrl`, IDs públicos de OIDC) está vacío o conserva valores de `localhost`. Evita publicar silenciosamente un bundle roto.

---

## 2. Política de Caché HTTP y Mismo Origen en el Servidor Web

- **Mismo origen (`/api` o `/apex` bajo el mismo dominio HTTPS)**: elimina fricciones de cookies `SameSite`, simplifica `CSP connect-src` y evita preflights CORS innecesarios. Asegurar que la regla de reescritura SPA (`fallback -> index.html`) **excluya explícitamente el prefijo de la API**; de lo contrario las llamadas REST devolverán HTML `200 OK`.
- **Encabezados `Cache-Control` diferenciados**:
  - `index.html`, rutas profundas de la SPA y diccionarios `i18n/*.json` (sin hash en el nombre): `Cache-Control: no-cache` (revalidación obligatoria para que un deploy nuevo nunca sirva código nuevo con traducciones viejas ni viceversa).
  - Bundles `.js`, `.css` y fuentes con hash de contenido en el nombre: `Cache-Control: public, max-age=31536000, immutable`.

---

## 3. Checklist Post-Despliegue (Backend + Frontend)

### Backend
- [ ] Variables de entorno configuradas a nivel de host/servidor (sobreviven futuros deploys sin sobrescribirse).
- [ ] Proceso configurado sin suspensión por inactividad (*AlwaysRunning* / *Idle Timeout = 0*) y con **1 único worker** si existen cachés o sesiones en memoria local.
- [ ] Carpetas externas persistentes (anillo de claves, documentos cifrados y logs) creadas con permisos exclusivos del proceso; llave `AES-256-GCM` única por ambiente y respaldada por separado.
- [ ] Adaptadores simulados desactivados (`false`) y HTTPS obligatorio activo.
- [ ] `/health/live` y `/health/ready` responden `200` con estado agregado; `/health/details` exige sesión administrativa (`401` anónimo).
- [ ] Se genera el archivo de log estructurado del día con el evento de inicio y trazas por petición.

### Frontend
- [ ] La raíz `/` y cualquier ruta profunda recargada directamente con F5 resuelven la SPA sin `404`.
- [ ] El cliente apunta al prefijo exacto de la API del entorno y los sondeos periódicos (`/heartbeat`) responden `200`.
- [ ] Consola del navegador libre de errores `CSP` / `Trusted Types` durante login, navegación y apertura de documentos PDF/imágenes.

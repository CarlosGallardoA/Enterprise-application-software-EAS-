---
name: enterprise-app-blueprint
description: >-
  Úsala al iniciar una aplicación nueva desde cero, estructurar la gobernanza
  documental de un repositorio (AGENTS.md, docs/, changelog), definir contratos
  estándar de API y errores tipados, o diseñar el modelo base de datos auditable,
  concurrencia optimista y paginación. Activators: nuevo proyecto, estructura base,
  blueprint empresarial, gobierno de repositorio, AGENTS.md, contrato de errores,
  auditoría de entidades, project bootstrap, enterprise architecture setup.
---

# Plano Maestro de Aplicación Empresarial (`enterprise-app-blueprint`)

Establece los cimientos estructurales, documentales y de contratos que sostienen una aplicación empresarial o institucional de alta confiabilidad, 100 % independiente del lenguaje o framework elegido.

## Cuándo activar esta skill

- Al crear un repositorio o aplicación nueva y definir su estructura inicial.
- Al estandarizar un proyecto existente para dotarlo de documentación viva, reglas claras para agentes/desarrolladores y contratos uniformes.
- Al diseñar las convenciones transversales de errores HTTP, concurrencia optimista, paginación, normalización de búsquedas o auditoría de entidades.

## Decisiones fundacionales no negociables

1. **`AGENTS.md` corto como punto de entrada, nunca enciclopedia**: la raíz del repositorio contiene un `AGENTS.md` breve que resume la arquitectura, enlaza a `docs/` por responsabilidad, lista los comandos exactos de verificación y registra las pruebas E2E activas. El detalle normativo vive en `docs/` sin duplicarse.
2. **Organización estricta de `docs/` y `changelog.md` congelado**:
   - Ningún documento suelto vive en la raíz de `docs/` (la única excepción es `docs/AGENTS.md`), incluso cuando una instrucción pida solo «crear un `.md`» sin ruta: siempre se ubica en una de sus 10 subcarpetas canónicas (`arquitectura/`, `requisitos/`, `guias/`, `operacion/`, `decisiones/`, `auditorias/`, `planes/`, `reglas/`, `estandares/`, `historial/`), revisando antes si ya existe un documento del tema para actualizarlo en vez de duplicarlo.
   - `docs/historial/changelog.md` es **obligatorio, `append-only` y congelado**: cada tarea agrega arriba una entrada numerada correlativa `### AAAA-MM-DD (N)` detallando alcance, decisiones y verificación honesta (qué se corrió y qué límites quedaron pendientes), sin reescribir entradas pasadas. Ver [project-governance-and-docs.md](./references/project-governance-and-docs.md).
3. **Contrato único de errores de negocio orientados a i18n**: toda falla controlada (400, 401, 403, 404, 409, 412, 422) devuelve `{ reason, details? }` donde `reason` es un código literal estable (jamás prosa libre en un idioma fijo). Las excepciones no controladas (500) **nunca** exponen `reason` ni detalles internos; devuelven únicamente un `traceId` correlacionado con el log estructurado del servidor.
4. **Concurrencia optimista por defecto**: todo agregado o entidad editable expone un token de versión (`rowVersion` / `version` / `ETag`). Actualizar exige presentar la versión leída; un desfase responde `412 Precondition Failed`.
5. **Baja lógica y trazabilidad automática**: en módulos administrativos y operativos, "eliminar" significa desactivar (`isActive = false`). Toda entidad con CRUD hereda o compone el contrato base auditable, salvo que encaje en una de las 5 excepciones documentadas en [api-contracts-and-data-model.md](./references/api-contracts-and-data-model.md).
6. **Paginación en servidor**: toda colección que crece con el uso pagina en el servidor. Solo los catálogos activos acotados (decenas de filas para selectores de UI) pueden devolverse completos sin paginar.
7. **Reloj inyectado**: queda prohibido leer la hora del sistema de forma estática o directa en dominio, casos de uso o mapeadores. Siempre se inyecta un proveedor de tiempo abstracto.
8. **Integridad inquebrantable de las pruebas (prohibido alterar tests solo para pasar)**: ninguna prueba existente o recién escrita se debilita, modifica para acomodarse al error ni salta (`skip`) para poner el pipeline en verde. Si una prueba falla, se investiga y corrige el defecto real en el código de producción (ver [`layered-testing-strategy`](../layered-testing-strategy/SKILL.md)).
9. **Orquestación limpia con skills de auditoría y diseño**: las auditorías de seguridad delegan obligatoriamente en `security-audit` oficial de Cloudflare (modo solo lectura + evidencia `confirmed`/`needs_validation`), y el trabajo UI/UX combina `DESIGN.md` con `design-consistency-auditor`, `ui-ux-pro-max` e `impeccable` (ver [`audit-and-skill-orchestration`](../audit-and-skill-orchestration/SKILL.md)).
10. **Tecnologías soportadas sin vulnerabilidades conocidas aplicables**: antes de elegir o ejecutar el stack, cumplir [technology-security-policy.md](../security-and-auditability/references/technology-security-policy.md). Verificar avisos oficiales vigentes de runtimes, dependencias y bibliotecas nativas; bloquear ante cualquier severidad, falta de soporte o evidencia incompleta. Extenderlo a CI, SO e imágenes.

## Flujo paso a paso para inicializar o alinear un proyecto

### Paso 1: Estructurar el gobierno documental

1. Generar automáticamente toda la jerarquía inicial ejecutando el script incluido (cero dependencias, Node.js soportado y parcheado según la política de tecnologías):
   ```bash
   node <ruta-skill>/scripts/scaffold-project-docs.mjs --target . --name "NombreProyecto"
   ```
2. Esto crea sin sobrescribir archivos existentes:
   - `./AGENTS.md` (desde [AGENTS.template.md](./resources/AGENTS.template.md)) y `./DESIGN.md`.
   - `./docs/AGENTS.md` (desde [docs-AGENTS.template.md](./resources/docs-AGENTS.template.md)) y las **10 subcarpetas canónicas**: `arquitectura/`, `requisitos/`, `guias/`, `operacion/`, `decisiones/`, `auditorias/`, `planes/`, `reglas/` ([reglas-generales.template.md](./resources/reglas-generales.template.md)), `estandares/` y `historial/` ([changelog.template.md](./resources/changelog.template.md) con su primera entrada `### AAAA-MM-DD (1)`).
   - [.editorconfig.template](./resources/.editorconfig.template) y [.gitignore.template](./resources/.gitignore.template) (UTF-8 sin BOM y exclusión de secretos y carpetas de evidencia local `docs/auditorias/evidencias/`, `test-results/`).
   - `./docs/reglas/seguridad-de-tecnologias.md`, copia de la política completa enlazada desde las reglas generales y `AGENTS.md`.
3. Integrar en el comando de verificación del proyecto el validador de gobierno documental:
   ```bash
   node <ruta-skill>/scripts/check-docs-governance.mjs --root .
   ```
   Comprueba que `AGENTS.md` siga siendo corto, que no haya `.md` sueltos en la raíz de `docs/`, que la secuencia `### AAAA-MM-DD (N)` de `changelog.md` sea correlativa y que no exista ningún enlace relativo roto en `AGENTS.md`, `DESIGN.md` ni `docs/**/*.md`.

### Paso 2: Fijar la topología de módulos y capas

1. Separar el repositorio en unidades con responsabilidades verificables por compilador o linter:
   - **Backend / Core**: `domain` (cero dependencias externas), `application` (casos de uso + puertos por feature), `infrastructure` (persistencia, integraciones, criptografía, jobs), `api` (transporte HTTP y raíces de composición), `migrator` (herramienta CLI independiente para DDL y semillas) y suites separadas para tests unitarios vs integración real.
   - **Frontend / Cliente**: `core` (shared kernel mínimo), `composition` (puentes entre features) y `features/<feature>/{domain,application,infrastructure,ui}`.
2. Activar la skill `hexagonal-vertical-slices` para definir los límites exactos y configurar su script validador de fronteras.

### Paso 3: Establecer los contratos transversales base

Implementar antes de la primera pantalla de negocio las piezas descritas en [api-contracts-and-data-model.md](./references/api-contracts-and-data-model.md):

- Respuesta tipada de falla `{ reason: string, details?: string[] }` + manejador global de excepciones no controladas con `traceId`.
- Mapeador/interceptor en el cliente que traduzca `reason` mediante el sistema de i18n activo, maneje `401` (expiración de sesión) y notifique `412` (conflicto de concurrencia).
- Contrato `PagedRequest` / `PagedResult<T>` reutilizable.
- Utilidad central de normalización de texto (`trim` + colapso opcional) aplicada tanto al persistir como antes de construir filtros de búsqueda.
- Catálogo vivo de endpoints HTTP en el repositorio (colección `.http`, OpenAPI verificada o equivalente) que se actualiza en la misma tarea que cada endpoint.

### Paso 4: Configurar compuertas tempranas de verificación

Antes de escribir funcionalidades de negocio, dejar operativos y en verde:

- Compilación con **tratamiento de advertencias como errores** (`0 warnings, 0 errors`).
- Formateador y linter de código, fronteras arquitectónicas (`hexagonal-vertical-slices`) y sistema de diseño (`institutional-design-system-ux`).
- Compuerta obligatoria de seguridad del stack completo, de cualquier severidad y con bloqueo ante evidencia incompleta, más detección de secretos (`production-release-and-migrations`).

## Verificación antes de cerrar

- [ ] El stack y las herramientas usan versiones soportadas y parcheadas verificadas durante la tarea; `docs/reglas/seguridad-de-tecnologias.md` está enlazado y la compuerta de seguridad bloquea vulnerabilidades conocidas aplicables y comprobaciones incompletas.
- [ ] `AGENTS.md` enlaza sin enlaces rotos a `docs/reglas/reglas-generales.md`, `docs/arquitectura/principios-generales.md`, `DESIGN.md` y `docs/historial/changelog.md`.
- [ ] No existen archivos `.md` sueltos en la raíz de `docs/` fuera de `docs/AGENTS.md`.
- [ ] El contrato de errores devuelve códigos estables `reason` en fallas de negocio y `traceId` sin detalles internos ante errores `500`.
- [ ] `.gitignore` excluye secretos locales, artefactos de compilación y carpetas de capturas de evidencia local.
- [ ] `docs/historial/changelog.md` registra la fase inicial con el alcance real verificado.

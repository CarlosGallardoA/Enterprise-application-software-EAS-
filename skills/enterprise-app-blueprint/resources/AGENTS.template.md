# Guía de Desarrollo de <NOMBRE_PROYECTO>

## Propósito

`<NOMBRE_PROYECTO>` es `<descripción de 1 línea del propósito del sistema>`. Este archivo es el punto de entrada para cualquier agente o desarrollador: resume el stack, enlaza las reglas vigentes por responsabilidad y lista los comandos de verificación. El contenido normativo detallado vive en `docs/` — no se duplica aquí.

## Stack y arquitectura (resumen)

- Backend: `<lenguaje/runtime>`, arquitectura hexagonal con vertical slicing (`Domain` → `Application` → `Infrastructure` / `Api`).
- Frontend: `<framework/runtime>`, arquitectura hexagonal + vertical slicing por feature (`domain` / `application` / `infrastructure` / `ui`) + shared kernel en `core/`.
- Detalle de capas, dependencias y regla obligatoria antes de tocar código: [`docs/arquitectura/principios-generales.md`](./docs/arquitectura/principios-generales.md), [`docs/arquitectura/backend-architecture.md`](./docs/arquitectura/backend-architecture.md), [`docs/arquitectura/frontend-architecture.md`](./docs/arquitectura/frontend-architecture.md).
- Eventos durables (Outbox transaccional), jobs periódicos y sondeo del cliente: [`docs/arquitectura/realtime-and-background-jobs.md`](./docs/arquitectura/realtime-and-background-jobs.md).
- Despliegue, migraciones y observabilidad: [`docs/operacion/deployment.md`](./docs/operacion/deployment.md), [`docs/operacion/logs.md`](./docs/operacion/logs.md).

## Dónde está cada regla

| Qué buscas | Dónde vive |
| --- | --- |
| Reglas de proceso/gobierno: contrato de errores, auth, secretos, estilo de trabajo, política de git, verificación | [`docs/reglas/reglas-generales.md`](./docs/reglas/reglas-generales.md) |
| Estándares de implementación backend | [`docs/estandares/estandares-backend.md`](./docs/estandares/estandares-backend.md) |
| Estándares de implementación frontend, i18n y UX/UI | [`docs/estandares/estandares-frontend.md`](./docs/estandares/estandares-frontend.md) |
| Capas, dependencias y regla obligatoria antes de todo cambio | [`docs/arquitectura/principios-generales.md`](./docs/arquitectura/principios-generales.md) |
| Sistema de diseño institucional (tokens, componentes, accesibilidad) | [`DESIGN.md`](./DESIGN.md) |
| Historial detallado de cada tarea completada, fase por fase | [`docs/historial/changelog.md`](./docs/historial/changelog.md) |
| Organización de `docs/` y dónde crear un documento nuevo | [`docs/AGENTS.md`](./docs/AGENTS.md) |

## Verificación

- Backend: `<comando build>`, `<comando test>`, `<comando lint/format>`.
- Frontend: `<comando build>`, `<comando test>`, `<comando lint>`, `<comando format:check>`.
- Ejecutar formateadores, linters y validadores de arquitectura/sistema de diseño antes de reportar cualquier tarea como terminada.
- **Regla inquebrantable de pruebas**: prohibido alterar, relajar o saltar (`skip`) un test solo para que pase; si falla, corregir el error real en el código de producción (ver [`docs/reglas/reglas-generales.md`](./docs/reglas/reglas-generales.md)).

## Testing e2e

Regla: todo flujo de usuario real nuevo o modificado entre pantallas lleva su propio test E2E y se registra en la lista de abajo en el mismo cambio, ejecutándose siempre contra una base de datos local desechable que se elimina al finalizar.

Registro de specs (alcance de cada uno):

- `login` — autenticación, manejo de credenciales e inicio de sesión seguro.

## Mantenimiento de este archivo

Actualizar el [Change Log](./docs/historial/changelog.md) al terminar cualquier tarea. Una regla nueva o modificada se agrega al documento de `docs/reglas/` o `docs/estandares/` que le corresponde, nunca de vuelta en este archivo — mantenerlo corto es intencional.

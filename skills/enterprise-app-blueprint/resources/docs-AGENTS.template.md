# Organización de la documentación

Los documentos nuevos del proyecto se crean dentro de `docs/` y en la subcarpeta que corresponda a su propósito. Esta regla se aplica también cuando la petición solo dice «crear un `.md`» sin indicar ruta. **No crear documentos sueltos en la raíz de `docs/`.**

| Carpeta | Contenido |
| --- | --- |
| `arquitectura/` | Capas, límites, decisiones de diseño técnico y mecanismos transversales. |
| `requisitos/` | Especificaciones funcionales y documentos originales de requerimientos. |
| `guias/` | Instrucciones de desarrollo y descripción de flujos funcionales. |
| `operacion/` | Configuración, despliegue, migraciones, logs y procedimientos de soporte (runbooks). |
| `decisiones/` | Justificación de una decisión técnica concreta. |
| `auditorias/` | Informes de revisión, seguridad, diseño, hallazgos y matrices de remediación. |
| `planes/` | Planes de trabajo, remediación, rediseño y rendimiento. |
| `reglas/` | Reglas de proceso/gobierno vinculantes (no de implementación por stack). |
| `estandares/` | Convenciones de código e implementación por stack (backend, frontend). |
| `historial/` | Change Log del proyecto (`changelog.md`) — registro histórico congelado, fase por fase. |

Antes de crear un archivo, revisar si ya existe un documento sobre el mismo tema y actualizarlo cuando corresponda en lugar de duplicarlo. Si ninguna carpeta sirve, crear una nueva subcarpeta con nombre descriptivo en español. Mantener los `.md` en español y actualizar los enlaces relativos entre documentos dentro de `docs/` al mover o renombrar archivos.

Los archivos Markdown estructurales que viven fuera de `docs/` (`AGENTS.md`, `DESIGN.md`, `README.md`) conservan su ubicación en la raíz; no moverlos dentro de `docs/`. Este archivo `docs/AGENTS.md` es la **única excepción permitida** en la raíz de `docs/`: define las reglas para sus subcarpetas.

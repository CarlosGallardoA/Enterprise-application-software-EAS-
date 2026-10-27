# Gobierno del Repositorio y Organización Documental

## Filosofía: un único punto de verdad por tema

Un proyecto empresarial degrada rápido cuando las reglas se dispersan en conversaciones, comentarios de código o documentos contradictorios. Para evitarlo:

1. **`AGENTS.md` en la raíz es un mapa corto (80–120 líneas máx.)**:
   - Explica en un párrafo qué resuelve el sistema.
   - Resume las capas de arquitectura en 5–6 viñetas.
   - Muestra una tabla `"Qué buscas → Dónde vive"` apuntando a `docs/` y `DESIGN.md`.
   - Lista los comandos exactos de verificación (compilar, probar, lint, formato).
   - Mantiene el registro vivo de especificaciones E2E (nombre del archivo + flujo que cubre).
   - **Nunca** se agregan reglas detalladas de vuelta en `AGENTS.md`: toda regla nueva va al archivo específico de `docs/reglas/` o `docs/estandares/`.

2. **Taxonomía obligatoria de `docs/`**:

| Carpeta | Qué contiene | Ejemplo |
| --- | --- | --- |
| `arquitectura/` | Capas, límites de dependencia, mecanismos transversales (Outbox, sondeo). | `principios-generales.md`, `backend-architecture.md` |
| `reglas/` | Reglas vinculantes de gobierno y proceso independientes del stack. | `reglas-generales.md` |
| `estandares/` | Convenciones de código e implementación por capa/tecnología. | `estandares-backend.md`, `estandares-frontend.md` |
| `guias/` | Recetas prácticas paso a paso para desarrolladores nuevos y descripción de flujos. | `backend-guide.md`, `frontend-guide.md` |
| `operacion/` | Despliegue, migraciones, logs y runbooks de soporte en producción. | `deployment.md`, `logs.md`, `outbox-runbook.md` |
| `decisiones/` | Justificación técnica puntual (ADR ligero) de por qué se eligió X sobre Y. | `logging-format.md` |
| `auditorias/` | Informes de seguridad, calidad, consistencia visual y matrices de remediación. | `auditoria-seguridad.md` |
| `planes/` | Planes de trabajo por fases, rediseños o mejoras de rendimiento. | `plan-remediacion.md` |
| `requisitos/` | Especificaciones funcionales originales del dominio. | `especificacion-requerimientos.md` |
| `historial/` | Registro histórico congelado (`append-only`) de cada tarea completada, fase por fase. | `changelog.md` |

   - **Cero `.md` sueltos en la raíz de `docs/`**: incluso cuando el usuario pide simplemente «crea un `.md`» sin especificar ruta, el archivo se ubica en la subcarpeta de `docs/` que corresponda a su propósito. `docs/AGENTS.md` es el **único** archivo permitido en la raíz de `docs/`.
   - **Actualizar antes que duplicar**: antes de crear un `.md` nuevo, verificar si ya existe uno del mismo tema en `docs/` y actualizarlo. Si ningún directorio encaja, crear una subcarpeta descriptiva en español. Los archivos estructurales de raíz (`AGENTS.md`, `DESIGN.md`, `README.md`) permanecen siempre en la raíz.

## Reglas de proceso y flujo de trabajo

### 1. Estándar estricto de `docs/historial/changelog.md` (congelado, numerado y con verificación honesta)
- Al terminar **cualquier** tarea (funcionalidad, corrección, refactorización, endurecimiento, plan o auditoría), se agrega una nueva entrada en la parte superior de `docs/historial/changelog.md` con formato `### AAAA-MM-DD (N)`, incrementando `N` de forma correlativa (`(1)`, `(2)`, `(3)`...).
- **Registro histórico congelado**: las entradas anteriores **jamás se reescriben** aunque semanas después se muevan o renombren archivos; el estado normativo vigente vive en `docs/reglas/`, `docs/estandares/` y `docs/arquitectura/`, no en entradas viejas del historial.
- **Estructura de cada entrada**:
  1. **Alcance y cambios realizados**: qué problema, fase o flujo se resolvió, decisiones clave y enlaces relativos a planes, decisiones o matrices en `docs/`.
  2. **Verificación real y límites explícitos**: detallar con exactitud qué compilaciones, pruebas, linters y validadores se ejecutaron y aprobaron, **y declarar con total honestidad qué NO se ejecutó o qué límite permaneció** (p. ej., si faltaba motor SQL local, IIS o sandbox de ejecución, o si no hubo commit/despliegue). Nunca afirmar verificaciones ni coberturas no corridas.
- Toda narrativa histórica (*"se corrigió el hallazgo X"*, *"a pedido del usuario"*) vive **exclusivamente aquí** o en `docs/decisiones/`, jamás como comentario conversacional en el código fuente.

### 2. Catálogo vivo de endpoints HTTP
- Todo endpoint nuevo o modificado se documenta en la misma tarea dentro del catálogo ejecutable del repositorio (archivo `.http`, colección declarativa o especificación verificada), detallando método, ruta, autenticación requerida, protección CSRF/antiforgery, cuerpo de entrada y códigos de respuesta esperados (`200/201/204` y errores tipados).

### 3. Seguridad estricta sobre Git y evidencias locales
- **Operaciones mutantes de Git**: un agente nunca ejecuta `commit`, `push`, `merge`, `rebase`, `reset` ni borrado/creación de ramas por iniciativa propia; deja los cambios verificados en el árbol de trabajo y solo usa comandos de lectura (`status`, `diff`, `log`) salvo instrucción explícita para esa tarea puntual.
- **Capturas antes/después fuera de Git**: las capturas de pantalla y galerías HTML generadas para validar cambios visuales se guardan exclusivamente en rutas ignoradas por Git (`docs/auditorias/evidencias/`, `test-results/`). En el repositorio solo se versionan los informes `.md` y las pruebas automatizadas que las generan.
- **Cero secretos en el árbol de trabajo**: jamás escribir credenciales reales, tokens o llaves en ningún archivo dentro del repositorio, ni siquiera en scripts temporales (una vez en el historial de Git, un borrado posterior no revoca la exposición).

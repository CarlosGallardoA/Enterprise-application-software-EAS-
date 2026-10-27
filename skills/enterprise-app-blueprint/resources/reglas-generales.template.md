# Reglas generales del proyecto

Reglas vinculantes de proceso y gobierno para todo trabajo en el repositorio, independientes de la capa o lenguaje.

## Contrato de errores

- Toda falla de negocio controlada (400/401/403/404/409/412/422) devuelve `{ reason, details? }`, donde `reason` es el nombre simbólico estable de una falla de `Application` o un literal estándar (`"NotFound"`, `"CodeAlreadyExists"`, `"NameAlreadyExists"`). Nunca devolver mensajes en prosa libre desde el backend: el frontend traduce `reason` en el idioma activo.
- Las excepciones no controladas (500) nunca incluyen `reason` ni detalles internos; adjuntan únicamente `traceId` correlacionado con el log del servidor.

## Autenticación, autorización y secretos

- Validar identidad, vigencia de sesión, permisos y alcance organizacional siempre en el servidor; nunca confiar en controles exclusivos del cliente ni en claims obsoletos de cookies/tokens para permisos revocables.
- Mantener cadenas de conexión, claves criptográficas, contraseñas y tokens fuera del control de versiones. Nunca hardcodear credenciales reales ni siquiera en scripts temporales de prueba.
- Al agregar o actualizar dependencias, ejecutar las herramientas oficiales de auditoría de vulnerabilidades directas y transitivas del ecosistema correspondiente.

## Estilo de trabajo

- Mantener respuestas breves, directas y sin relleno.
- Actualizar [`docs/historial/changelog.md`](../historial/changelog.md) al cerrar cualquier tarea.
- Documentar todo endpoint HTTP nuevo o modificado dentro de la colección ejecutable del repositorio en la misma tarea.
- Respetar estrictamente la arquitectura hexagonal + vertical slicing sin atajos entre capas ni lógica de negocio en controladores, componentes UI o guards.
- Incluir las pruebas unitarias, de integración y E2E que correspondan como parte de la misma tarea, nunca como deuda posterior.
- **Integridad inquebrantable de las pruebas**: queda terminantemente prohibido alterar, debilitar, relajar, saltar (`skip`) o borrar una prueba simplemente para que pase cuando falla. Un test fallido puede estar delatando un error real en el código de producción; siempre se investiga y repara primero la causa raíz en producción contra la especificación, y jamás se acomoda la aserción a una salida defectuosa.
- Nunca ejecutar comandos de Git que muten el repositorio (`commit`, `push`, `merge`, `rebase`, `reset`, ramas/tags) sin solicitud explícita del usuario para esa tarea puntual.
- Guardar capturas visuales antes/después únicamente en rutas ignoradas por Git (`docs/auditorias/evidencias/`, `test-results/`); versionar solo los informes `.md` y las pruebas automatizadas.

## Auditorías y skills especializadas

- **Auditorías de seguridad**: usar obligatoriamente la skill oficial `security-audit` de Cloudflare (`Full audit mode` en auditorías integrales o pen tests manteniendo el repositorio en estricto solo lectura y separando `confirmed` / `needs_validation` / `rejected`; `Guidance mode` en revisiones puntuales). En auditorías de otras disciplinas, conservar su rigor de evidencia verificable y modo solo lectura.
- **Diseño, consistencia visual y UX**: el archivo `DESIGN.md` y los tokens semánticos de `tokens.css` son la autoridad suprema; al crear o revisar pantallas, complementar con `design-consistency-auditor`, `ui-ux-pro-max` e `impeccable` sin introducir colores literales ni clases ajenas al sistema de diseño.

## Base de datos para pruebas de integración y E2E

- Ejecutar siempre contra una base de datos local y desechable creada con nombre único para esa corrida, jamás contra ambientes compartidos (QA, PreProd, Prod) ni bases de trabajo diario.
- Garantizar limpieza obligatoria al finalizar (pasen o fallen las pruebas): detener servicios levantados, eliminar la base temporal, verificar que no queden archivos residuales en disco y borrar directorios temporales de almacenamiento documental. Si algo impide la limpieza, reportar explícitamente el recurso pendiente.

## Verificación mínima antes de cerrar una tarea

- Compilación limpia con **0 advertencias y 0 errores**.
- Suite de pruebas aplicables en verde.
- Linters de código, fronteras arquitectónicas, sistema de diseño y formateadores ejecutados sin violaciones.

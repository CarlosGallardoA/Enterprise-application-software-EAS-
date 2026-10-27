# Patrones de UX Operativa, Tablas, Líneas de Tiempo e i18n Segura

## 1. Estándar de Vistas Operativas y Expedientes

- **Cabeceras de página consistentes (`PageHeader`)**:
  - Pantallas de primer nivel (listados, panel principal): usan **eyebrow** superior + `<h1 class="page-title">` (con el contador dentro del `h1`, nunca suelto al lado).
  - Pantallas alcanzadas desde otra (detalle de expediente, alta/edición): usan **migas de pan (`breadcrumbs`)** con área interactiva mínima de `44 × 44 px`.
  - Nunca combinar eyebrow y breadcrumbs a la vez, ni dejar una vista huérfana sin ninguno. Máximo 1 botón primario y 1 secundario en la cabecera; bajo `48rem` ocupan el ancho disponible.
- **Expediente completo**:
  - Ficha contextual lateral a la izquierda (apilada arriba en móvil) + área principal de pestañas/secciones a la derecha.
  - Resúmenes contextuales preceden a las secciones numeradas ocupando todo el ancho útil, con orden visual idéntico al orden del DOM.
- **Secciones numeradas**:
  - Cada tarjeta numerada abarca su encabezado a todo lo ancho y agrupa en su cuerpo descripción, campos, validación y acciones. Nunca anidar una tarjeta numerada dentro del encabezado de otra.
- **Controles binarios Sí/No uniformes**:
  - Grupo segmentado (`segmented-choice`) con botones de `44 px` dentro de marco de `46 px`, ancho/altura intrínseca (sin estirarse con la fila de la rejilla), conservando estado «sin responder», navegación por teclado y textos largos en cualquier idioma.

## 2. Listados, Tablas Documentales y Árboles Jerárquicos

- **Listados operativos y administrativos unificados**:
  - Reutilizar una única composición de filtros + tabla en todos los módulos.
  - Bajo `48rem` (`768px`), las tablas se transforman en **tarjetas verticales apiladas** conservando absolutamente todas las columnas, etiquetas y acciones (prohibido ocultar datos o truncar identificadores con `...` para fingir que caben).
  - En búsquedas con botón junto al campo de texto, ambos comparten la fila del control; el mensaje de error inferior nunca empuja ni desalinea el botón.
- **Tablas documentales**:
  - En escritorio las celdas mantienen `display: table-cell` real; cualquier contenedor `flex` para alinear insignia de extensión + nombre vive en un wrapper interno dentro de la celda para no romper bordes ni alineación vertical de filas.
  - Separar siempre el permiso de **previsualizar en memoria** (`view`) del permiso de **descargar a disco** (`download`). Cuando `canDownload = false`, el visor modal suprime controles de descarga y atajos de guardado/impresión.
- **Árboles administrativos**:
  - Mantener la paginación fuera del elemento `role="table"`, botones de expansión con `aria-expanded` real, texto accesible que indique el nivel jerárquico y formularios inline ocupando una fila completa cuando aplique.

## 3. Historiales y Trazabilidad en Línea de Tiempo Vertical

Quedan prohibidas las listas planas improvisadas para bitácoras de expedientes. Todo historial implementa una línea de tiempo vertical estandarizada con:
- Marcador lateral con ícono semántico y conector continuo.
- Transición explícita de estatus `[• Estado Anterior] → [• Estado Nuevo]` con insignias donde el estado nunca depende únicamente del color (incluye punto o ícono acompañante).
- Metadatos de autor (nombre + rol), marca de tiempo alineada y tarjeta de comentario/justificación cuando exista, todo reactivo al cambio de idioma en tiempo de ejecución.

## 4. Internacionalización Segura fuera de Plantillas (`translateLoaded`)

### El fallo clásico en producción
En librerías de i18n con carga perezosa por ruta, la función imperativa `translate(key)` suele ser **síncrona**: si un interceptor o bloque `catch` dispara un toast antes de que termine la descarga HTTP de `/i18n/<scope>/<lang>.json`, `translate()` devuelve la clave cruda literal (`"auth.sessionExpired"`) o un `load()` mal invocado lanza excepción dentro del manejador global y derriba la pantalla completa.

### Solución obligatoria
1. Crear un único helper asíncrono `translateLoaded(i18n, key, params?)` en `core/i18n/`:
   - Si la traducción ya está cargada en memoria y resuelve distinto de la clave cruda, retorna de inmediato (camino rápido síncrono envuelto).
   - Si aún no cargó, extrae el `<scope>` de la clave, espera de forma segura la carga de `<scope>/<activeLang>` capturando errores de red con fallback legible, y luego traduce.
2. Prohibir mediante regla de linter llamar `toast.*(i18n.translate(...))` directamente en features.
3. Si se convierte un stream reactivo de cambio de idioma en estado reactivo de UI (`signal`), diferir su emisión al microtask/scheduler siguiente para no mutar señales sincrónicamente en medio del renderizado.

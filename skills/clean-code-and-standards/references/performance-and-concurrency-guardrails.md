# Guardas de Rendimiento, Consultas y Concurrencia

## 1. Búsqueda de texto segura y eficiente

- **Normalización previa**: pasar siempre el término de entrada por la misma normalización que usa la escritura (`trim`, colapso de controles) antes de decidir si filtrar. Un espacio al final del input de búsqueda no debe vaciar los resultados.
- **Prefijo vs. Fragmento**:
  - **Códigos e identificadores** (expediente, documento, sede, póliza): predicado `STARTS WITH` para habilitar `INDEX SEEK` sobre índices B-tree.
  - **Nombres y texto descriptivo**: predicado `CONTAINS` con colación insensible a tildes y mayúsculas.
- **SQL parametrizado con `LIKE`**: cuando se construye un patrón `LIKE` manual, escapar explícitamente `\`, `%`, `_` y `[` (en motores tipo T-SQL) declarando `ESCAPE '\'`, y pasar siempre el patrón como parámetro enlazado — jamás interpolar cadenas en SQL.

## 2. Trabajos por lotes y agregaciones

- **Prohibido traer filas para contar en la aplicación**: series temporales, tableros de indicadores y resúmenes usan `GROUP BY` y sumas condicionales (`SUM(CASE WHEN ... THEN 1 ELSE 0 END)`) directamente en la base de datos.
- **Paginación por cursor (`Keyset`) en barridos**: cuando un proceso recorre miles de registros históricos, ordenar por `(occurredAtUtc, id)` y avanzar con `WHERE (occurredAtUtc > :lastTs) OR (occurredAtUtc = :lastTs AND id > :lastId) LIMIT 500`, evitando el costo cuadrático de `OFFSET`.
- **Actualización masiva directa**: para operaciones masivas simples sobre entidades técnicas sin fila de auditoría campo-por-campo ni concurrencia optimista individual (ej. «marcar todas mis notificaciones como leídas»), ejecutar un `UPDATE ... WHERE` directo en lugar de hidratar cientos de objetos en memoria.

## 3. Presupuesto de memoria y límites de recursos en archivos

- **Presupuesto global de subida (`UploadMemoryBudget`)**: reservar los bytes declarados del lote antes de almacenar buffers en memoria y liberarlos en un bloque `finally`. Si el presupuesto global (p. ej. 512 MB) no tiene capacidad dentro de una ventana corta de espera, responder `503` con código `UploadCapacityBusy` y cabecera `Retry-After`. Admitir un lote individual grande únicamente cuando no haya otras cargas en vuelo.
- **Límites al decodificar imágenes/documentos**: fijar topes estrictos de ancho/alto, megapíxeles, memoria, disco temporal y tiempo de CPU en cualquier librería procesadora de imágenes o PDFs para impedir ataques de agotamiento por descompresión (*pixel flood / zip bomb*); ante exceso en optimización opcional, abortar la transformación y conservar o rechazar de forma controlada sin agotar el proceso.

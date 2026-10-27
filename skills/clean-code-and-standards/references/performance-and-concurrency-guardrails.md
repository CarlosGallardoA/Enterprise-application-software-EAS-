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

## 4. Rendimiento Real en Cliente Web, Red HTTP y Bundles

- **Precarga ociosa (`IdlePreloading`) en lugar de precarga agresiva al arrancar**:
  - Nunca disparar `PreloadAllModules` inmediatamente al cargar la aplicación: bajo HTTP/1.1 (límite de 6 conexiones por origen) decenas de chunks JS saturan la cola y matan por timeout las llamadas de datos iniciales del panel principal. Precargar módulos únicamente cuando el navegador esté ocioso (`requestIdleCallback` con fallback a `setTimeout`).
- **Interceptor de resiliencia que jamás reintenta `TimeoutError`**:
  - Un `TimeoutError` del cliente bajo congestión indica que la petición sigue encolada; reintentarla solo multiplica el cuello de botella. Reintentar únicamente fallos reales de transporte (`status === 0`) y solo en peticiones idempotentes de lectura (`GET`).
- **Consultas iniciales en paralelo y vistas precalculadas**:
  - Lanzar lecturas independientes de una pantalla con `Promise.all` en lugar de esperarlas en serie.
  - En tablas e historiales, precalcular formatos o etiquetas derivadas con señales/selectores memoizados (`computed()`) en lugar de invocar funciones por cada fila dentro del bucle de la plantilla.
- **Carga bajo demanda (`import()` dinámico) de SDKs pesados de SSO/OIDC**:
  - No cargar ni inicializar SDKs pesados de identidad federada (p. ej. MSAL/OIDC de ~250+ kB) en el bundle de arranque para usuarios que usan credenciales locales. Cargarlos con `import()` dinámico solo al pulsar el botón federado o cuando la pestaña trae un redirect OIDC pendiente.
- **Tipografías auto-hospedadas (`self-hosted fonts`)**:
  - Servir los archivos `.woff2` desde el propio proyecto en lugar de depender de CDNs externos (como Google Fonts) en tiempo de ejecución: elimina latencia DNS/TLS de terceros, simplifica `CSP` y evita descargar hojas para alfabetos no utilizados.

## 5. Escalonamiento de Timeouts SQL y Reintentos Idempotentes

- **Timeouts escalonados (`DB < HTTP cliente`, extendido en `DbMigrator`)**:
  - Configurar el `CommandTimeout` de base de datos en la API (p. ej. `10 s`) **por debajo** del timeout HTTP del frontend (p. ej. `15 s`) para que el servidor corte primero con traza estructurada; en cambio, sobrescribir ese timeout en el CLI `DbMigrator` (p. ej. `5 min`) donde crear o migrar esquemas legítimamente toma más tiempo.
- **Transacciones explícitas bajo `ExecutionStrategy` reintentable**:
  - Al habilitar reintentos automáticos ante fallos transitorios de base de datos (`EnableRetryOnFailure`), envolver toda transacción manual en la estrategia de ejecución del ORM y asegurar idempotencia entre intentos (mediante guardas de estado en la entidad de dominio o limpiando el `ChangeTracker` antes de reintentar).

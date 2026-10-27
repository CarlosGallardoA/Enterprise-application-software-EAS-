# Contratos de API, Errores Tipados y Modelo de Datos Auditable

## 1. Contrato estandarizado de errores (`ApiFailureResponse`)

Separar tajantemente **fallas de negocio esperadas** de **excepciones no controladas (bugs)**:

### Fallas de negocio (HTTP 400, 401, 403, 404, 409, 412, 422)
Devuelven siempre la misma estructura serializada:

```json
{
  "reason": "InconsistentLocationScope",
  "details": ["OptionalDetailCode1"]
}
```

- **`reason`**: identificador simbólico estable, emitido a partir del nombre literal de un enumerado de falla de la capa `Application` (ej. `SubmitOrderFailure.InvalidStatus -> "InvalidStatus"`), o de un código estándar fijo para consultas/conflictos simples (`"NotFound"`, `"CodeAlreadyExists"`, `"NameAlreadyExists"`).
- **Por qué nunca enviar texto humano libre desde el backend**: si el servidor devuelve `"El código ya existe"` en un campo `message`, rompe la internacionalización (queda fijo en un idioma o duplica diccionarios entre backend y frontend). El cliente traduce `reason` en el idioma activo del usuario.
- **`details` (opcional)**: lista de códigos o reglas granulares incumplidas (por ejemplo, criterios individuales de una política de contraseñas o campos inválidos).

### Forma del resultado en el caso de uso (`Application`)
- **Booleano simple permitido en un único caso**: altas de catálogos simples con **exactamente una** causa posible de falla de negocio (duplicado de código o nombre) y sin metadatos adjuntos (`CreateResult(entry, codeAlreadyExists)`).
- **Resultado tipado obligatorio en todo lo demás**: en cuanto un caso de uso tiene **2 o más causas posibles de falla** o datos asociados al fallo, devuelve un objeto `Outcome` + un enumerado `FailureReason` explícito. Si un catálogo simple suma una segunda causa de falla, se migra a `Outcome + FailureReason` en el mismo cambio.

### Errores no controlados (HTTP 500)
- Nunca llevan campo `reason` ni exponen el mensaje de la excepción interna, trazas de pila o nombres de tablas SQL.
- Devuelven un cuerpo estándar con un único identificador de correlación (`traceId`), idéntico al `RequestId` registrado en el log estructurado del servidor para soporte operativo.

---

## 2. Concurrencia optimista (`412 Precondition Failed`)

Toda entidad editable por usuarios o procesos concurrentes incluye una columna/propiedad de control de versión (`rowVersion`, `xmin`, `version` entera incremental o `ETag` opaco):

1. Al consultar el registro para edición, el DTO incluye `rowVersion` (opaco para el cliente).
2. Al enviar la actualización, el cliente reenvía ese mismo `rowVersion`.
3. Antes de mutar la entidad en el repositorio, se fija la versión esperada en la unidad de trabajo (`WHERE id = :id AND version = :expectedVersion`).
4. Si ninguna fila coincide porque otro actor guardó primero, la capa de persistencia lanza una excepción de concurrencia que el pipeline HTTP traduce uniformemente a **`412 Precondition Failed`** con `reason: "ConcurrencyConflict"`.
5. En el cliente, un interceptor global detecta `412` y muestra un aviso claro invitando a recargar los datos recientes sin sobrescribir en silencio el trabajo ajeno.

---

## 3. Modelo de auditoría (`AuditableEntity`) y sus 5 únicas excepciones

### Regla por defecto
Toda tabla nueva con mantenimiento (CRUD) hereda o compone `AuditableEntity`:
- `isActive: boolean` (baja lógica; nunca `DELETE` físico en entidades maestras u operativas).
- `createdAtUtc`, `createdByUserId`, `updatedAtUtc`, `updatedByUserId`.
- El gancho central de persistencia (interceptor/unidad de trabajo al confirmar cambios) genera automáticamente las entradas de diff de campos en la bitácora de auditoría (`AuditLogEntries`), sin código repetitivo en cada caso de uso.

### Las 5 excepciones legítimas (cualquier otra tabla lleva `AuditableEntity`)
Antes de crear una entidad sin `AuditableEntity`, verificar que pertenece estrictamente a una de estas 5 categorías:

1. **Auditoría de dominio más rica y dedicada**: agregados principales o documentos con ciclo de vida propio (ej. borrado lógico con justificación obligatoria, historial clínico/operativo o snapshots propios) que registran transiciones explícitas mediante un puerto `AuditLogWriter` en cada caso de uso.
2. **Tablas append-only (inmutables)**: se insertan una sola vez y jamás se actualizan ni desactivan (`AuditLogEntry`, `Notification`, comentarios de seguimiento, intentos de despacho, consentimientos, historial de banderas). No existe diff de campos que rastrear.
3. **Catálogos cerrados de sistema**: sembrados por migración o importación oficial, sin pantallas de alta/edición en producción (ej. catálogo fijo de códigos de permiso).
4. **Filas de asociación o estado técnico de infraestructura**: tablas puente muchos-a-muchos auditadas a través de su agregado raíz, hijos internos de un agregado que nunca cambian fuera de los métodos de su raíz, `OutboxMessage`, códigos temporales de un solo uso con expiración, o bloqueos técnicos de despacho.
5. **Tablas espejo de enumerados (`*Lookup`)**: tablas de solo lectura sembradas por migración únicamente para garantizar integridad referencial (FK) y nombres legibles en consultas SQL/reportes.

---

## 4. Paginación y normalización de búsquedas

1. **Paginación obligatoria en el servidor**:
   - Todo listado que crece con la operación (expedientes, transacciones, usuarios, bitácora, documentos) recibe `page` y `pageSize` acotado (con tope máximo en servidor) y devuelve `{ items, page, pageSize, totalCount }`.
   - En el cliente, ejecutar una nueva búsqueda o cambiar filtros **siempre reinicia `page = 1`** para no dejar al usuario atrapado en una página vacía fuera de rango.
   - **Única excepción**: selectores/opciones de catálogos administrados pequeños (decenas de registros activos).

2. **Normalización simétrica de texto en escritura y filtros**:
   - Aplicar la misma función `normalizeOptional(text)` (`trim()`, retornando `null` si queda vacío) tanto al guardar entidades como antes de armar predicados de búsqueda. Pasar cadenas crudas con espacios accidentales al borde rompe coincidencias exactas y por prefijo.
   - **Identificadores y códigos** (número de expediente, póliza, código de sede): buscar por **prefijo** (`STARTS WITH` / `LIKE 'valor%'`), aprovechando índices B-tree (`INDEX SEEK`).
   - **Nombres libres** (personas, organizaciones, ubicaciones): buscar por **fragmento** (`CONTAINS`) usando una colación insensible a mayúsculas y tildes (`Accent-Insensitive`), escapando comodines (`\`, `%`, `_`, `[`) y parametrizando siempre el valor.

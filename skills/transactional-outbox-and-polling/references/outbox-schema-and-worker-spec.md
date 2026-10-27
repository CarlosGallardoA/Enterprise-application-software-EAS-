# Especificación Técnica de Tabla Outbox, Claim Atómico y Worker

## 1. Esquema de `OutboxMessages` (entidad técnica, no hereda `AuditableEntity`)

| Columna | Tipo lógico | Propósito |
| --- | --- | --- |
| `id` | UUID (PK) | Identificador único estable del evento (`eventId`). |
| `messageType` | Texto(200) | Nombre estable versionado (`app.dominio.evento.v1`). |
| `schemaVersion` | Entero | Versión entera del esquema del payload (`1`, `2`...). |
| `payloadJson` | Texto largo | Carga útil mínima serializada (secretos cifrados previamente). |
| `aggregateType` | Texto(100) | Nombre lógico del agregado raíz (`Incident`, `User`, `Claim`). |
| `aggregateId` | UUID nullable | Identificador del agregado para trazabilidad operativa. |
| `occurredAtUtc` | Timestamp UTC | Instante exacto del hecho de negocio. |
| `availableAtUtc` | Timestamp UTC | Cuándo puede reclamarse (inmediato al crear; futuro en backoff). |
| `attemptCount` | Entero | Intentos realizados hasta el momento (`0` al encolar). |
| `lockedBy` | UUID nullable | Identificador del worker que posee el lease actual. |
| `lockedUntilUtc` | Timestamp UTC nullable | Vencimiento del lease actual para recuperación ante caídas. |
| `processedAtUtc` | Timestamp UTC nullable | Cuándo terminó con éxito. |
| `deadLetteredAtUtc` | Timestamp UTC nullable | Cuándo agotó intentos o falló por esquema/tipo inválido. |
| `lastError` | Texto(4000) nullable | **Solo el nombre del tipo de excepción/código**, sin stack ni datos sensibles. |
| `correlationId` | Texto(100) nullable | `traceId` / correlación de la petición origen. |
| `causationId` | UUID nullable | Evento o comando causante. |
| `actorUserId` | UUID nullable | Usuario autenticado que originó la operación. |

### Índices requeridos
1. **Disponibilidad para claim**: `(processedAtUtc, deadLetteredAtUtc, availableAtUtc)`.
2. **Recuperación de leases vencidos**: `(lockedUntilUtc)`.
3. **Retención/purga**: `(occurredAtUtc)`.
4. **Diagnóstico por expediente**: `(aggregateId)`.

---

## 2. Claim atómico con Lease (cero colisión entre workers)

Nunca hacer `SELECT` en aplicación seguido de `UPDATE` separado: dos instancias o dos procesos solapados durante un reciclado reclamarían el mismo mensaje.

### Patrón SQL atómico
Seleccionar lote elegible (`processedAtUtc IS NULL AND deadLetteredAtUtc IS NULL AND availableAtUtc <= :now AND (lockedUntilUtc IS NULL OR lockedUntilUtc <= :now)`) ordenado por `(availableAtUtc, occurredAtUtc)` usando bloqueo de fila con salto de filas bloqueadas:
- **SQL Server**: CTE con `TOP (@batchSize)` + `WITH (UPDLOCK, READPAST, ROWLOCK)` actualizada con `UPDATE ... OUTPUT INSERTED.*`.
- **PostgreSQL**: CTE con `FOR UPDATE SKIP LOCKED LIMIT :batchSize` actualizada con `UPDATE ... RETURNING *`.

Confirmar el claim de inmediato en una transacción cortísima y **ejecutar los efectos externos fuera de la transacción de base de datos**.

---

## 3. Reintentos, Backoff, Dead-Letter y Purga

- **Fórmula de backoff exponencial**:
  `delay = min(maxRetrySeconds, baseRetrySeconds * 2^(attemptCount - 1))` + jitter aleatorio pequeño en producción (estrategia determinista inyectable en tests mediante proveedor de tiempo).
- **Valores base recomendados** (validados al iniciar la aplicación):
  - `pollingIntervalSeconds = 2`, `batchSize = 25`, `leaseSeconds = 120`, `maxAttempts = 8`, `baseRetrySeconds = 5`, `maxRetrySeconds = 900`, `processedRetentionDays = 30`, `purgeIntervalHours = 24`.
- **Aislamiento de fallos en lote**: si el mensaje #3 del lote lanza excepción, se reprograma o envía a dead-letter individualmente sin abortar los mensajes #4..#25.
- **Regla sagrada de limpieza**: el job de purga borra únicamente filas con `processedAtUtc < now - retentionDays` y `deadLetteredAtUtc IS NULL`. Los mensajes en dead-letter **jamás** se eliminan solos.

---

## 4. Cuándo evaluar pasar del Outbox SQL a un Broker Externo

Mantener Outbox SQL + worker integrado mientras el sistema sea un monolito modular. Evaluar un broker externo (Service Bus, RabbitMQ, Kafka) **únicamente** ante evidencia medida de:
1. Múltiples microservicios desplegados independientemente que consumen los mismos hechos.
2. Consumidores externos fuera de la frontera del sistema.
3. Volumen sostenido donde el polling SQL del Outbox sea un cuello de botella medido.
4. Necesidad de aislar en procesos distintos cargas pesadas (escaneo antimalware o inferencia pesada) que no deban compartir memoria/CPU con la API.

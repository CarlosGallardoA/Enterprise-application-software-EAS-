# Runbook Operativo del Outbox Transaccional

Plantilla de procedimientos de soporte para operar el Outbox en producción sin requerir una pantalla administrativa dedicada.

## 1. Lectura de Salud (`Health Checks`)

- **`GET /health/live`**: público; comprueba únicamente que el proceso responde (no toca base de datos).
- **`GET /health/ready`**: público agregado; verifica conectividad a base de datos y que el procesador Outbox no esté degradado, sin filtrar conteos internos.
- **`GET /health/details`** *(protegido con permiso administrativo)*: expone `pendingCount`, `oldestPendingAgeSeconds`, `deadLetterCount` y `consecutiveProcessorFailures`.
  - Si `oldestPendingAgeSeconds` crece de forma sostenida con `consecutiveProcessorFailures == 0`, verificar que el proceso del servidor no esté entrando en suspensión por inactividad (*Idle Timeout*).

## 2. Diagnóstico de mensajes en `Dead-Letter`

Consultar sin exponer `payloadJson` en terminales compartidas cuando pueda contener datos sensibles:

```sql
SELECT id, message_type, aggregate_type, aggregate_id, attempt_count,
       occurred_at_utc, dead_lettered_at_utc, last_error, correlation_id
FROM outbox_messages
WHERE dead_lettered_at_utc IS NOT NULL
ORDER BY dead_lettered_at_utc DESC;
```

Cruzar `correlation_id` e `id` (`OutboxMessageId`) en los archivos de log estructurado para inspeccionar la causa exacta.

## 3. Reencolado manual seguro (Checklist previo obligatorio)

**Antes de reencolar un mensaje cuyo consumidor dispara un efecto externo (ej. correo o notificación a terceros)**:
1. Verificar en la tabla de intentos/despachos o en el buzón/sistema externo si el efecto **ya salió** antes del fallo que impidió marcar `processed_at_utc`.
2. Si el efecto ya ocurrió y no debe repetirse, resolver el estado de negocio manualmente según el procedimiento auditado y no reencolar a ciegas.
3. Si se confirma seguro reejecutarlo, reencolar dentro de una transacción explícita acotada por `id`:

```sql
UPDATE outbox_messages
SET dead_lettered_at_utc = NULL,
    locked_by = NULL,
    locked_until_utc = NULL,
    attempt_count = 0,
    available_at_utc = CURRENT_TIMESTAMP,
    last_error = NULL
WHERE id = :messageId
  AND dead_lettered_at_utc IS NOT NULL;
```

## 4. Pausa operativa de emergencia

Para detener temporalmente el despacho (por ejemplo, caída prolongada del proveedor de correo o mantenimiento externo) sin perder ningún evento nuevo:
1. Configurar la variable de entorno del servicio `Outbox__Enabled = false` y reciclar el proceso.
2. Las transacciones de negocio seguirán confirmando y almacenando filas en `outbox_messages` con normalidad.
3. Al restablecer `Outbox__Enabled = true`, el procesador drenará el backlog acumulado en orden cronológico respetando `batchSize`.

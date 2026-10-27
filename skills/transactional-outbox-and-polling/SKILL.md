---
name: transactional-outbox-and-polling
description: >-
  Úsala al diseñar o implementar efectos secundarios confiables (envío de correos,
  generación de PDFs, notificaciones, integraciones asíncronas), procesos periódicos
  en segundo plano (vigilancia de SLA, limpieza) o actualizaciones en vivo en el
  frontend (sondeo disciplinado frente a proxies restrictivos). Activators: outbox
  transaccional, eventos durables, background jobs, SLA sweep, polling, tiempo real,
  SSE, WebSockets, idempotencia, dead-letter, at-least-once.
---

# Eventos Durables (Outbox Transaccional), Jobs de Fondo y Sondeo Resiliente (`transactional-outbox-and-polling`)

Resuelve la asincronía, los efectos secundarios críticos y la actualización en vivo dentro de un monolito modular **sin introducir prematuramente brokers externos** (Kafka, RabbitMQ, Service Bus) ni depender de conexiones HTTP persistentes que fallan detrás de proxies institucionales.

## Cuándo activar esta skill

- Cuando una operación de negocio necesita disparar un efecto externo (correo, documento, webhook, escaneo) que **no puede perderse** si el proceso muere justo después del commit.
- Cuando el paso del tiempo exige reaccionar sin intervención humana (vencimientos de SLA, alertas preventivas, purgas).
- Cuando una pantalla necesita reflejar novedades o revocaciones de permisos sin que el usuario pulse F5.

## Las 3 preguntas distintas (nunca mezclar sus mecanismos)

| Pregunta | Mecanismo correcto | Garantía |
| --- | --- | --- |
| *«Ya ocurrió algo: quien mira esta cola activa quiere notarlo sin recargar»* | **Sondeo disciplinado en cliente (`PollScheduler`)** + endpoint liviano. | Refuerzo de UX (se pausa en pestañas ocultas). |
| *«Nadie hizo clic, pero venció un plazo y hay que reaccionar»* | **Worker periódico de barrido (`Sweep Job`)** en el mismo proceso. | Eventual en el próximo ciclo del temporizador + marcas idempotentes `*NotifiedAtUtc`. |
| *«Este efecto secundario debe ocurrir sí o sí tras confirmar el cambio principal»* | **Outbox Transaccional en la misma base de datos** + worker procesador con leases. | **Entrega al menos una vez (`at-least-once`)** con reintentos, backoff y dead-letter. |

### Qué debe permanecer SIEMPRE síncrono
Autenticación, autorización, validación de reglas y transiciones de estatus, asignación de números correlativos de secuencia, decisiones humanas, auditoría del cambio y validaciones básicas de archivos forman parte del resultado oficial que el usuario espera antes de recibir éxito: **se confirman juntos en la transacción principal y jamás se delegan a un consumidor asíncrono**.

## Flujo de implementación por mecanismo

### A. Agregar un evento durable al Outbox Transaccional

1. **Unidad transaccional completa**: asegurar que generación de secuencia + mutación del agregado + bitácora + notificaciones + `OutboxWriter.enqueue(...)` ocurran **antes** del único `commit` de la transacción. `OutboxWriter` solo registra la fila pendiente en la unidad de trabajo; nunca hace commit por su cuenta.
2. **Contrato de evento explícito y versionado**:
   - Ubicado en `features/<feature>/events/<Nombre>V1`.
   - `eventType` estable en texto con namespace y versión (`<app>.<dominio>.<hecho>.v1`), **nunca** nombres de clase o ensamblado del lenguaje.
   - Payload mínimo (solo IDs y metadatos indispensables; si transporta un secreto efímero como un código de un solo uso, cifrarlo con protección autenticada ligada a propósito + usuario antes de persistir, y jamás escribir `payloadJson` en logs).
3. **Consumidor idempotente (`at-least-once`)**:
   - Un fallo entre ejecutar el efecto externo y marcar el mensaje como procesado provocará una reentrega legítima.
   - Diseñar siempre una clave de negocio o tabla de despacho que evite duplicados dañinos.
   - **Patrón ante envíos externos inciertos** (ej. correo o pago que da timeout después de abrir red): reservar un registro activo único antes de llamar al proveedor; si falla *antes* de salir a red, permitir reintento automático; si agota tiempo *durante* la llamada externa, marcar estado `Uncertain`, detener el reintento ciego y exponer resolución humana auditada.
4. **Doble registro explícito**:
   - Registrar el handler en el contenedor DI (`Scoped`) y registrar `eventType -> deserializador + handler` en una **lista blanca explícita** del `OutboxDispatcher` (jamás deserialización polimórfica abierta ni reflexión sobre nombres leídos de la base).
5. Ver el esquema completo de tabla, índices, SQL de claim atómico con lease y runbook operativo en:
   - [outbox-schema-and-worker-spec.md](./references/outbox-schema-and-worker-spec.md)
   - [outbox-operations-runbook.md](./references/outbox-operations-runbook.md)

### B. Implementar un Worker Periódico (`Sweep Job`)

1. El servicio hospedado (`Singleton`) es un adaptador delgado con temporizador periódico:
   - En cada vuelta crea un **nuevo alcance DI (`Scope`)** para resolver el caso de uso y su unidad de trabajo de base de datos (nunca inyectar repositorios `Scoped` directo en el constructor `Singleton`).
   - Envuelve cada vuelta en `try / catch` (excluyendo la cancelación de apagado del host) registrando el fallo sin derribar el proceso completo.
2. Toda la lógica de negocio vive en un caso de uso normal de `application`, testeable en milisegundos con fakes en memoria y reloj falso.
3. Procesa candidatos en lotes acotados (`LIMIT`) y estampa marcas `*NotifiedAtUtc` en la misma transacción que la notificación para no repetir avisos en la vuelta siguiente.

### C. Implementar Sondeo Disciplinado en el Cliente (`PollScheduler`)

Los proxies reversos corporativos e institucionales suelen retener sesiones o bloquear pestañas ante respuestas HTTP infinitas (SSE / WebSockets). En su lugar:

1. Usar un único servicio raíz `PollScheduler` (nunca `setInterval` sueltos en componentes) que garantice:
   - Ejecución **solo mientras `document.visibilityState === 'visible'`**, disparando refresco inmediato al volver a primer plano.
   - **Jitter (±15 %)** para desincronizar pestañas y **backoff (×3)** tras 10 minutos sin interacción del usuario.
   - **Cero solape**: si una petición tarda más que el intervalo, el siguiente ciclo espera a que termine.
   - Baja obligatoria al destruir el componente.
2. **Pedir lo mínimo y nunca mover filas bajo el cursor**:
   - Fusionar señales globales (sesión vigente + contador de notificaciones) en un único `GET /shell/heartbeat` cada ~60 s **más** un refresco asíncrono en cada cambio de ruta (`NavigationEnd`) para que una revocación de permisos surta efecto de inmediato.
   - En colas operativas activas (~30 s), consultar solo `pageSize: 1` para comparar `totalCount` y mostrar un banner *«Hay cambios disponibles — Actualizar»* en vez de reordenar la tabla bajo el puntero del usuario.
   - **No sondear** pantallas de consulta puntual, catálogos o formularios estáticos.
3. Ver especificación completa en [client-poll-scheduler-spec.md](./references/client-poll-scheduler-spec.md).

## Verificación obligatoria

- [ ] Rollback de transacción revierte tanto el cambio de negocio como la secuencia y el mensaje Outbox (probado contra BD real).
- [ ] Dos workers concurrentes nunca reclaman el mismo mensaje Outbox; un lease vencido se recupera automáticamente.
- [ ] Mensajes que superan `MaxAttempts` pasan a `DeadLetteredAtUtc` y la tarea de purga periódica **jamás** borra filas en dead-letter.
- [ ] Las pruebas E2E de notificaciones y colas usan esperas eventuales y confirman que no se duplican avisos tras múltiples heartbeats.

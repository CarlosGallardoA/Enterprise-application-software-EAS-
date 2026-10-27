# Especificación del Planificador Central de Sondeo (`PollScheduler`) y Heartbeat

## 1. Contrato de la primitiva `PollScheduler`

Un único servicio singleton en `core/polling/` centraliza todos los temporizadores de refresco de la aplicación:

```text
interface PollScheduler {
    register(task: () => Promise<void>, intervalMs: number): () => void
}
```

### Invariantes de implementación

1. **Conciencia de visibilidad (`visibilitychange`)**:
   - Si `document.visibilityState !== 'visible'`, ningún ciclo dispara peticiones HTTP.
   - Al transicionar de oculto a `'visible'`, si ya transcurrió el intervalo desde la última corrida (o nunca corrió en visible), ejecuta **de inmediato** para eliminar datos obsoletos al regresar a la pestaña.
2. **Desincronización (`Jitter ±15 %`)**:
   - Cada próximo ciclo calcula `effectiveDelay = baseInterval * backoffFactor * randomBetween(0.85, 1.15)` evitando ráfagas sincronizadas (*thundering herd*) entre pestañas o clientes.
3. **Degradación por inactividad (`Idle Backoff ×3`)**:
   - Escuchar de forma pasiva (`{ passive: true }`) `mousemove`, `keydown`, `click`, `scroll` y `touchstart` (con *throttle* ligero para no recalcular en cada píxel).
   - Tras 10 minutos sin actividad humana, multiplicar el intervalo por `3`. Al primer gesto del usuario, restaurar el factor `1`.
4. **Exclusión mutua por tarea (`isRunning`)**:
   - Cada registro conserva su bandera `isRunning`. Si una petición lenta sigue en vuelo cuando vence el temporizador, no se inicia una segunda copia en paralelo; el siguiente plazo se agenda al concluir el `finally` de la ejecución actual.
5. **Limpieza determinista**:
   - La función `unregister()` devuelta cancela su temporizador pendiente e impide nuevas reprogramaciones aunque una promesa en curso resuelva milisegundos después de destruir el componente.

---

## 2. Patrón Heartbeat Unificado + Refresco en Navegación

En lugar de mantener un sondeo para permisos/sesión y otro separado para el contador de alertas:

1. **Endpoint único liviano (`GET /api/v1/shell/heartbeat`)**:
   - Devuelve en una sola lectura la sesión vigente (roles, permisos activos) y el contador de notificaciones no leídas.
   - En el servidor, optimizar el caso común: si el conteo rápido indexado `(recipientId, isRead = false)` da `0`, responder de inmediato sin consultas adicionales de alcance organizacional; además, clasificar esta ruta en nivel `Debug` en el middleware de logs de peticiones para no inundar el archivo diario con sondeos `200 OK`.
2. **Doble disparador en el contenedor principal (`Shell`)**:
   - Ciclo periódico vía `PollScheduler` cada **60 segundos**.
   - Disparo asíncrono inmediato en cada evento `NavigationEnd` del router (sin bloquear la transición visual): si un administrador acaba de revocar un permiso del usuario actual, el store de sesión se actualiza al instante y el guard redirige a `/acceso-denegado` sin esperar al minuto ni pedir F5.

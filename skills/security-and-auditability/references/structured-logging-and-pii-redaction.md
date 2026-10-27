# Logs Estructurados, Correlación `traceId` y Redacción de PII

## 1. Qué se registra y dónde

Distinguir siempre dos canales con propósitos distintos:
1. **Auditoría de negocio (en base de datos)**: quién creó, editó, consultó evidencia sensible o cambió estatus de un expediente. Participa en la transacción SQL.
2. **Log operativo estructurado (archivos JSON por línea / CLEF)**:
   - Cada petición HTTP: método, ruta **sin query string**, código de estado, duración en ms, `RequestId`, IP cliente y `UserId` autenticado. Sondeos frecuentes (`/health/*`, `/heartbeat`, colas) se registran en nivel `Debug` para no saturar disco.
   - Excepciones no controladas (`500`): registran el evento `Error` con el mismo `RequestId` que el usuario recibe como `traceId`.
   - Eventos de seguridad en controladores de acceso: inicios/cierres de sesión e intentos fallidos (las trazas operativas de negocio viven en casos de uso o infraestructura, no en controladores).
   - Procesamiento de Outbox y jobs de fondo: IDs de mensaje, tipo, intento, duración y **únicamente el nombre del tipo de excepción** cuando falla.
   - Rotación diaria + tope de tamaño por archivo (ej. 100 MB), retención acotada (ej. 31 archivos) y apertura en modo compartido (`shared`) para no perder líneas durante reciclados solapados del servidor.

## 2. Lista negra absoluta (lo que NUNCA entra a un log)

- Contraseñas, hashes o secretos de cliente.
- Códigos de recuperación o verificación de un solo uso.
- Tokens de acceso/refresco, encabezados `Authorization`, cookies o claves criptográficas.
- Cuerpos crudos de `request` o `response` y cadenas de consulta (`query strings`).
- `payloadJson` completo de mensajes Outbox ni contenido clínico, personal o documental.

## 3. Ingesta segura de errores no controlados del navegador

Para diagnosticar fallos reales del cliente sin herramientas invasivas de terceros:
1. El manejador global de errores del frontend envía `POST /api/v1/diagnostics/client-errors` con mensaje, stack recortado, ruta **sin query ni hash**, versión de compilación y `traceId` del `500` asociado si existe.
2. **Protecciones en cliente**: ignorar caídas de red, deduplicar el mismo error en la misma ruta y fijar un tope estricto (p. ej. máx. 10 reportes por carga de página).
3. **Protecciones en servidor**: endpoint anónimo que acepta solo JSON con tamaño acotado, *rate limit* estricto por IP (p. ej. 30/min), truncado de cada campo y **redacción previa** con expresiones regulares seguras sin backtracking (`NonBacktracking` + timeout) que reemplazan query strings, correos electrónicos, secuencias numéricas largas y tokens reconocibles antes de escribir en el log estructurado.

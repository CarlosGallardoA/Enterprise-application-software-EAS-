# Controles de Autenticación, Sesiones Revocables, Permisos y Anti-IDOR

## 1. Arquitectura de Sesión Revocable con Sello de Seguridad

Las cookies firmadas puramente sin estado (*stateless*) tienen dos debilidades graves en sistemas institucionales: un `logout` no invalida una cookie ya copiada, y quitar un rol/permiso no surte efecto hasta que caduque el ticket.

### Solución
1. Mantener un **almacén de tickets en servidor** acotado en memoria (si corre en un único proceso) o en un almacén compartido revocable (si hay múltiples nodos).
2. Al emitir la sesión, grabar dentro del ticket la `securityVersion` actual del usuario y una fecha de expiración absoluta máxima (ej. 14 días).
3. En cada petición autenticada, el validador de sesión consulta sin caché el sello vigente del usuario (compuesto por estado `isActive`, sello de contraseña/credencial y huella de roles/permisos asignados). Si difiere del grabado en el ticket, rechaza e invalida la sesión antes de llegar al controlador.

## 2. Permisos en Base de Datos y Separación de Sensibilidad

- Los códigos de permiso siguen un vocabulario en minúsculas separado por puntos (`sistema.modulo.accion`) definido en constantes únicas y sembrado por migración.
- Las políticas de autorización delegan en un lector de permisos (decorable con caché corta de ~30 s invalidada explícitamente al editar usuarios o roles).
- **Endurecimiento para administración de identidades**: gestionar usuarios y roles exige, además del permiso funcional, poseer activamente el rol `Administrator`, impidiendo escalación horizontal desde roles delegados.
- **Consistencia jerárquica al asignar alcances**: validar siempre en `application` que la combinación `Región → Municipio/Distrito → Sede/Unidad` pertenezca realmente a la misma rama jerárquica antes de persistir.

## 3. Recuperación de Contraseña sin Condiciones de Carrera ni Enumeración

1. **Derivación HMAC dedicada**: derivar una subclave de 256 bits con propósito exclusivo + `userId` para calcular `HMAC-SHA-256(codigo)` y comparar con `FixedTimeEquals` / tiempo constante.
2. **Serialización transaccional por cuenta**: adquirir un bloqueo de aplicación ligado a la transacción (`pg_advisory_xact_lock` / `sp_getapplock`) sobre la clave `PasswordReset:{userId}` antes de leer intentos vigentes, registrar un fallo o consumir el código. Garantiza matemáticamente que 20 peticiones paralelas no superen el tope de 5 intentos ni confirmen dos veces el mismo código.
3. **Límites de tasa duales**: aplicar *rate limiting* tanto por cuenta normalizada como por dirección IP de origen en login, solicitud de código y confirmación.

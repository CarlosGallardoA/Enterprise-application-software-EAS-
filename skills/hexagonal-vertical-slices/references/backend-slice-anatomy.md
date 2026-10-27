# Anatomía de un Vertical Slice en Backend

## Las 3 formas válidas de organizar `features/` (nunca mezclar 1 y 2 en la misma carpeta)

1. **Forma 1 — Carpeta por caso de uso (por defecto)**:
   - Ruta: `features/<feature>/<use-case>/<use-case>.<ext>` + `<use-case>/ports/`.
   - El comando/consulta, el resultado tipado, la interfaz del caso de uso y su manejador conviven en **un único archivo** cohesivo (no partir 4 tipos acoplados en 4 archivos artificiales).
   - Usar siempre que el caso de uso tenga lógica de negocio propia o puertos específicos.

2. **Forma 2 — Agrupada plana por entidad/sub-feature (solo CRUD pequeño)**:
   - Ruta: `features/<feature>/<sub-feature>/create-x.<ext>`, `update-x.<ext>`, `list-x.<ext>` + un único `<sub-feature>/ports/` compartido.
   - Reservada exclusivamente a catálogos o entidades simples cuyas operaciones de 3–5 líneas operan sobre la misma entidad y comparten exactamente el mismo puerto.

3. **Forma 3 — Puerto o DTO compartido**:
   - Dentro de una misma feature (o consumido por otra feature cuando el contrato sigue teniendo dueña clara): `features/<feature>/shared/` y `features/<feature>/shared/ports/`.
   - Entre 2+ features independientes **sin una feature dueña razonable** (ej. reloj, usuario actual, bitácora transversal, escritor de Outbox, emisor de correo): `common/<concern>/`. Nunca convertir `common/` en un cajón de sastre.

## Categorías explícitas que NO son casos de uso estándar

No forzar todo contrato a parecer un comando de usuario:
- **Consumidores de eventos durables (Outbox)**: implementan `OutboxMessageHandler<TEvent>`, nombrados por el efecto que ejecutan (`SendPasswordResetEmail`), invocados por el procesador de fondo y nunca por un controlador HTTP.
- **Políticas de acceso y lectores de opciones**: servicios reutilizables que proyectan opciones para selectores o validan alcance/permisos (`CheckRecordAccess`, `ListCategoryOptions`), consumidos por controladores u otros casos de uso.
- **Servicios puros de dominio en `application`**: cuando varios casos de uso comparten orquestación de reglas de `domain` sin tocar infraestructura, viven junto a su contrato dentro de la feature sin fingir ser un puerto externo.

## Tabla rápida: ¿dónde va cada pieza?

| Qué agregas | Ubicación | Regla clave |
| --- | --- | --- |
| Invariante sobre una entidad | `domain/<agregado>/` | Guard dentro del método de negocio de la entidad; nunca suelto en el controlador. |
| Caso de uso nuevo | `application/features/<feature>/<use-case>/` | Recibe puertos por constructor; libre de tipos HTTP o de base de datos. |
| Puerto nuevo | `.../ports/` del caso de uso o `shared/ports/` | Interfaz nombrada por capacidad de negocio. |
| Adaptador de persistencia | `infrastructure/persistence/` | Visibilidad interna al módulo; implementa el puerto 1:1. |
| Integración externa (correo, IDP, pagos) | `infrastructure/<concern>/` | Aísla SDKs externos, timeouts, reintentos de red y mapeos de protocolo. |
| Controlador / Endpoint HTTP | `api/features/<feature>/` | Delgado: valida transporte, invoca 1 caso de uso y mapea respuesta/error. |
| Contratos de entrada/salida HTTP | `api/features/<feature>/contracts/` | Separados de los modelos internos para evolucionar sin romper clientes. |
| Políticas de autorización | `api/authorization/` | Revalidan permisos contra lectura viva en servidor (o caché corta invalidable), nunca confiando a ciegas en claims estáticos de sesión. |
| Enlace DI (wiring) | Raíces de composición dedicadas | Una extensión para adaptadores (`infrastructure`), otra para casos de uso (`api/composition`), y un archivo de arranque lineal sin `if` de negocio. |

## Patrón Decorator para preocupaciones transversales (caché, logging, resiliencia)

Nunca ensuciar un caso de uso ni un repositorio SQL con lógica de caché o métricas. Envolver el puerto en `infrastructure`:

```text
CasoDeUso ──► PuertoLectura (interfaz)
                   ▲
         DecoradorConCache (revisa caché; delega a inner)
                   │
         AdaptadorBaseDatos (consulta real sin tracking)
```

### Regla de oro para cachear catálogos en memoria sin condiciones de carrera
Usar un **contador de generación por catálogo**:
1. Antes de ir a la base de datos, el lector captura la generación actual `gen = store.getGeneration(catalog)` y almacena el resultado inmutable (`AsNoTracking` / solo lectura) bajo la clave `catalog:v{gen}`.
2. Al completar exitosamente una escritura (`add`/`saveChanges`) sobre ese mismo repositorio decorado, se incrementa atómicamente `store.incrementGeneration(catalog)`.
3. Así, un lector lento que leyó antes del commit escribe en `v1` y jamás pisa `v2` con datos obsoletos.
4. **Restricción**: nunca mutar ni adjuntar al ORM instancias devueltas desde una caché compartida entre peticiones; para editar un registro por ID, leerlo directo de la base sin pasar por la caché de listado. Documentar siempre si la caché es local al proceso (exige 1 worker o invalidación distribuida al escalar horizontalmente).

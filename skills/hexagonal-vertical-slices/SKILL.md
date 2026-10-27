---
name: hexagonal-vertical-slices
description: >-
  Úsala al diseñar, agregar, mover o refactorizar módulos, casos de uso, puertos,
  adaptadores, controladores o pantallas aplicando Arquitectura Hexagonal (Ports &
  Adapters) + Vertical Slicing simétrica tanto en backend como en frontend.
  Activators: arquitectura hexagonal, vertical slicing, ports and adapters,
  crear caso de uso, dónde va este archivo, fronteras entre features, composition root,
  clean architecture, feature boundaries.
---

# Arquitectura Hexagonal + Vertical Slicing Simétrica (`hexagonal-vertical-slices`)

Guía operativa para organizar y conectar cualquier funcionalidad en backend y frontend combinando dos ejes simultáneos y 100 % independientes de framework:

- **Hexagonal (Ports & Adapters)** responde *«¿qué puede depender de qué?»* (dirección estricta hacia adentro).
- **Vertical Slicing** responde *«¿dónde vive una capacidad de negocio?»* (cada funcionalidad es dueña de sus casos de uso y sus puertos, sin carpetas horizontales gigantescas `interfaces/` o `services/`).

## Cuándo activar esta skill

- Antes de agregar cualquier caso de uso, entidad, puerto, adaptador, endpoint HTTP, componente UI, store o ruta nueva.
- Al revisar o auditar si una dependencia cruza fronteras prohibidas entre capas o entre features.
- Al envolver un puerto con comportamiento transversal (caché, reintentos, telemetría) sin contaminar el caso de uso.

## Regla obligatoria antes de tocar código

1. Identificar el **slice dueño** de la capacidad y la **capa exacta** de cada pieza antes de crear archivos.
2. Localizar un slice equivalente ya implementado en el repositorio y seguir su forma exacta.
3. Si una necesidad parece exigir importar otro slice o saltarse una capa: **detenerse**. Definir primero el puerto correspondiente, promover el contrato mínimo al kernel compartido (`core` / `Common`) solo si existe un **segundo consumidor real**, o conectar ambos slices en la raíz de composición (`composition/`). Jamás usar reexports, imports directos a adaptadores concretos ni supresiones permanentes de linter.

## Dirección universal de dependencias

```text
Entrada (API HTTP / CLI / UI) ─────────┐
                                       │  Raíces de composición
Infraestructura (BD / HTTP / SDKs) ────┤  (únicos lugares donde se enlazan
                                       │   clases concretas con puertos)
Dominio ◄──── Aplicación (Casos de Uso + Puertos)
```

| Capa | Contiene | Prohibido contener o importar |
| --- | --- | --- |
| `domain` | Entidades, objetos de valor, invariantes y reglas puras del negocio. | Frameworks web, ORM/SQL, clientes HTTP, DOM, inyección de dependencias. |
| `application` | Casos de uso (orquestación), comandos/consultas, resultados tipados y **puertos** (interfaces que necesita del exterior). | ORM, consultas SQL/IQueryable, objetos de transporte HTTP (`Request`/`Response`/`Context`), componentes UI o routers. |
| `infrastructure` | Adaptadores concretos que implementan los puertos 1:1 (repositorios BD, clientes HTTP/OAuth, cifrado, Outbox) y tokens de composición. | Reglas de negocio, orquestación de casos de uso o lógica de presentación. |
| `api` / `ui` | Adaptadores de entrada (controladores HTTP, componentes visuales, stores reactivos de vista, guards) y raíces de composición. | Reglas de negocio, acceso directo a base de datos o a clientes HTTP sin pasar por el caso de uso/puerto del slice. |

## Simetría entre Backend y Frontend

| Concepto | Backend | Frontend |
| --- | --- | --- |
| Reglas puras | `domain/<agregado>/` | `features/<feature>/domain/` *(opcional: solo si hay reglas puras en cliente)* |
| Casos de uso | `application/features/<feature>/<use-case>/` | `features/<feature>/application/` |
| Puertos | `.../ports/` dentro del caso de uso o sub-feature | `features/<feature>/application/ports/` |
| Adaptadores | `infrastructure/<concern>/` | `features/<feature>/infrastructure/<concern>/` |
| Entrada | `api/features/<feature>/` (controladores + contratos wire) | `features/<feature>/ui/` (componentes, stores de UI, guards) |
| Kernel compartido | `application/common/<concern>/` (solo sin feature dueña) | `core/<concern>/` (solo al aparecer el 2.º consumidor real) |
| Composición | `DependencyInjection` + `ApplicationComposition` + arranque | `app.config` (global) + rutas shell + rutas diferidas de cada feature |

Consulta las recetas detalladas y tablas de decisión en:
- [backend-slice-anatomy.md](./references/backend-slice-anatomy.md) — las 3 formas válidas de carpeta, contratos de salida, decoradores con invalidación generacional y composición.
- [frontend-slice-anatomy.md](./references/frontend-slice-anatomy.md) — las 4 capas de una feature en cliente, stores con puertos segregados lectura/escritura (`QueryPort`/`CommandPort`), alcance de rutas diferidas y criterio CRUD maestro-detalle vs ruta separada.

## Receta rápida para una funcionalidad nueva de punta a punta

1. **Dominio**: agregar o extender la entidad/objeto de valor protegiendo sus invariantes en el constructor y en métodos de negocio cohesivos (nunca setters anémicos sueltos).
2. **Puertos (`application`)**: definir la interfaz mínima que el caso de uso requiere, nombrada por **capacidad** (`OrderRepository`, `PaymentGateway`), jamás por tecnología (`SqlOrderRepository`, `StripeService`). Separar puertos de escritura (con tracking/transacción) de puertos de lectura paginada/proyectada cuando sus formas difieran.
3. **Caso de uso (`application`)**: implementar una clase/función plana que recibe sus puertos e inyecta el proveedor de tiempo cuando aplique, orquesta la operación y devuelve un resultado tipado (`Outcome + FailureEnum`).
4. **Adaptador (`infrastructure`)**: implementar el puerto 1:1 manteniendo visibilidad interna al módulo siempre que el lenguaje lo permita.
5. **Entrada (`api` / `ui`)**:
   - En API: parsear contrato de wire, invocar **un solo** caso de uso y traducir el resultado a HTTP (`ApiFailureResponse` en fallas de negocio).
   - En UI: invocar el caso de uso o store de UI mediante su puerto/token, nunca el adaptador HTTP directo.
6. **Composición por alcance**: enlazar puerto → adaptador y caso de uso en la raíz de composición del alcance exacto (global solo para sesión/transporte transversal; nivel de ruta diferida para features de pantalla). Si una clase concreta implementa dos puertos (ej. `SessionQueryPort` y `SessionCommandsPort`), instanciarla **una sola vez** y redirigir ambos puertos a esa misma instancia.
7. **Pruebas y validación de fronteras**: agregar las pruebas por capa (`layered-testing-strategy`) y ejecutar el validador automático de fronteras.

## Verificación automática de fronteras

Ejecutar el script incluido (sin dependencias externas, Node >= 18) contra una configuración adaptada desde [boundaries.config.example.json](./resources/boundaries.config.example.json):

```bash
node <ruta-skill>/scripts/check-architecture-boundaries.mjs --config ./boundaries.config.json
```

Checklist manual complementario al revisar el diff:
- [ ] Cero imports entre features hermanas (`features/a` no importa `features/b`).
- [ ] `core/` o `common/` no importa ninguna feature.
- [ ] `domain` y `application` no importan `infrastructure`, ORM, transporte HTTP ni `ui`.
- [ ] `ui` no importa adaptadores concretos de `infrastructure` (únicamente tokens de composición).
- [ ] No se subieron providers propios de una ruta diferida al inyector global por comodidad.

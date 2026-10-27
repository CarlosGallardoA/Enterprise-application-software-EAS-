# Anatomía de un Vertical Slice en Frontend

## Estructura de una aplicación modular en cliente

```text
src/app/
├── core/                 # Shared kernel: sesión, navegación, i18n, errores, http, polling, componentes base
├── composition/          # Adaptadores puente que conectan dos slices sin acoplarlos entre sí
└── features/
    └── <feature>/
        ├── domain/         # Opcional: reglas/tipos puros sin depender del framework UI ni DOM
        ├── application/
        │   ├── ports/      # Interfaces que la feature necesita del exterior (*.port)
        │   └── *.use-case  # Clases/funciones planas sin decoradores del framework
        ├── infrastructure/
        │   ├── composition/ # Tokens de inyección (*.tokens) que identifican cada puerto
        │   └── http/        # Adaptadores concretos que implementan los puertos 1:1
        └── ui/             # Componentes, stores reactivos de vista y guards de ruta
```

## Reglas estrictas entre carpetas

1. **Cero imports entre features**: `features/reclamaciones` jamás importa nada de `features/incidentes`.
2. **`core/` jamás importa de `features/`**: la regla de promoción a `core/` exige al menos **2 features consumidoras reales** (nunca "por si acaso").
3. **Aislamiento intra-feature**:
   - `domain/` no importa ninguna otra capa ni el framework UI.
   - `application/` solo importa `domain/` y contratos puros de `core/`; prohibido importar `HttpClient`, `Router`, `DOM` o `ui/`.
   - `ui/` invoca casos de uso y lee tokens de `infrastructure/**/composition/*.tokens`; jamás importa un adaptador HTTP concreto.
4. **Agrupación de casos de uso triviales**:
   - Por defecto, un archivo `<accion>.use-case` por clase.
   - Se permite agrupar en `<entidad>.use-cases` (plural) **únicamente** cuando todas las clases delegan en 1 línea al mismo método de un único puerto, sobre la misma entidad, sin validación, transformación ni estado. En cuanto una requiere lógica propia, pasa a su propio archivo con su prueba unitaria dedicada.
5. **Sufijos semánticos para funciones/helpers puros**:
   - `-rule`: regla de negocio pura en `domain/` (entra valor, sale veredicto).
   - `-policy`: política de flujo en `application/` (qué se permite o qué paso sigue según el estado del agregado).
   - `-payload` (`build-<x>-payload`): construcción determinista del cuerpo de un comando desde el estado del formulario en `application/`.

## Dónde viven los Stores y el patrón de Doble Puerto

- Un **store** mantiene estado reactivo de interfaz (signals/atoms observables de solo lectura hacia afuera + métodos explícitos de mutación), por lo que vive en **`ui/`**, no en `application/`.
- Son clases planas instanciadas mediante fábrica en el alcance de la ruta que las usa (p. ej. el contenedor de un wizard o de una vista gestora), nunca globales por defecto salvo el estado transversal de sesión.
- **Segregación de interfaces (Doble Puerto)**: para un store consumido ampliamente (como la sesión activa), separar `SessionQueryPort` (solo lectura: usuario actual, permisos) de `SessionCommandsPort` (mutación: iniciar/cerrar/limpiar sesión). Registrar la instancia concreta **una sola vez** y enlazar ambos tokens a esa única instancia (`useExisting` / alias de referencia) para evitar duplicar el estado en memoria.

## Composición por alcance y carga diferida real (sin anular el code-splitting)

- **Nivel global (`app.config`)**: exclusivamente fontanería transversal (router con precarga ociosa `IdlePreloading`, cliente HTTP + cadena ordenada de interceptores, manejador global de errores, i18n base y el wiring mínimo de sesión requerido por `authGuard`). **Prohibido** registrar casos de uso o adaptadores de features aquí, ya que arrastraría sus módulos al bundle inicial.
- **Nivel de ruta shell autenticada (`''` en `app.routes`)**: wiring compartido por 2 o más features activas tras iniciar sesión (ej. notificaciones/heartbeat de la cabecera o borrador compartido), sin duplicarlo ni subirlo a `app.config`.
- **Nivel de ruta diferida (`loadChildren` → `<feature>.routes`)**: cada feature expone su archivo de rutas perezoso que declara sus propios `providers` (adaptador HTTP + casos de uso + stores de vista). Para librerías externas voluminosas de uso condicional (ej. SDK de login federado SSO/MSAL), el adaptador las carga con `import()` dinámico la primera vez que se invocan, nunca al iniciar la app.

## Criterio de UX arquitectónica: Maestro-Detalle inline vs. Ruta separada en CRUDs

Convivir con ambos patrones no es inconsistencia cuando obedece a la complejidad real de la entidad:
- **Maestro-Detalle en la misma vista**: catálogos planos o jerárquicos de pocos campos (≤ 6 campos, sin sub-secciones propias) donde el usuario edita varias filas seguidas y navegar a otra ruta degradaría la fluidez.
- **Rutas dedicadas (`/nuevo`, `/:id/editar`)**: entidades con múltiples secciones, selectores en cascada, asignaciones complejas o más de ~6 campos, permitiendo URLs enlazables, espacio limpio sin scroll interno forzado y protección contra salida con cambios sin guardar (`canDeactivate`).

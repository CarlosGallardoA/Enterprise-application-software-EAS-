---
name: layered-testing-strategy
description: >-
  Úsala al diseñar, escribir o depurar pruebas unitarias, de componentes/UI, de
  integración contra base de datos real o pruebas end-to-end (E2E): uso de fakes
  escritos a mano en vez de mocks frágiles, fixtures completas, traducciones reales
  en tests y bases de datos efímeras con limpieza obligatoria. Activators: tests,
  testing, pruebas unitarias, tests de integración, pruebas e2e, fakes en memoria,
  fixtures, cobertura, test strategy, disposable database.
---

# Estrategia de Pruebas por Capa y Datos Desechables (`layered-testing-strategy`)

Asegura que cada regla de negocio, contrato de integración y flujo real de usuario se pruebe en la capa más barata y honesta posible, con cero falsos positivos, cero mocks acoplados a detalles internos y cero bases de datos contaminadas.

## Cuándo activar esta skill

- Al implementar cualquier entidad de dominio, caso de uso, adaptador con lógica, componente/store o flujo entre pantallas (las pruebas son parte de la misma tarea, nunca trabajo diferido).
- Al diseñar o depurar suites de integración de base de datos o suites E2E de navegador.
- Siempre que una prueba existente o recién escrita falle durante el desarrollo o la refactorización.

## Ley Cero: Integridad Inquebrantable de las Pruebas (Prohibido Alterar Tests Solo para Pasar)

> **REGLA FATAL — NUNCA MAQUILLAR UN TEST PARA FORZAR EL VERDE**:
> Queda **terminantemente prohibido** modificar, debilitar, relajar, saltar (`skip`), borrar o acomodar las expectativas de una prueba simplemente para que pase cuando falla. Un test que falla puede estar señalando un **defecto real en el código de producción**; alterar el test para que coincida con la salida defectuosa oculta el bug y lo certifica falsamente hacia producción.

1. **Presunción obligatoria**: cuando un test falla (sea de regresión o recién escrito a partir del requerimiento), **asumir primero que el código de producción tiene un bug** e investigar la causa raíz contra la regla de negocio y el contrato arquitectónico.
2. **Prohibido escribir tests tautológicos**: al crear pruebas nuevas, derivar las aserciones de la especificación y los invariantes del dominio, **jamás** copiando a ciegas el valor que la implementación actual devuelve tras una corrida fallida.
3. **Prohibido debilitar aserciones o puentear controles**: nunca cambiar una comparación exacta por `toBeTruthy()`/`not null`, nunca desactivar filtros de seguridad/antiforgery, nunca mockear el colaborador que evidenció el error ni cambiar los datos del fixture para esquivar un caso borde real (tildes, espacios, límites, concurrencia).
4. **Única excepción válida para editar la expectativa de un test**: haber comprobado que el requerimiento de negocio cambió explícitamente en la tarea actual (o un error objetivo de infraestructura del propio arnés sin relación con la regla probada), manteniendo una aserción igual de estricta. Ante cualquier duda sobre si el test protegía una invariante real, **detenerse y consultar al usuario** antes de tocar el test.
5. Ver el catálogo completo de anti-patrones de manipulación y el protocolo de triaje en [test-integrity-and-triage.md](./references/test-integrity-and-triage.md).

## Matriz de decisión: ¿cómo se prueba cada capa?

| Capa | Técnica obligatoria | Qué prohibir |
| --- | --- | --- |
| **`domain` / reglas puras** | Pruebas unitarias puras directas sobre constructores, métodos e invariantes, sin contenedor DI ni arnés de UI. | Confiar solo en pruebas indirectas desde controladores. |
| **`application` (casos de uso)** | Pruebas unitarias rápidas usando **fakes en memoria escritos a mano** para los puertos (`new UseCase(fakeRepo, fakeClock)`). Todo caso de uso nuevo lleva al menos 1 test de camino principal (incluidos lectores simples). | Frameworks de mocking pesados acoplados al orden interno de llamadas; levantar base de datos o servidor HTTP para probar un caso de uso. |
| **`application` (delegación pura en cliente)** | Cuando varios casos de uso son simples pasamanos de 1 línea a un puerto sin validación ni ramificación, cubrirlos con **una sola prueba parametrizada por tabla** por feature. En cuanto uno gane lógica propia, pasa a su archivo de test individual. | Multiplicar archivos de boilerplate idénticos o dejarlos sin verificar reenvío de argumentos y propagación de error. |
| **`infrastructure` (adaptadores sin BD)** | Pruebas unitarias directas sobre compresores, cifradores, despachadores de Outbox, interceptores HTTP que traducen errores o validadores de documentos. | Replicar con mocks llamadas triviales 1:1 a un cliente HTTP que no transforman ni deciden nada. |
| **`infrastructure` (persistencia y concurrencia)** | **Suite de integración dedicada contra el motor de base de datos real** usando una base temporal exclusiva por corrida (transacciones, locks `SKIP LOCKED`/`UPDLOCK`, concurrencia optimista, índices filtrados, colaciones). | **Bases en memoria falsas o motores sustitutos** (ej. SQLite en memoria cuando producción usa PostgreSQL/SQL Server): no reproducen bloqueos, concurrencia ni índices reales. |
| **`ui` (componentes, stores, guards)** | Arnés de renderizado/DI del framework + diccionarios reales de traducción cargados desde disco sin HTTP + **fixtures completas tipadas** con overrides puntuales. Ubicados **al lado del archivo fuente** (`foo.spec` junto a `foo`), nunca en un árbol paralelo separado. | Objetos parciales con casteo forzado (`{} as Modelo`) que provocan errores no controlados al renderizar colecciones; copiar textos traducidos a mano en el test; crear tests vacíos para contenedores de puro layout sin ramificación. |
| **API HTTP (seguridad y pipeline)** | Pruebas sobre el servidor en memoria conservando **todos los filtros globales reales** (pidiendo el token CSRF/antiforgery y enviándolo igual que el cliente real). | Desactivar autenticación o antiforgery en el servidor de pruebas para «facilitar» el test. |
| **Flujos de usuario reales (E2E)** | 1 flujo nuevo o modificado a través de pantallas = 1 spec E2E en la misma tarea, registrado en `AGENTS.md`, con esperas eventuales sobre el DOM/estado y contra **base de datos + almacenamiento local desechable**. | Pausas fijas (`sleep(2000)`), correr contra bases de QA/desarrollo compartido o dejar bases temporales huérfanas al terminar. |

Consulta los patrones detallados en:
- [fakes-and-fixtures-patterns.md](./references/fakes-and-fixtures-patterns.md) — cómo escribir fakes limpios, relojes deterministas, fixtures completas y pruebas de tabla para delegaciones.
- [disposable-db-and-e2e-lifecycle.md](./references/disposable-db-and-e2e-lifecycle.md) — ciclo completo de bases efímeras locales/CI, limpieza garantizada y pruebas E2E de accesibilidad, contraste efectivo y seguridad.

## Convenciones clave

1. **Nombrado autoexplicativo de pruebas**: expresar resultado esperado + condición (`Returns_NotFound_when_record_does_not_exist` o equivalente idiomático), sin depender de comentarios explicativos encima del test.
2. **No escribir conteos fijos de tests en documentación permanente**: envejecen en el siguiente cambio; documentar en su lugar el comando exacto que lista y ejecuta la suite.
3. **Visibilidad interna para pruebas de integración**: mantener los adaptadores de infraestructura con visibilidad interna al módulo y habilitar visibilidad explícita únicamente hacia el ensamblado/paquete de pruebas correspondiente; nunca hacerlos públicos a toda la aplicación solo para probarlos.

## Checklist antes de cerrar cualquier tarea con código

- [ ] **Integridad verificada**: ningún test preexistente o nuevo fue debilitado, acomodado al error, saltado (`skip`) ni borrado para lograr que la suite pase; todo fallo detectado se resolvió corrigiendo el defecto real en el código de producción.
- [ ] Cada regla nueva de `domain` tiene su prueba unitaria directa.
- [ ] Cada caso de uso nuevo o modificado tiene prueba con fakes en memoria (camino feliz + cada `FailureReason`).
- [ ] Ningún test usa casteos parciales inseguros para modelos consumidos por plantillas.
- [ ] Si se tocaron consultas complejas, bloqueos, migraciones o concurrencia, pasan las pruebas contra motor de BD real efímero.
- [ ] Si cambió un flujo real de usuario entre pantallas, existe su spec E2E registrado en `AGENTS.md` y se verificó la eliminación total de la base y archivos temporales tras la corrida.

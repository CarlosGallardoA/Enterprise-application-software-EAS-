---
name: clean-code-and-standards
description: >-
  Úsala al escribir, revisar, refactorizar o auditar calidad y limpieza de código:
  política de cero advertencias, higiene quirúrgica de comentarios, eliminación de
  código muerto, manejo estricto de nulos, reloj determinista inyectado, consultas
  eficientes sin tracking, bloqueo y presupuesto de memoria. Activators: clean code,
  buenas prácticas, revisión de código, auditar comentarios, código muerto,
  estándares de código, code quality, refactoring, zero warnings.
---

# Limpieza de Código y Estándares de Ingeniería (`clean-code-and-standards`)

Define las reglas de precisión, mantenibilidad y rendimiento predecible que distinguen un repositorio de grado institucional de uno con deriva técnica. Es 100 % independiente de lenguaje y framework.

## Cuándo activar esta skill

- Durante cualquier implementación o refactorización, antes de dar una tarea por cerrada.
- Al realizar revisiones de código o auditorías de limpieza (comentarios, código muerto, imports, advertencias suprimidas).
- Al implementar búsquedas, recorridos por lotes, cargas de archivos o concurrencia.

## Los 8 pilares de higiene de código

### 1. Cero advertencias y prohibición de supresiones evasivas
- Configurar compiladores y analizadores estáticos con **tratamiento de advertencias como errores** (`0 warnings, 0 errors`).
- Prohibido usar directivas para silenciar advertencias reales de tipos o nulabilidad (`@ts-ignore`, `#pragma warning disable`, `type: ignore`, `#[allow(...)]` sin justificación arquitectónica). Resolver siempre la causa raíz.
- Prohibido usar operadores de aserción no nula (`!`) o casteos forzados para callar al compilador al desempaquetar resultados de casos de uso o entradas HTTP; usar coincidencia de patrones o guardas explícitas.

### 2. Higiene quirúrgica de comentarios
- **Qué SÍ comentar**: únicamente el **porqué técnico no obvio** que el código no puede expresar por sí mismo (restricciones de protocolo o navegador, condiciones de carrera, invariantes contra IDOR, límites de librerías externas).
- **Qué está TERMINANTEMENTE PROHIBIDO comentar**:
  1. **Narrativa histórica o conversacional**: *"hallazgo de revisión"*, *"bug reportado"*, *"a pedido del usuario"*, *"ver changelog"*, *"antes hacía X"*. Esa historia vive exclusivamente en `docs/historial/changelog.md`.
  2. **Citas textuales de documentos de requerimientos**: *"El sistema deberá..."*, códigos de casos de uso del documento funcional. El nombre del caso de uso y su prueba ya lo expresan.
  3. **Paráfrasis obvia**: repetir en prosa lo que el nombre del método, variable o test ya dice.
- Ver el protocolo completo de auditoría en [comment-and-dead-code-audit.md](./references/comment-and-dead-code-audit.md).

### 3. Cero código muerto e imports impecables
- Prohibido conservar bloques de código comentado, variables, funciones, propiedades, tipos o helpers huérfanos. Si no tiene consumidor real hoy, se elimina.
- Todos los `import`/`using` van estrictamente en la cabecera superior del archivo, sin nombres completamente calificados (FQN) intercalados en medio de la lógica (si hay colisión de nombres, declarar un alias en cabecera).
- Agrupar imports del mismo módulo sin duplicar sentencias; cuando el lenguaje distingue imports de **tipos** frente a **valores**, separarlos en dos declaraciones limpias.
- En componentes de UI declarativos, declarar en sus dependencias únicamente las piezas efectivamente usadas en su plantilla.

### 4. Reloj determinista obligatorio
- Prohibido invocar el reloj estático del sistema (`Date.now()`, `new Date()`, `DateTime.UtcNow`, `time.Now()`, `Instant.now()`) dentro de `domain`, `application`, adaptadores de negocio o mapeadores de respuesta.
- Inyectar siempre un proveedor de tiempo obligatorio por constructor (sin parámetros opcionales con fallback oculto al reloj del sistema). Los mapeadores puros reciben `nowUtc` como argumento desde el llamador.

### 5. Separación lectura/escritura y consultas acotadas
- **Lecturas sin seguimiento de cambios (`read-only / no-tracking`)**: toda consulta cuyo resultado no se va a mutar y persistir desactiva el seguimiento del ORM. No reutilizar un método de escritura con tracking para servir consultas de lectura.
- **Trabajos periódicos siempre acotados**: ningún job en segundo plano carga colecciones sin cota (`SELECT *` abierto). Usar lote fijo (`LIMIT / TAKE`) o paginación por cursor (`keyset pagination` ordenada por `(fecha, id)`), y delegar agregaciones (`COUNT`, `GROUP BY`) al motor de base de datos en lugar de contar en memoria.
- Ver [performance-and-concurrency-guardrails.md](./references/performance-and-concurrency-guardrails.md).

### 6. Trabajo intensivo de CPU y memoria fuera de transacciones
- Compresión/redimensionado de imágenes, renderizado pesado o validación estructural de archivos corren **antes** de abrir una transacción de base de datos o adquirir un bloqueo exclusivo, protegidos por un semáforo global de concurrencia y un presupuesto acotado de memoria (`503 Service Unavailable` + `Retry-After` cuando se satura).

### 7. Manejo explícito de errores en procesos de fondo
- En workers o bucles periódicos, capturar fallos por iteración registrando el error estructurado e informando que se reintentará en el siguiente ciclo, **dejando pasar siempre las señales de cancelación del host**. Jamás escribir bloques `catch` vacíos que traguen fallas en silencio.

### 8. Integridad inquebrantable de las pruebas y cero tests silenciados
- **Prohibido alterar, debilitar o saltar un test solo para que pase**: si una prueba falla, la presunción obligatoria es que detectó un **error real en el código de producción**. Acomodar la expectativa del test a la salida defectuosa o marcarlo con `skip` / `xit` / `Disabled` oculta el defecto y lo envía a producción.
- El auditor de higiene bloquea automáticamente cualquier test saltado sin justificación explícita (`[skipped-test]`). Ver la Ley Cero y el protocolo de triaje en [`layered-testing-strategy`](../layered-testing-strategy/SKILL.md) y [test-integrity-and-triage.md](../layered-testing-strategy/references/test-integrity-and-triage.md).

## Flujo de revisión pre-cierre

1. Ejecutar el auditor rápido de higiene sobre las carpetas de código fuente y pruebas:
   ```bash
   node <ruta-skill>/scripts/audit-code-hygiene.mjs --root . --scan src,tests
   ```
2. Ejecutar el formateador oficial y el linter estático configurados en el proyecto.
3. Inspeccionar el `git diff` línea por línea buscando: imports sobrantes, comentarios narrativos o redundantes, relojes directos, consultas abiertas sin paginar, bloques muertos y **cualquier cambio sospechoso en aserciones de pruebas existentes** (confirmando que ninguna prueba fue suavizada para forzar el verde).

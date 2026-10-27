---
name: audit-and-skill-orchestration
description: >-
  Úsala para coordinar este kit de ingeniería con las skills especializadas de
  auditoría de seguridad (Cloudflare security-audit), auditoría y excelencia de
  diseño UI/UX (design-consistency-auditor, ui-ux-pro-max, impeccable),
  entrevista de diseño previo (grilling / grill-me) y documentación exacta de
  librerías (context7-mcp). Activators: auditoría, security audit, auditoría de
  seguridad, auditoría de diseño, revisión UI/UX, pen test, design review,
  orquestación de skills, plan de remediación, grill me.
---

# Orquestación de Auditorías y Ecosistema de Skills (`audit-and-skill-orchestration`)

Define cómo las skills de arquitectura e implementación de `My_Project_Skills` trabajan en conjunto —sin solaparse ni contradecirse— con las skills especializadas de **auditoría adversarial de seguridad**, **consistencia y refinamiento UI/UX**, **interrogatorio de diseño previo** y **documentación viva de librerías**.

## Cuándo activar esta skill

- Siempre que el usuario solicite **cualquier tipo de auditoría** (seguridad, código, arquitectura, diseño/UI, accesibilidad o calidad de pruebas).
- Al planificar o ejecutar un ciclo de **auditoría → plan de cierre → remediación → reverificación**.
- Al construir, rediseñar o pulir interfaces combinando el sistema de diseño del proyecto con skills externas de UX/UI.
- Al enfrentar requerimientos complejos o librerías externas de versiones recientes antes de escribir código.

---

## Mapa de responsabilidades y jerarquía de autoridad

| Dominio | Construcción / Estándar base (`My_Project_Skills`) | Auditoría / Inteligencia compañera | Regla de precedencia |
| --- | --- | --- | --- |
| **Seguridad y criptografía** | [`security-and-auditability`](../security-and-auditability/SKILL.md) (controles defensivos al implementar) | **`security-audit`** oficial de Cloudflare (`cloudflare/security-audit-skill`) | **En toda auditoría manda `security-audit`**. Prohibido sustituirla por checklists caseros o skills homónimas. |
| **Sistema de diseño, UI/UX y a11y** | [`institutional-design-system-ux`](../institutional-design-system-ux/SKILL.md) (`DESIGN.md`, `tokens.css`, `check-design-system.mjs`) | **`design-consistency-auditor`** + **`ui-ux-pro-max`** + **`impeccable`** | **Manda `DESIGN.md` y los tokens semánticos del proyecto** (*The Brief Wins*). Ninguna sugerencia externa inyecta colores hex ni clases ajenas. |
| **Arquitectura y limpieza de código** | [`hexagonal-vertical-slices`](../hexagonal-vertical-slices/SKILL.md) + [`clean-code-and-standards`](../clean-code-and-standards/SKILL.md) | Rigor probatorio de **`security-audit`** + scripts `check-architecture-boundaries.mjs` y `audit-code-hygiene.mjs` | Repositorio en **solo lectura** durante la auditoría; remediación posterior en fase separada. |
| **Pruebas y verificación** | [`layered-testing-strategy`](../layered-testing-strategy/SKILL.md) | **Ley Cero Anti-Tampering** + `audit-code-hygiene.mjs` | **Jamás modificar ni saltar un test para forzar el verde**; un test fallido señala primero un bug real en producción. |
| **Diseño previo de planes ambiguos** | [`enterprise-app-blueprint`](../enterprise-app-blueprint/SKILL.md) | **`grilling` / `grill-me`** | Investigar primero el código existente y entrevistar al usuario solo sobre decisiones reales antes de codificar. |
| **APIs de librerías / SDKs externos** | Adaptadores en `infrastructure` y `ui` | **`context7-mcp`** + **`find-skills`** | Consultar firmas exactas de la versión instalada; mantener `domain` y `application` libres de frameworks. |

Ver los flujos detallados de extremo a extremo en [companion-skills-matrix.md](./references/companion-skills-matrix.md).

## Política transversal de versiones y vulnerabilidades

Antes de seleccionar tecnologías, remediar avisos o aprobar cualquier entrega, aplicar [technology-security-policy.md](../security-and-auditability/references/technology-security-policy.md). Cubrir versiones realmente ejecutadas de runtimes, dependencias directas/transitivas/de desarrollo, bibliotecas nativas, herramientas de CI, SO e imágenes. Bloquear ante vulnerabilidades conocidas aplicables de cualquier severidad, falta de soporte o evidencia incompleta. La coordinación con una auditoría especializada no sustituye esta comprobación ni autoriza omitirla.

---

## 1. Protocolo obligatorio para Auditorías de Seguridad (`security-audit`)

1. **Activación innegociable**:
   - Ante cualquier solicitud de auditoría de seguridad, pen test o revisión profunda de vulnerabilidades, cargar y seguir **`security-audit`** oficial de Cloudflare (`https://github.com/cloudflare/security-audit-skill`). Si no está disponible en el entorno activo, instalarla o detenerse y avisar al usuario antes de improvisar.
2. **Separación estricta entre `Full audit mode` y `Guidance mode`**:
   - **Auditoría completa de código / pen test / reporte formal (`Full audit mode`)**:
     - Ejecutar las **6 fases completas**: Reconocimiento → *Coverage Ledger* explícito previo → Oleadas paralelas de *Hunters* aislados → Validación independiente por *Verifiers* → Registros estructurados de hallazgos → Revisión final.
     - Mantener el repositorio auditado en **estricto modo solo lectura** (respetando cambios locales sin confirmar del usuario) y escribir artefactos por defecto fuera del repositorio (`~/security-audit-skill/<repo>/run-<N>`), salvo ruta explícita pedida por el usuario.
     - Separar rigurosamente hallazgos en `confirmed`, `needs_validation` y `rejected`. Nunca marcar como `confirmed` controles dependientes de infraestructura externa no inspeccionada ni emitir puntajes numéricos arbitrarios sin evidencia verificable.
     - No ejecutar código ni binarios del objetivo salvo que se haya comprobado aislamiento completo de sandbox a nivel de sistema operativo.
   - **Revisión focalizada durante desarrollo o remediación (`Guidance mode`)**:
     - Aplicar el razonamiento ofensivo/defensivo de `security-audit` junto con los controles de [`security-and-auditability`](../security-and-auditability/SKILL.md) sobre el vertical slice o PR modificado.
3. **Ciclo limpio Auditoría → Remediación**:
   - **Fase A (Solo lectura)**: auditar con `security-audit` y emitir el informe con evidencia exacta (`archivo:línea`, flujo fuente→sumidero, escenario de explotación).
   - **Fase B (Planificación)**: redactar el plan de cierre en `docs/planes/` (apoyándose en `grilling` si hay decisiones de negocio abiertas).
   - **Fase C (Implementación)**: aplicar correcciones con `security-and-auditability`, `hexagonal-vertical-slices` y `layered-testing-strategy` (escribiendo pruebas de regresión reales sin alterar tests existentes para ocultar fallos) y registrar el cierre en `docs/auditorias/` y `docs/historial/changelog.md`.

---

## 2. Protocolo integrado de Diseño, UI/UX y Consistencia Visual

Al crear, rediseñar o auditar pantallas, combinar las 4 piezas en orden claro:

1. **Constitución del proyecto (`institutional-design-system-ux`)**:
   - `DESIGN.md` y las dos capas de tokens (`--brand-*` primitivos encerrados en `tokens.css` y `--color-*`, `--space-*`, `--text-*` semánticos en componentes) mandan sobre cualquier ejemplo genérico externo.
2. **Inteligencia previa de patrones (`ui-ux-pro-max` + `impeccable shape`)**:
   - Usar `ui-ux-pro-max` para consultar ergonomía de interacción, accesibilidad, jerarquía de tablas/gráficos y anti-patrones UX; si el proyecto nace de cero y aún no tiene `DESIGN.md`, usarla como insumo inicial para redactar `DESIGN.md` y `tokens.css`.
   - En pantallas operativas complejas, usar el enfoque `Operate` de `impeccable` (densidad serena, color reservado a semántica real, teclado primero) y `shape` antes de escribir componentes.
3. **Auditoría estructural de 5 fases (`design-consistency-auditor` + `impeccable audit/critique`)**:
   - **Fase 1 (Tokens y color)**: cero hex crudos, cero `--brand-*` fuera de `tokens.css`, cero superficies tintadas artificiales o degradados decorativos no autorizados (*anti-AI-slop*).
   - **Fase 2 (Reutilización de componentes)**: reutilizar botones, modales, estados vacíos/carga/error, controles binarios Sí/No y líneas de tiempo canónicas antes de crear variantes nuevas.
   - **Fase 3 (Espaciado y layout por contenedor)**: escala cerrada de 6 pasos y rejillas `minmax(min(100%, Xrem), 1fr)` sin desborde horizontal en móvil (`360px–430px`) ni escritorio.
   - **Fase 4 (Tipografía e i18n)**: escala cerrada de 6 tamaños, `tabular-nums` en identificadores/métricas y cero literales visibles fuera de los diccionarios i18n diferidos.
   - **Fase 5 (Accesibilidad y endurecimiento — `impeccable harden` + `polish`)**: contraste efectivo `>= 4.5:1` (`>= 3:1` en bordes de controles), objetivos táctiles `>= 44 × 44 px`, anillo de foco único, textos largos/nombres compuestos sin romper layout, protección contra doble envío y máximo 1–2 pasadas visuales acotadas (escritorio + móvil), guardando capturas locales solo en rutas ignoradas por Git (`docs/auditorias/evidencias/`).
4. **Compuerta determinista obligatoria**:
   - Cerrar siempre ejecutando `check-design-system.mjs` y las pruebas de interfaz/E2E correspondientes.

---

## 3. Reglas para Planificación, Librerías y Estilo Conversacional

1. **`grilling` / `grill-me` antes de planes grandes o ambiguos**:
   - Inspeccionar primero el repositorio por cuenta propia y recorrer con el usuario las ramas pendientes del árbol de decisiones (alcance, permisos, concurrencia, migración, casos borde) antes de escribir código.
2. **`context7-mcp` para adaptadores exactos a la versión instalada**:
   - Al implementar adaptadores en `infrastructure` o `ui`, verificar la documentación vigente de la versión exacta del framework/ORM/SDK mediante `context7-mcp` para evitar APIs obsoletas o inventadas.
3. **Frontera estricta de brevedad conversacional (`caveman` u otras preferencias de chat)**:
   - Si el usuario activa un modo de respuestas ultrabreves en el chat, aplicarlo **únicamente al texto conversacional hacia el usuario**. El código fuente, nombres simbólicos, comentarios técnicos permitidos, mensajes de error tipados, pruebas y archivos `.md` del repositorio (`AGENTS.md`, `DESIGN.md`, `docs/**`) se escriben siempre en prosa técnica completa, rigurosa y gramaticalmente impecable.

## Checklist de orquestación antes de cerrar

- [ ] Si la tarea fue una auditoría, se respetó el modo **solo lectura** sobre el repositorio objetivo, se usó `security-audit` oficial (o sus reglas de evidencia verificable `confirmed` / `needs_validation`) y no se emitieron calificaciones sin sustento.
- [ ] Si la tarea tocó UI/UX, se aplicaron las 5 fases de consistencia visual respetando `DESIGN.md` + tokens semánticos y pasó `check-design-system.mjs`.
- [ ] Ninguna prueba existente o nueva fue debilitada, modificada para coincidir con un bug ni saltada (`skip`) para forzar la aprobación.

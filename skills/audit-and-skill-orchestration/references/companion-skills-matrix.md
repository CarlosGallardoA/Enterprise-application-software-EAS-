# Matriz Operativa de Orquestación con Skills Compañeras

Este documento detalla cómo combinar las skills de construcción de `My_Project_Skills` con las skills especializadas de auditoría, UX y descubrimiento en los cuatro flujos de trabajo más frecuentes.

---

## Flujo 1: Auditoría Integral de Seguridad y Cierre Verificado

### Etapa 1 — Auditoría adversarial (`security-audit` en *Full audit mode*)
1. **Reglas inviolables durante la auditoría**:
   - El repositorio auditado permanece **100 % intacto** (no editar archivos, no formatear, no tocar cambios sin commitear del usuario, no ejecutar comandos `git` mutantes).
   - Escribir el *coverage ledger*, notas de oleadas y reportes en `~/security-audit-skill/<repo>/run-<N>` (salvo que el usuario pida explícitamente otra ruta).
   - Cubrir sistemáticamente todos los componentes en el *Coverage Ledger* antes de lanzar las oleadas de búsqueda (*Hunter waves*) y validar cada candidato con verificadores independientes (*Verifiers*) trazando fuente → controles reales en código → sumidero.
   - Clasificar cada hallazgo con rigor probatorio:
     - `confirmed`: explotabilidad demostrada directamente en el código inspeccionado.
     - `needs_validation`: depende de configuración externa (WAF, proxy reverso, cabeceras en balanceador, permisos en servidor de producción, antivirus/CDR externo).
     - `rejected`: mitigado por un control real verificado en código (documentando archivo y línea del control).

### Etapa 2 — Plan de remediación (`enterprise-app-blueprint` + `grilling`)
1. Si algún hallazgo admite más de una decisión funcional o de operación (p. ej. política de expiración de sesión, rotación de claves `keyId` en caliente, alcance organizacional de un rol), resolver las decisiones con el usuario usando `grilling` / `grill-me`.
2. Documentar el plan por fases ordenadas por severidad en `docs/planes/plan-cierre-auditoria-seguridad-<fecha>.md`.

### Etapa 3 — Implementación defensiva y pruebas (`security-and-auditability` + `layered-testing-strategy`)
1. Implementar cada remediación respetando las fronteras de [`hexagonal-vertical-slices`](../../hexagonal-vertical-slices/SKILL.md).
2. Escribir pruebas unitarias, de integración sobre el pipeline HTTP real (con filtros y antiforgery activos) y specs E2E de seguridad que **fallen ante la ausencia del control y pasen únicamente con el control activo** — respetando la **Ley Cero Anti-Tampering** (jamás debilitar ni saltar un test preexistente que destape un efecto colateral).
3. Documentar en `docs/auditorias/remediacion-seguridad-<fecha>.md` la trazabilidad `Hallazgo -> Corrección -> Prueba que lo bloquea` y actualizar `docs/historial/changelog.md`.

---

## Flujo 2: Creación o Auditoría de Interfaz Operativa (UI/UX)

```
DESIGN.md + tokens.css (Autoridad Suprema)
   │
   ├── 1. Descubrimiento UX: ui-ux-pro-max + impeccable (shape / Operate mode)
   ├── 2. Construcción limpia: institutional-design-system-ux + hexagonal-vertical-slices
   ├── 3. Auditoría de 5 fases: design-consistency-auditor + impeccable (critique / audit / harden)
   └── 4. Compuertas automáticas: check-design-system.mjs + tests UI/E2E (contraste + teclado + móvil)
```

### Reglas de armonización entre las 4 skills de UI/UX
- **Sin clases ni paletas foráneas**: cuando `ui-ux-pro-max` o `design-consistency-auditor` muestren ejemplos con utilidades genéricas (`bg-blue-600`, `p-4`, hex directos), traducirlos siempre a los tokens semánticos de `tokens.css` (`var(--color-primary)`, `var(--space-4)`).
- **Prevención activa de *AI Slop*** (compartida por `design-consistency-auditor`, `impeccable` e `institutional-design-system-ux`):
  - Prohibido anidar tarjetas dentro de tarjetas con sombras apiladas (`--shadow-card` es `none` en reposo).
  - Prohibido usar texto con degradado, fondos decorativos neón/morados o animaciones de rebote elástico.
  - Prohibido inventar una cuarta variante de botón o un banner decorativo redundante cuando la vista ya expresa jerarquía con tipografía y espaciado.
- **Endurecimiento operativo (`impeccable harden` + `institutional-design-system-ux`)**:
  - Verificar nombres y correos largos sin desborde (`minmax(0, 1fr)`), expansión de textos al cambiar entre idiomas (ES/EN), estados explícitos de `loading` / `empty` / `error` con acción de reintento, espera bloqueante en modales (`aria-busy="true"`) y doble defensa contra pérdida de borradores.
- **Evidencia visual limpia en Git**:
  - Toda captura antes/después tomada durante auditorías visuales o pasadas de `polish` se guarda exclusivamente en `docs/auditorias/evidencias/` o `test-results/` (rutas ignoradas en `.gitignore`). En Git solo se versionan informes `.md`, hojas de estilo, código y specs automatizados.

---

## Flujo 3: Auditorías de Otras Disciplinas (Arquitectura, Limpieza, Pruebas, Operación)

Cuando el usuario pide auditar **arquitectura**, **calidad de código**, **cobertura/integridad de tests** o **preparación para producción**:

1. Aplicar las reglas compatibles de **`security-audit`**:
   - No modificar archivos del repositorio mientras dura la auditoría.
   - Elaborar primero el inventario explícito de módulos/capas revisados (*Coverage Ledger*).
   - Citar archivo y línea exacta en cada hallazgo y distinguir hechos verificados (`confirmed`) de puntos que requieren validación en entorno externo (`needs_validation`).
2. Combinar con el criterio experto y los scripts deterministas de la skill correspondiente:
   - Arquitectura → `hexagonal-vertical-slices` + `check-architecture-boundaries.mjs`.
   - Limpieza y rendimiento → `clean-code-and-standards` + `audit-code-hygiene.mjs`.
   - Pruebas e integridad → `layered-testing-strategy` (verificando ausencia de mocks frágiles, casteos parciales `{ } as T`, pausas fijas `sleep` y cualquier indicio de *test tampering* o tests saltados).
   - Diseño y accesibilidad → `institutional-design-system-ux` + `design-consistency-auditor` + `impeccable audit` + `check-design-system.mjs`.
   - Operación y despliegue → `transactional-outbox-and-polling` + `production-release-and-migrations`.

---

## Flujo 4: Arranque de Feature Compleja desde Cero

1. **Entrevista de diseño (`grilling` / `grill-me`)**: explorar el código actual y cerrar con el usuario las decisiones abiertas de reglas de negocio, permisos y estados.
2. **Consulta de librerías (`context7-mcp`)**: si la feature requiere APIs específicas del framework, ORM o SDK instalado, consultar la versión exacta antes de diseñar los adaptadores.
3. **Implementación por capas (`hexagonal-vertical-slices` + `clean-code-and-standards` + `security-and-auditability` + `institutional-design-system-ux`)**: construir `domain` → `application` → `infrastructure` / `ui`.
4. **Pruebas honestas (`layered-testing-strategy`)**: cubrir dominio, casos de uso con fakes en memoria, UI con i18n real, integración con BD efímera y flujo E2E — **corrigiendo siempre el código de producción cuando un test falle, jamás maquillando el test**.
5. **Revisión pre-cierre**: correr `check-architecture-boundaries.mjs`, `audit-code-hygiene.mjs`, `check-design-system.mjs`, pase de `design-consistency-auditor` (si hubo cambios UI) y revisión `Guidance mode` de `security-audit` (si hubo cambios en permisos, sesión, entradas o archivos), actualizando finalmente `docs/historial/changelog.md`.

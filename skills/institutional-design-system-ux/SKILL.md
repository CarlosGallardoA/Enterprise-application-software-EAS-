---
name: institutional-design-system-ux
description: >-
  Úsala al crear o revisar sistemas de diseño, tokens CSS semánticos, pantallas
  operativas, formularios, asistentes (wizards), tablas responsivas, modales de
  confirmación, líneas de tiempo, accesibilidad WCAG AA o internacionalización
  por scopes. Activators: sistema de diseño, DESIGN.md, tokens semánticos, UI, UX,
  accesibilidad, WCAG, vistas operativas, formularios, wizards, tablas móviles,
  i18n, traducciones, design system linter.
---

# Sistema de Diseño Institucional, UX Operativa, Accesibilidad e i18n (`institutional-design-system-ux`)

Guía para construir interfaces de alta densidad de información —expedientes, colas operativas, asistentes multi-paso y paneles de gestión— donde la serenidad visual, la trazabilidad, la accesibilidad WCAG AA y la consistencia multi-idioma están verificadas por herramientas automáticas en lugar de depender de la memoria humana.

## Cuándo activar esta skill

- Al definir `DESIGN.md` y la hoja base `tokens.css` de un proyecto nuevo.
- Al crear o rediseñar cualquier pantalla, formulario, tabla, modal, línea de tiempo o componente transversal.
- Al configurar o auditar internacionalización (i18n), contraste de color, navegación por teclado o responsividad móvil.

## Sinergia con `design-consistency-auditor`, `ui-ux-pro-max` e `impeccable`

Antes de seleccionar o ejecutar frameworks, herramientas de compilación y pruebas o dependencias de UI, cumplir [la política de seguridad de tecnologías](../security-and-auditability/references/technology-security-policy.md): verificar soporte y avisos vigentes y bloquear vulnerabilidades conocidas aplicables de cualquier severidad o evidencia incompleta.

Al trabajar en un entorno que incluye estas skills compañeras de diseño (ver [`audit-and-skill-orchestration`](../audit-and-skill-orchestration/SKILL.md)), respetar siempre esta jerarquía:

1. **Autoridad suprema (`DESIGN.md` + `tokens.css`)**: ningún ejemplo externo puede introducir valores hexadecimales sueltos, clases utilitarias ajenas ni romper la escala de 6 pasos del proyecto (*The Brief Wins*).
2. **`ui-ux-pro-max` como motor de inteligencia UX/a11y**: usarla para consultar patrones ergonómicos, flujos, tipos de gráficos y reglas de accesibilidad (o para fundar un `DESIGN.md` cuando el proyecto aún no tiene uno), traduciendo siempre sus recomendaciones a los tokens semánticos propios (`--color-*`, `--space-*`, `--text-*`).
3. **`design-consistency-auditor` en cada creación o revisión de UI**: aplicar sus 5 fases de auditoría (cumplimiento de tokens de color, reutilización de componentes existentes, espaciado/rejilla responsiva, jerarquía tipográfica y accesibilidad WCAG AA + prevención de *AI slop*).
4. **`impeccable` para oficio operativo y endurecimiento**: aplicar el modo `Operate` en aplicaciones de gestión, usar `shape` / `critique` / `audit` / `harden` / `adapt` / `polish` según la etapa y limitar la inspección visual en navegador a 1–2 pasadas acotadas (escritorio + móvil), guardando capturas únicamente en rutas ignoradas por Git (`docs/auditorias/evidencias/`).

## Las 6 reglas de oro del sistema visual

1. **La Regla de las Dos Capas de Tokens**:
   - Capa 1 (Primitivos `--brand-*`): paleta cruda oficial; vive **exclusivamente** en `tokens.css` y ningún archivo externo puede referenciarla.
   - Capa 2 (Semánticos `--color-*`, `--text-*`, `--leading-*`, `--space-*`, `--radius-*`, `--shadow-*`, `--focus-ring*`): único vocabulario permitido en hojas de estilo y componentes. Retematizar o crear modo oscuro/marca blanca consiste en redefinir la capa semántica bajo un selector, con **cero** cambios en componentes.
2. **La Regla de los 6 Pasos**:
   - Escalas cerradas de 6 niveles para tipografía y espaciado, y 4 niveles para interlineado y elevación. Cualquier número arbitrario fuera de escala es regresión, no variante.
3. **La Regla de lo Plano en Reposo**:
   - Tarjetas y contenedores declaran `box-shadow: none` (`var(--shadow-card)`) en reposo, delimitados por borde de `1px` con contraste `>= 3:1`. La elevación aparece únicamente ante interacción (`:hover`, `:focus-visible`) o en elementos flotantes reales (modales, menús). Todo elemento que sube en `:hover` **aterriza** en `:active` (`translateY(0)`).
4. **La Regla del Degradado Escaso**:
   - El acento de marca con degradado se reserva a las pocas superficies permanentes de identidad (menú lateral, portada de acceso). El contenido operativo es plano y reserva el color semántico (teal, ámbar, rojo) a estatus, banderas y alertas reales.
5. **Accesibilidad verificada sobre el fondo efectivo (WCAG AA + Alto Contraste)**:
   - Texto normal `>= 4.5:1`, contornos de controles `>= 3:1`, objetivos táctiles `>= 44 × 44 px`, anillo de foco único de alto contraste (`--focus-ring` / `--focus-ring-field`), soporte real de Alto Contraste del sistema operativo y respeto a `prefers-reduced-motion`. Prohibido `outline: none` sin indicador equivalente en `:focus-visible` o `:focus-within`.
6. **Cero texto visible hardcodeado e i18n por scopes diferidos**:
   - Cada módulo/feature carga su propio diccionario por ruta (`i18n/<scope>/{es,en}.json`), jamás un diccionario monolítico central.
   - Toda traducción invocada desde código imperativo (toasts, errores asíncronos) usa un helper asíncrono seguro (`translateLoaded`) que garantiza que el scope diferido haya cargado antes de interpolar, evitando mostrar claves crudas o lanzar errores no controlados.

Consulta la especificación completa y recetas de implementación en:
- [semantic-tokens-and-scales.md](./references/semantic-tokens-and-scales.md) — escalas exactas, auditoría de contraste, anillo de foco, vocabulario cerrado de animación y estructura de `DESIGN.md`.
- [operational-ux-and-feedback-patterns.md](./references/operational-ux-and-feedback-patterns.md) — estándar de vistas operativas (expedientes, secciones numeradas, Sí/No segmentado, tablas → tarjetas móviles, bitácora en línea de tiempo, guardado y avance, modales con espera bloqueante e i18n segura).
- Plantillas listas para adaptar: [DESIGN.template.md](./resources/DESIGN.template.md) y [tokens.template.css](./resources/tokens.template.css).

## Patrones obligatorios de interacción y retroalimentación

1. **Guardar y avanzar en asistentes (`Wizards`)**:
   - Emitir **un único toast de éxito después** de confirmar la escritura en el servidor **y** completar la navegación al paso siguiente (para que la carga del nuevo paso no consuma el tiempo visible del aviso).
   - El estado de pasos completados depende **exclusivamente de los datos persistidos y su versión confirmada**, jamás de haber visitado la URL ni de un porcentaje visual.
   - Mantener un indicador inline persistente de estado (`idle`, `dirty`, `saving`, `saved`) junto a las acciones de borrador.
2. **Modales de confirmación con espera segura**:
   - Mientras la operación está en vuelo: mantener el modal abierto con `aria-busy="true"`, bloquear doble envío e inhabilitar botón cancelar, tecla `Escape` y clic en el fondo.
   - Si el servidor rechaza la escritura: conservar intactos los datos escritos por el usuario y restaurar la edición.
   - Distinguir explícitamente un **fallo de escritura** de un **fallo al releer el expediente tras haber guardado**, ofreciendo recargar la vista sin repetir el comando mutante.
3. **Doble defensa contra pérdida accidental de datos**:
   - Guard de router interno (`canDeactivate`) con diálogo accesible de 3 opciones (*Cancelar*, *Salir sin guardar*, *Guardar borrador y salir*) + listener nativo `window:beforeunload` para recargas F5 o cierre de pestaña.
4. **Rejillas adaptadas al contenedor real (no al viewport)**:
   - Usar `grid-template-columns: repeat(auto-fit, minmax(min(100%, Xrem), 1fr))` y `minmax(0, 1fr)` para que formularios dentro de paneles laterales o wizards estrechos se apilen sin truncar correos ni nombres largos.

## Verificación automática del sistema de diseño y paridad i18n

Integrar en el comando `lint` del proyecto los dos validadores incluidos (cero dependencias, Node.js soportado y parcheado según la política de tecnologías):

```bash
# 1. Tokens semánticos, foco accesible y cero textos literales sueltos en HTML
node <ruta-skill>/scripts/check-design-system.mjs --root . --styles src/styles --app src/app --tokens src/styles/tokens.css

# 2. Paridad exacta de claves, placeholders ({param} / {{param}}) y cero vacíos entre idiomas (raíz y scopes)
node <ruta-skill>/scripts/check-i18n-parity.mjs --root . --i18n public/i18n --langs es,en
```

`check-design-system.mjs` comprueba colores hex fuera de `tokens.css`, fugas de tokens primitivos `--brand-*`, `transition: all`, `outline: none` sin reemplazo accesible, textos literales en plantillas HTML y marcadores de excepción `design-system-allow: <check> — razón` huérfanos; `check-i18n-parity.mjs` garantiza que ningún idioma se quede con claves faltantes, variables interpoladas rotas ni traducciones en blanco.

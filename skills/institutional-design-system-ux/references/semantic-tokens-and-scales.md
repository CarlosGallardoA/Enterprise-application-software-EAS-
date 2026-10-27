# Tokens Semánticos, Escalas Cerradas, Foco y Movimiento

## 1. Arquitectura de dos capas en `tokens.css`

- **Primitivos (`--brand-*`)**: reflejan 1:1 la identidad cromática de la organización. Si un tono puro de marca (como un teal medio o un gris medio) no alcanza contraste WCAG AA sobre blanco, nunca se usa directo como texto: en la capa semántica se deriva una mezcla oscura (`color-mix(in srgb, var(--brand-accent), black 30%)`) verificada a `>= 4.5:1` para texto y `>= 3:1` para bordes.
- **Semánticos (`--color-*`)**: nombran la **función** (`--color-primary`, `--color-ink`, `--color-ink-muted`, `--color-surface`, `--color-surface-muted`, `--color-border`, `--color-danger`, `--color-warning`, `--color-status-positive`).

### Auditoría de contraste sobre superficie efectiva
En fichas oscuras o paneles laterales coloreados (ej. ficha azul de contexto de un expediente):
- Ningún campo descendiente recibe fondo claro de tarjeta; mantienen fondo transparente.
- Los títulos de sección, etiquetas secundarias y valores usan tokens dedicados verificados matemáticamente contra el azul de fondo real (nunca asumiendo blanco detrás).

## 2. Escalas cerradas

- **Tipografía (6 pasos + 1 display fluido)**:
  - `--text-xs` (`0.75rem`), `--text-sm` (`0.875rem`), `--text-base` (`1rem`), `--text-md` (`1.125rem`), `--text-lg` (`1.25rem`), `--text-xl` (`1.5rem`), más `--text-display-fluid` (`clamp(1.5rem, 4vw, 2.1rem)` exclusivo para `.page-title`).
- **Pesos formales (4 valores)**: `400` (cuerpo), `600` (énfasis secundario/sub-etiquetas sin competir con títulos), `700` (títulos de sección), `800` (display).
- **Interlineado (4 pasos)**: `--leading-none` (`1`), `--leading-tight` (`1.2`), `--leading-snug` (`1.35`), `--leading-normal` (`1.5`).
- **Espaciado (6 pasos)**: `--space-1` (`0.25rem`), `--space-2` (`0.5rem`), `--space-3` (`0.75rem`), `--space-4` (`1rem`), `--space-5` (`1.5rem`), `--space-6` (`2.5rem`).
- **Sombras (4 pasos compuestos con `color-mix`, nunca `rgba` arbitrarios)**:
  - `--shadow-card: none` en reposo; `--shadow-sm`, `--shadow-md` (hover puntual), `--shadow-lg` (elementos destacados), `--shadow-floating` (diálogos/popovers).

## 3. Anillo de foco único y soporte de Alto Contraste

- Botones, enlaces, pestañas y filas interactivas usan un único token sólido de doble halo:
  `--focus-ring: 0 0 0 2px var(--color-surface), 0 0 0 4px var(--color-primary)` (e `--focus-ring-inset` dentro de contenedores con `overflow` recortado).
- Campos de texto con borde propio usan `--focus-ring-field` (`2px` sólidos sobre borde primario) para no verse toscos.
- Checkboxes y radios nativos conservan `outline: 2px solid var(--color-primary); outline-offset: 2px` porque los modos de Alto Contraste del sistema operativo eliminan `box-shadow` pero respetan y adaptan `outline`.

## 4. Vocabulario cerrado de animación

Prohibido `transition: all`. El cromo estructural (cabecera, barra lateral, filtros) **no se anima**; solo se animan las transiciones de datos:

| Situación | Patrón |
| --- | --- |
| Esqueleto de carga → contenido real en el mismo sitio | `fade-in` (un desplazamiento vertical aquí se percibe como salto brusco) |
| Banner, panel o alerta que aparece por primera vez | `rise-in` |
| Menú flotante, diálogo o paleta de comandos | `scale-in` / `scale-out` |
| Acordeón o divulgación progresiva | `collapse-in` / `collapse-out` |
| Rechazo de validación | `shake` suave |

Incluir siempre `@media (prefers-reduced-motion: reduce)` colapsando duraciones y desplazamientos.

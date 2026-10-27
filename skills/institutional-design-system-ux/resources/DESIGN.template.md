# Sistema de Diseño: <NOMBRE_PROYECTO>

## Estrella Polar Visual

`<NOMBRE_PROYECTO>` comunica confianza institucional, claridad operativa y trazabilidad. La interfaz nunca compite por atención con el dato que muestra: jerarquía por tipografía y espaciado antes que por decoración, superficies planas en reposo y color de estado reservado exclusivamente a estatus, alertas y decisiones reales.

## Reglas Nombradas

1. **La Regla de las Dos Capas**: ningún componente o estilo fuera de `tokens.css` consume primitivos `--brand-*` ni valores hexadecimales literales; todo pasa por tokens semánticos (`--color-*`).
2. **La Regla de los 6 Pasos**: escalas cerradas de 6 pasos en tipografía y espaciado, y 4 pasos en interlineado y elevación.
3. **La Regla de lo Plano en Reposo**: `--shadow-card: none` por defecto; la elevación responde solo a interacción o flotación real (modales, menús), aterrizando siempre en `:active`.
4. **La Regla del Degradado Escaso**: `--gradient-brand-surface` se aplica únicamente en superficies permanentes de marca (navegación lateral, portada de acceso).
5. **El Anillo de Foco Único**: `--focus-ring` para botones/enlaces y `--focus-ring-field` para campos de entrada, garantizando contraste WCAG 1.4.11 y compatibilidad con Alto Contraste del sistema.

## Patrones Operativos Obligatorios

- **Cabecera de página**: eyebrow en primer nivel; migas de pan en vistas hijas (nunca ambos, nunca ninguno).
- **Expedientes y formularios**: secciones numeradas coherentes, resumen contextual previo a ancho completo, controles Sí/No segmentados de `44 px` y rejillas adaptadas al contenedor (`auto-fit, minmax(...)`).
- **Listados y tablas**: filtro uniforme, transformación automática a tarjetas apiladas bajo `48rem` sin ocultar columnas ni truncar nombres, y bitácoras en línea de tiempo vertical estándar.
- **Retroalimentación**: indicador inline de guardado (`idle`/`dirty`/`saving`/`saved`), toast único de «Guardar y avanzar» tras completar la navegación y modales con bloqueo `aria-busy` y preservación de datos ante error.

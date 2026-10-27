# Política de tecnologías sin vulnerabilidades conocidas

## Alcance y activación

Aplicar esta política al elegir un stack, agregar o actualizar componentes, ejecutar herramientas del proyecto y preparar o cerrar una entrega. Abarca desarrollo, CI, compilación, pruebas, producción, workers y migradores: lenguajes y runtimes, frameworks, dependencias directas/transitivas/de desarrollo, bibliotecas nativas, herramientas y acciones de CI, sistema operativo, imágenes base, servidores, proxies y bases de datos. No limitarla a Node.js o PHP.

## Reglas obligatorias

1. **Verificar antes de usar**. Consultar durante la tarea los avisos de seguridad, versiones corregidas y ciclo de soporte del fabricante. Usar una rama estable con soporte de seguridad y su parche vigente verificado. No asumir que `LTS`, `latest`, una versión mayor o una lista histórica significan seguridad.
2. **Cero vulnerabilidades conocidas aplicables, de cualquier severidad**. No introducir, recomendar ni aprobar una versión afectada. Actualizarla, sustituirla o eliminarla; si no existe una alternativa corregida y compatible, bloquear la entrega. Una mitigación temporal o la aparente falta de una ruta de explotación no equivalen a una corrección.
3. **Cerrar ante incertidumbre**. Si falta inventario, no hay acceso a avisos vigentes, el escáner falla, la base de avisos está desactualizada o queda un hallazgo por validar, informar `BLOQUEADO`. Una comprobación incompleta nunca cuenta como aprobada. Se permite inspección y remediación necesarias para salir del bloqueo, sin publicar ni declarar seguro el resultado.
4. **Inventariar lo que realmente se ejecuta**. Registrar versiones completas, revisión del paquete, plataforma, origen y hash/digest cuando corresponda. Inspeccionar los procesos, imágenes y bibliotecas efectivamente cargados; una declaración en un manifiesto, el PHP CLI o el Node de una terminal no prueban la versión de FPM, Apache, un worker, un contenedor o el servidor remoto.
5. **Auditar todas las capas**. Combinar la auditoría de paquetes del ecosistema con avisos del runtime y fabricante, análisis de bibliotecas nativas y escaneo del artefacto final y sus paquetes de SO. `npm audit`, `composer audit` o un lockfile limpio por sí solos no verifican Node.js, PHP, Brotli, OpenSSL, libcurl ni toda una imagen.
6. **Sin evasiones**. No reducir el umbral a `high`/`critical`, excluir dependencias de desarrollo del alcance total, silenciar avisos, ignorar CVE, usar `continue-on-error`/`|| true`, desactivar auditorías ni debilitar pruebas para aprobar. No ejecutar actualizaciones forzadas indiscriminadas; verificar compatibilidad y regresiones.
7. **Reconocer parches del proveedor con evidencia**. Un backport solo resuelve el aviso cuando el proveedor confirma la revisión exacta, plataforma y CVE corregidos. Conservar el boletín y la identidad del paquete/binario. No rechazar ni aprobar una biblioteca integrada únicamente por su número upstream: el runtime puede incorporar el parche sin cambiar ese número. Una tecnología sin soporte de seguridad verificable sigue bloqueada.
8. **Fijar y volver a verificar**. Guardar versiones exactas y lockfiles; fijar imágenes por digest y acciones de CI por SHA completo verificado. Renovar esas identidades tras revisar actualizaciones. Repetir las consultas y escaneos después de cualquier cambio de versión/imagen, antes de publicar y tras un nuevo aviso; programar revisión al menos diaria de lo desplegado. No reutilizar un informe de otro artefacto o una aprobación histórica.

## Decisiones de entrega

| Situación comprobada | Decisión |
| --- | --- |
| Versión afectada por un aviso aplicable, incluso de severidad baja o sin parche disponible | `BLOQUEADO`; actualizar, sustituir o retirar el componente. |
| Rama EOL, versión real desconocida, cobertura incompleta, fallo de herramientas o aviso sin resolver | `BLOQUEADO`; completar la evidencia o migrar a una rama soportada. |
| Escáner señala una versión upstream pero el proveedor declara un backport | Validar el paquete exacto y el boletín; mientras tanto, `BLOQUEADO`. |
| Falso positivo demostrado por identidad/plataforma o corrección oficial verificable | Registrar evidencia y resolución concreta; no crear una exclusión genérica del aviso. |
| Inventario completo, soporte vigente y cero avisos aplicables pendientes en el artefacto exacto | `APROBADO` para ese alcance, artefacto y fecha. |

## Ejecución

1. Identificar el stack y consultar sus fuentes oficiales vigentes antes de proponer versiones. Incluir herramientas del propio kit; no ejecutar sus scripts con un runtime ya identificado como afectado.
2. Obtener el inventario resuelto de cada entorno y las bibliotecas integradas. En Node, consultar `process.versions` y la versión completa del runtime; en PHP, comprobar PHP y extensiones/cURL tanto en CLI como en el SAPI que atiende peticiones. Obtener el inventario de SO e imágenes y un SBOM cuando corresponda. Documentar componentes fuera del alcance de cada herramienta.
3. Ejecutar las auditorías nativas o mantenidas del ecosistema con cobertura directa, transitiva y de desarrollo. Consultar además los avisos oficiales de runtimes y componentes nativos. Usar escáneres mantenidos con base vigente que cubran los formatos y paquetes de SO encontrados; no inventar comandos ni tratar un formato no soportado como limpio.
4. Resolver cada coincidencia con el rango afectado, plataforma, revisión y parche del proveedor. Corregir sin omitir ninguna severidad. Si un aviso requiere una configuración concreta, comprobarla, pero no conservar una versión afectada basándose solamente en una mitigación o en que hoy no parece alcanzable.
5. Reconstruir los artefactos desde las versiones corregidas, ejecutar las pruebas pertinentes, escanear la imagen/binario final y volver a consultar los avisos. En una remediación de despliegue existente, verificar después del reinicio/reemplazo qué procesos e imágenes quedaron activos; no aprobar producción basándose solo en la máquina de desarrollo.
6. Configurar en el proyecto una compuerta de CI obligatoria que falle ante hallazgos de cualquier severidad, versiones sin soporte, inventario incompleto o errores de consulta/escaneo. Validar que un componente vulnerable y un fallo de consulta impiden publicar. No afirmar que esta documentación instala por sí sola esa compuerta.

## Evidencia y salida obligatorias

Registrar el informe en `docs/auditorias/seguridad-tecnologias.md` del proyecto. Incluir fecha/hora UTC, alcance y entornos inspeccionados, commit y hashes/digests evaluados, inventario por componente, estado de soporte, URLs oficiales consultadas, herramientas y fecha de su base de avisos, comandos ejecutados y códigos de salida, CVE/GHSA y resoluciones, pruebas realizadas y limitaciones pendientes. No persistir secretos ni variables de entorno completas.

Cerrar con `APROBADO` o `BLOQUEADO` y su motivo verificable. Solo usar «sin vulnerabilidades conocidas detectadas en el alcance verificado a esta fecha» cuando toda la cobertura requerida esté completa. Nunca prometer ausencia absoluta de vulnerabilidades ni afirmar que servidores no inspeccionados están parcheados.

## Casos de referencia verificados el 2026-10-27

Estos son ejemplos de avisos concretos, **no una lista permanente de versiones autorizadas**. Reconsultar siempre las fuentes; corregir uno de estos fallos no demuestra ausencia de otros.

| Componente y aviso | Corrección publicada para ese aviso |
| --- | --- |
| Brotli, CVE-2026-111497; ramas afectadas 1.0.3–1.0.9, 1.1.0 y 1.2.0 | 1.0.10, 1.1.1 y 1.2.1, respectivamente; comprobar también las copias integradas en otros productos. |
| Node.js con Brotli integrado, CVE-2026-111497 | 22.23.4, 24.22.1 y 26.12.1 en sus ramas respectivas; verificar el parche del runtime, sin exigir que `process.versions.brotli` cambie si hubo backport. |
| PHP, CVE-2026-109618 y CVE-2026-109619 | 8.2.35, 8.3.36, 8.4.27 y 8.5.12 en sus ramas respectivas. |
| PHP Windows con Brotli/cURL, CVE-2026-111497 | Paquetes reconstruidos 8.2.35-1, 8.3.36-1, 8.4.27-1 y 8.5.12-1; la versión del runtime PHP no cambia. En otros SO verificar las bibliotecas del proveedor. |

El aviso de PHP del 23 de octubre sobre session upload progress anuncia además CVE-2026-115560. No considerar las versiones de la tabla una aprobación general: verificar el estado vigente de ese aviso. Su mitigación de configuración no sustituye una versión corregida para esta política.

### Fuentes oficiales para revalidar los ejemplos

- [Node.js: avisos y parches de octubre de 2026](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases) y [ciclo de soporte](https://github.com/nodejs/Release#release-schedule).
- Brotli: [1.0.10](https://github.com/google/brotli/releases/tag/v1.0.10), [1.1.1](https://github.com/google/brotli/releases/tag/v1.1.1) y [1.2.1](https://github.com/google/brotli/releases/tag/v1.2.1).
- PHP: [avisos de octubre de 2026, incluidos los rebuilds de Windows y session upload progress](https://www.php.net/archive/2026.php) y [versiones soportadas](https://www.php.net/supported-versions.php).
- Alcance de [npm audit](https://docs.npmjs.com/cli/v11/commands/npm-audit/) y [Composer audit](https://getcomposer.org/doc/03-cli.md#audit).

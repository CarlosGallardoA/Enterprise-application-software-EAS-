# Verificación de la política de seguridad de tecnologías

Fecha de verificación: 2026-10-27 16:51:30 UTC.

## Resultado y alcance

La actualización de instrucciones está completa: las nueve skills cargan una política obligatoria de soporte, parches y cero vulnerabilidades conocidas aplicables de cualquier severidad, con bloqueo ante evidencia incompleta. El generador incorpora esa política a los proyectos nuevos y conserva los documentos existentes al repetirse sin `--force`.

**Estado de uso con los runtimes predeterminados observados: BLOQUEADO.** El Node y PHP CLI del entorno están por debajo de las versiones corregidas para los avisos consultados. No se actualizaron instalaciones globales, aplicaciones existentes, copias instaladas de las skills ni servidores. Este informe verifica las instrucciones y la propagación documental; no certifica la seguridad integral del equipo o de producción.

## Versiones observadas

| Entorno/componente | Identidad observada | Resultado |
| --- | --- | --- |
| Node de la terminal | 22.14.0; `/Users/carlosenriquegallardoambrosio/.nvm/versions/node/v22.14.0/bin/node`; Brotli integrado 1.1.0 | Anterior al parche 22.23.4 para CVE-2026-111497; no utilizar como runtime aprobado del kit. |
| PHP CLI | 8.3.12; `/opt/homebrew/bin/php`; cURL 8.10.1 enlazado a Brotli 1.1.0 | Anterior a PHP 8.3.36 para CVE-2026-109618/109619; biblioteca Brotli anterior al parche de su rama. La revisión exacta del paquete y posibles backports no se validaron: bloqueo pendiente. |
| Node temporal de las comprobaciones | 24.22.1, distribución oficial `darwin-arm64` | Versión publicada para corregir los avisos de octubre; utilizada solo para verificar el kit. No reemplaza el Node predeterminado. |
| FPM, Apache, workers, imágenes y servidores de aplicaciones | Sin inspeccionar | Sin aprobación de producción ni inferencias desde las versiones CLI. |

El Node 24.22.1 oficial aún informa `process.versions.brotli = 1.2.0`: la corrección está incorporada en el runtime. La política contempla este caso y exige verificar el parche del producto/proveedor; no decide únicamente por ese número upstream.

Distribución temporal descargada por HTTPS desde Node.js y comparada con su `SHASUMS256.txt`; SHA-256 del archivo: `89c682593d76cd44233fa53b1563264e7de9cbb189cad169135c5b4fadfbc0a7`. No se verificó una firma independiente del manifiesto. Las pruebas temporales de proyectos se eliminaron al terminar.

## Comprobaciones realizadas

Todas las comprobaciones finales indicadas a continuación finalizaron con código `0`:

- `node --check` sobre los seis scripts `.mjs`, usando el Node temporal 24.22.1.
- Ejecución de `scaffold-project-docs.mjs --target <proyecto-temporal> --name 'Security Smoke'`: 16 archivos creados, incluida una copia íntegra de la política.
- `check-docs-governance.mjs --root <proyecto-temporal>`: 14 documentos verificados, sin enlaces rotos ni errores de gobierno documental.
- Segunda generación sin `--force` tras personalizar la política: todos los archivos conservaron sus hashes.
- Simulación de un paquete sin la política: el generador terminó con código distinto de cero antes de crear el directorio de destino. La aserción del comportamiento esperado pasó.
- Verificación estática: 9/9 skills enlazan la política; enlaces locales de documentación válidos; sin requisitos permisivos `Node >= 18` ni ejemplo `node-version: 20`; descripción de seguridad válida y acciones del ejemplo fijadas por SHA completo.
- `gentle-ai skill-registry refresh --cwd /Volumes/SSDCarlos/projects/My_Project_Skills`: registro regenerado con 35 skills, incluidas las nueve del proyecto, en `.atl/skill-registry.md`.
- `git diff --check`: sin errores de espacios.

No se ejecutó un escáner integral de dependencias, paquetes del SO o imágenes de aplicaciones. Por tanto, no se declara «cero vulnerabilidades detectadas» para esos entornos ni se presenta la política documental como una compuerta de CI ya instalada.

## Fuentes consultadas

- [Node.js: avisos de octubre de 2026 y versiones corregidas](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases), [distribuciones vigentes](https://nodejs.org/en/download/current) y [ciclo de soporte](https://github.com/nodejs/Release#release-schedule).
- Brotli: correcciones [1.0.10](https://github.com/google/brotli/releases/tag/v1.0.10), [1.1.1](https://github.com/google/brotli/releases/tag/v1.1.1) y [1.2.1](https://github.com/google/brotli/releases/tag/v1.2.1).
- [PHP: avisos de octubre, rebuilds Windows y session upload progress](https://www.php.net/archive/2026.php) y [versiones soportadas](https://www.php.net/supported-versions.php). Las correcciones de los dos RCE iniciales no bastan para aprobar otros avisos como CVE-2026-115560.
- Alcance de [npm audit](https://docs.npmjs.com/cli/v11/commands/npm-audit/) y [Composer audit](https://getcomposer.org/doc/03-cli.md#audit).
- Ejemplo de CI actualizado con las identidades oficiales de [checkout v7.0.1](https://github.com/actions/checkout/commit/3d3c42e5aac5ba805825da76410c181273ba90b1) y [setup-node v7.1.0](https://github.com/actions/setup-node/commit/949feb2413d6458794dcd2491c4babbbce0c15c1). Revalidar avisos y runtime del runner antes de usarlas.

## Límites y reversión

Las consultas son del día indicado, sin una base local de avisos de escáner. El código evaluado es el árbol de trabajo de esta tarea, sin nuevo commit. Las versiones fijas y SHA del ejemplo requieren revisión ante nuevos avisos. El uso seguro en aplicaciones existentes requiere implementar y validar su compuerta de CI y comprobar los procesos desplegados.

La unidad de cambio comprende la política, enlaces en las nueve skills, plantillas, propagación desde el generador, requisitos/documentación del runtime, `.node-version` y este informe. Puede revertirse de forma conjunta sin migraciones de datos ni cambios a aplicaciones o instalaciones globales.

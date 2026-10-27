# Auditoría de Comentarios y Código Muerto

## Criterio de oro para cada comentario

Haz estas tres preguntas frente a cualquier comentario del repositorio:

1. **¿Si borro este comentario se pierde una advertencia técnica que el código no puede expresar?**
   - *Sí* (ej. «El navegador dispara `blur` antes de `click` en el menú desplegable; usar `mousedown` evita cerrarlo antes de seleccionar»): **conservar**, redactado en 1–2 frases secas y técnicas.
   - *No* (ej. «Valida que el usuario esté activo antes de continuar» justo encima de `if (!user.isActive)`): **eliminar**.

2. **¿Cuenta la historia de una conversación, ticket o corrección pasada?**
   - Ejemplos prohibidos: `// Fix para el bug #142`, `// Agregado tras auditoría`, `// Antes usábamos SSE pero fallaba`, `// Pedido por el cliente`.
   - **Acción**: mover el contexto relevante a `docs/historial/changelog.md` o `docs/decisiones/` si aún no está documentado allí, y **reescribir o eliminar** el comentario dejando únicamente la restricción técnica vigente (si existe).

3. **¿Es código comentado o un `TODO` sin dueño inmediato?**
   - Bloques de líneas con sintaxis de código (`if (...)`, `return ...`, declaraciones de propiedades o selectores CSS comentados) se eliminan sin excepción: el control de versiones ya conserva el historial.

## Procedimiento para auditar un repositorio completo en dos pasadas

1. **Primera pasada (automatizada + búsqueda dirigida)**:
   - Ejecutar `audit-code-hygiene.mjs` para listar narrativa histórica, bloques comentados, supresiones de linter/compilador y llamadas directas al reloj del sistema.
   - Activar las banderas del compilador/linter para detectar símbolos privados, parámetros, variables locales e imports sin uso (`noUnusedLocals`, `noUnusedParameters`, diagnósticos IDE de imports innecesarios).
2. **Segunda pasada (lectura semántica por módulo)**:
   - Revisar cada archivo tocado comprobando que ningún comentario restante repita el nombre de la clase, función o test.
   - Verificar que todas las pruebas y linters sigan en verde tras la poda.

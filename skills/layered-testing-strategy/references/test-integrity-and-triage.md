# Integridad de las Pruebas y Protocolo ante Fallos (Anti-Tampering)

## Por qué alterar un test para «ponerlo en verde» es un defecto crítico

El único propósito de una prueba automatizada es actuar como alarma independiente frente a defectos del sistema. Si un agente o desarrollador escribe o ejecuta una prueba, observa que falla y modifica la expectativa del test para que coincida con lo que el código devuelve hoy, convierte una falla visible en un **error latente certificado falsamente por la suite**: el pipeline marca verde mientras el defecto real viaja a producción.

---

## Formas prohibidas de manipulación de pruebas (*Test Tampering*)

Quedan **terminantemente prohibidas** todas las variantes directas e indirectas de debilitar pruebas para lograr que pasen:

| Práctica prohibida | Cómo se disfraza | Consecuencia real |
| --- | --- | --- |
| **Ajustar el valor esperado al valor erróneo devuelto** | Cambiar `expect(status).toBe(403)` por `400` o cambiar el `reason` esperado al que hoy escupe el código sin verificar la regla de negocio. | Institucionaliza un bug de seguridad o contrato como «comportamiento esperado». |
| **Aflojar aserciones precisas por genéricas** | Reemplazar `toEqual(objetoExacto)` por `toBeDefined()` / `not.toBeNull()`, o quitar aserciones sobre efectos secundarios (bitácora, Outbox, versión). | El test deja de detectar regresiones reales de datos o pérdida de trazabilidad. |
| **Escribir un test nuevo copiando la salida actual del código sin contrastar el requerimiento** | Ejecutar primero el código defectuoso, leer lo que imprimió y pegar ese resultado en el `Assert`. | Crea un test tautológico que congela los bugs presentes en la implementación. |
| **Silenciar, saltar o borrar el caso que falla** | Agregar `skip`, `todo`, comentar el test o eliminar el escenario borde conflictivo. | Ciega la cobertura justo en el caso límite donde el código falló. |
| **Mockear o puentear la pieza que destapa el fallo** | Sustituir un validador real, filtro antiforgery, política de permisos o consulta SQL por un stub complaciente para que deje de fallar. | Oculta rupturas de integración, seguridad o concurrencia. |
| **Maquillar los datos de entrada para esquivar un caso borde legítimo** | Cambiar un texto con espacios/tildes, una fecha límite o un monto decimal en el test porque el código no lo soporta bien. | Deja el defecto de normalización o cálculo vivo para usuarios reales. |

---

## Protocolo obligatorio de 4 pasos cuando un test falla

Cada vez que una prueba (preexistente o recién escrita) falle:

1. **Presunción de fallo real en producción**:
   - Asumir por defecto que **el test tiene razón y el código de producción contiene un error**.
2. **Trazabilidad contra la fuente de verdad**:
   - Contrastar el comportamiento contra la especificación funcional, `docs/reglas/`, `docs/arquitectura/` y los invariantes del dominio — **jamás** contra lo que la implementación actual «casualmente hace».
3. **Corregir el código de producción**:
   - Si el código incumple la regla, el contrato, el permiso o el caso borde, reparar el código de producción manteniendo intacta (o endureciendo aún más) la aserción del test.
4. **Único caso legítimo para modificar un test existente**:
   - Solo se permite cambiar una aserción cuando se cumplan **las tres condiciones a la vez**:
     1. Se demostró documentalmente que el requerimiento de negocio cambió a propósito en la tarea actual, **o** se demostró un defecto técnico objetivo en el armado del propio test (ej. faltaba avanzar el `FakeClock` o registrar un provider de ruta ajeno a la regla probada).
     2. La nueva aserción sigue siendo **estricta y específica** sobre el comportamiento correcto, nunca más laxa.
     3. Si existe cualquier duda sobre si el comportamiento anterior del test protegía una regla de negocio intencional, **detenerse y preguntar al usuario** antes de tocar la expectativa del test.

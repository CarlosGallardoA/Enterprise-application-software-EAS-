# Change Log de <NOMBRE_PROYECTO>

Historial detallado de cada tarea hecha al proyecto, fase por fase, con verificación real (qué se corrió, qué pasó y qué quedó pendiente o fuera del alcance de ejecución). Las reglas vigentes viven en `docs/reglas/`, `docs/estandares/` y `docs/arquitectura/principios-generales.md` para mantener `AGENTS.md` corto y accionable. Las entradas de abajo son **registro histórico congelado (`append-only`)**: las nuevas se agregan arriba con numeración correlativa `### AAAA-MM-DD (N)` y nunca se reescriben entradas pasadas aunque después se reorganicen archivos.

### <FECHA_HOY> (1)

- **Inicialización y gobierno documental del proyecto.** Se estructura el repositorio con `AGENTS.md` en la raíz, `DESIGN.md` y la jerarquía canónica `docs/` gobernada por `docs/AGENTS.md` (`arquitectura/`, `requisitos/`, `guias/`, `operacion/`, `decisiones/`, `auditorias/`, `planes/`, `reglas/`, `estandares/`, `historial/`).
- **Decisiones base adoptadas.** Arquitectura hexagonal + vertical slicing simétrica en backend y frontend; contrato único de errores de negocio `{ reason, details? }` orientado a i18n y `traceId` sin detalles internos para errores `500`; concurrencia optimista (`412`) y Ley Cero de integridad de pruebas (prohibido alterar o saltar tests solo para pasar).
- **Verificación y límites.** Se ejecuta `check-docs-governance.mjs` verificando ausencia de `.md` sueltos en la raíz de `docs/`, longitud acotada de `AGENTS.md` y validez de todos los enlaces relativos. Pendiente implementar los primeros slices funcionales y suites de pruebas del proyecto.

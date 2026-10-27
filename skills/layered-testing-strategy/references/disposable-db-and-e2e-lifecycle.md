# Ciclo de Vida de Bases de Datos Desechables y Pruebas E2E

## 1. Regla absoluta de aislamiento de datos

Las pruebas de integración SQL y las pruebas E2E de navegador **jamás** se conectan a bases compartidas de QA, PreProducción, Producción ni a la base local de trabajo diario del desarrollador.

### Protocolo en 4 pasos (Local y CI)

1. **Creación aislada**:
   - Generar un nombre único por corrida o fixture (`<App>_E2E_<YYYYMMDD_HHMMSS_RAND>` o instancia efímera dedicada por job de CI `<App>_CI_<BuildId>_<JobId>_<Attempt>`).
   - Configurar la cadena de conexión exclusivamente por **variable de entorno de la sesión** del proceso de prueba (nunca escribiendo en archivos de configuración versionados ni en almacenes permanentes de secretos de usuario).
   - Apuntar el directorio de almacenamiento de archivos/documentos a una carpeta temporal exclusiva de esa corrida.

2. **Migración y semilla reproducible**:
   - Ejecutar la herramienta migradora oficial contra la base efímera para crear el esquema exacto desde cero y cargar datos de referencia.
   - Provisionar los perfiles de prueba con roles y alcances conocidos desde helpers compartidos (`e2e/support/auth`).

3. **Ejecución determinista**:
   - Usar siempre **aserciones eventuales con reintento automático** sobre el estado visible o respuestas HTTP; prohibido usar pausas fijas arbitrarias.
   - Cubrir en suites E2E no solo el camino feliz, sino también:
     - Rechazo del servidor con conservación de los datos ingresados en el formulario.
     - Fallo de lectura posterior a una escritura exitosa (ofreciendo recargar sin reenviar el comando).
     - Navegación completa con teclado (`Tab`, flechas, `Escape`, retorno de foco al cerrar modales).
     - Contraste efectivo calculado componiendo las superficies reales apiladas en el navegador y adaptación móvil sin desborde horizontal.
     - Cambio de idioma en caliente y redirección a Acceso Denegado al carecer de permiso.

4. **Limpieza obligatoria (`finally` / `always()`)**:
   - Pasen, fallen o se cancelen las pruebas:
     1. Detener el proceso de la API levantado para la corrida.
     2. Forzar cierre de conexiones activas y eliminar la base efímera (`DROP DATABASE`).
     3. Verificar en el sistema de archivos que no queden archivos de datos/transacciones huérfanos ni la carpeta temporal de documentos.
   - En CI, el script de limpieza valida que la instancia efímera contenga únicamente bases con el prefijo esperado de pruebas antes de borrarlas (nunca hacer borrados globales ciegos en servidores compartidos). Si cualquier verificación falla o queda un residuo local, reportar el nombre exacto de la base y la ruta en disco al cerrar la tarea.

---

## 2. Perfil E2E de endurecimiento de seguridad sobre build productivo

Además de los flujos funcionales contra backend real efímero, mantener un perfil ligero de navegador que sirva el **artefacto compilado con configuración de producción/QA** (con cabeceras CSP, Trusted Types, anti-framing y sin herramientas de depuración) contra respuestas API simuladas para verificar en cada integración continua:
- Cero violaciones de `Content-Security-Policy` y `Trusted Types` al iniciar sesión, abrir modales y previsualizar documentos.
- Rechazo de URLs de retorno maliciosas (`//sitio-externo`, esquemas `javascript:`, barras invertidas y caracteres de control) tras el login.

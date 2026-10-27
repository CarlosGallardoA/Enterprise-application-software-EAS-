# Criptografía Documental (`AES-256-GCM` con AAD), Rotación e Inspección de Cargas

## 1. Formato de Sobre Cifrado Versionado (v2 con `keyId` y `AAD`)

Nunca escribir evidencia sensible en texto plano en disco ni cifrar sin autenticar el contexto del archivo:

```text
[Magic Header 4B: "DOC2"] [KeyId Length 1B] [KeyId UTF-8] [Nonce 12B] [Tag 16B] [Ciphertext ...]
```

- **Algoritmo**: `AES-256-GCM` con nonce aleatorio criptográfico de 96 bits (12 bytes) generado nuevo en cada escritura.
- **AAD (Additional Authenticated Data)**: enlazar el `storageKey` relativo canónico del archivo como `AAD` al cifrar y al descifrar. Si alguien copia el archivo cifrado `expediente-A/doc1.bin` sobre `expediente-B/doc2.bin` en el disco, la verificación del tag GCM falla aunque conozca o comparta la misma llave maestra.
- **Rechazo de texto plano por defecto**: cualquier archivo sin cabecera criptográfica válida falla al leerse salvo ventana explícita y temporal de migración offline.
- **Descarga segura en memoria**: GCM exige verificar el tag de integridad completo antes de entregar un solo byte de texto plano al cliente; descifrar *in-place* sobre un único buffer para no duplicar el consumo de RAM por petición.

## 2. Rotación de Claves sin Romper Respaldos

- Configurar un anillo de claves indexado por identificador (`Keys:v1`, `Keys:v2`...) y un puntero `CurrentKeyId = v2` para escrituras nuevas.
- **Jamás sobrescribir ni borrar `v1`** mientras existan archivos históricos o respaldos cifrados con ella, o si de `v1` se derivan claves HMAC históricas.
- Ejecutar la re-encriptación desde la herramienta CLI de mantenimiento con la API detenida: verifica autenticidad con la clave origen, ignora enlaces simbólicos (*symlinks*), impone tope de tamaño por archivo y reemplaza atómicamente mediante archivo temporal en el mismo directorio.

## 3. Inspección y Contención Previa al Almacenamiento

1. **Rutas canónicas contenidas**: construir claves relativas limpias, resolver la ruta completa y comprobar que empiece estrictamente por `rootPath + separador` (rechazando raíz, `..`, barras mixtas y nombres reservados).
2. **Inspección estricta de plantillas PDF**: analizar la estructura interna con límites de tamaño/objetos antes de guardar y rechazar documentos cifrados, con acciones de apertura (`OpenAction`/`AA`), JavaScript, archivos incrustados, formularios dinámicos XFA o referencias externas.
3. **Separación de permisos `ver` vs. `descargar`**: el endpoint exige poseer al menos uno de los dos permisos (OR) y registra en auditoría la intención declarada; en el cliente, la ausencia de `descargar` suprime controles de guardado en el visor en memoria y valida coherencia real del MIME (`application/pdf` o imagen permitida) antes de crear cualquier `Blob URL`.

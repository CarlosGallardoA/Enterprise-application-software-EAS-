# Patrones de Fakes en Memoria, Fixtures Completas y Reloj Determinista

## 1. Por qué Fakes escritos a mano en vez de Frameworks de Mocking

En una arquitectura hexagonal con vertical slices, cada caso de uso depende únicamente de **1 a 3 puertos pequeños** propios de su slice. Una clase fake en memoria de 15–25 líneas:
- Implementa el contrato real tipado: si el puerto cambia, el compilador señala exactamente qué actualizar.
- Prueba **estado y resultado observable** en lugar de acoplar el test a si un método interno se llamó antes o después de otro.
- Se reutiliza entre los casos de prueba de esa misma feature sin configuración arcana de stubs.

### Estructura canónica de un Fake de Repositorio (pseudocódigo agnóstico)

```text
class InMemoryCompanyRepository implements CompanyRepositoryPort:
    items = Map<Id, Company>()
    expectedVersions = Map<Id, VersionToken>()

    constructor(...seedItems):
        for item in seedItems:
            items.set(item.id, item)

    codeExists(code, excludeId):
        return values(items).any(c => c.code == code and c.id != excludeId)

    findById(id):
        return items.get(id) ?? null

    add(company):
        items.set(company.id, company)

    setConcurrencyToken(company, expectedVersion):
        expectedVersions.set(company.id, expectedVersion)

    saveChanges():
        // Simula validación de versión si el test ejercita conflicto optimista
        for (id, expected) in expectedVersions:
            current = items.get(id)
            if current.version != expected:
                throw ConcurrencyConflictException()
```

---

## 2. Builders de Fixtures Completas (cero casteos parciales)

Cuando una vista o componente renderiza un modelo complejo, pasar un objeto incompleto forzado mediante casteo (`{ id: '1' } as ExpedienteDetalle`) provoca que una colección anidada ausente (`documentos`, `historial`, `permisos`) lance una excepción en medio del ciclo de renderizado fuera del cuerpo del test, rompiendo la suite completa con errores no controlados.

### Regla obligatoria
Crear una función fábrica por modelo de vista en una carpeta `testing/` de esa feature que devuelva **todas** las propiedades obligatorias pobladas con valores válidos por defecto y acepte sobrescrituras parciales:

```text
function claimDetailsFixture(overrides = {}): ClaimDetails {
    return {
        id: "00000000-0000-0000-0000-000000000010",
        number: "REC-2026-0001",
        status: "PendingValidation",
        documents: [],
        flags: [],
        history: [],
        rowVersion: "AQIDBA==",
        ...overrides
    }
}
```

---

## 3. Traducciones reales sin HTTP en pruebas de UI

Nunca mockear el servicio de internacionalización devolviendo la clave cruda ni copiando cadenas literales dentro del test (si alguien borra o renombra la clave en el archivo `.json` real de idioma, el test seguiría pasando en falso mientras producción muestra la clave rota).

- Configurar un helper compartido `provideI18nTesting()` que lea desde disco los archivos reales de traducción del idioma base (`es.json` global + scope de la feature bajo prueba) de forma síncrona en memoria.
- Así las pruebas consultan textos reales o atributos accesibles derivados de las traducciones verdaderas de producción sin tráfico de red.

---

## 4. Prueba agrupada por tabla para delegaciones puras

Cuando en el cliente existen varios casos de uso que únicamente reenvían argumentos 1:1 a su puerto sin lógica adicional, evitar 8 archivos idénticos y usar una única especificación parametrizada:

```text
cases = [
  { name: "listPolicies", invoke: (gw) => new ListPoliciesUseCase(gw).execute(filters, 1, 20), method: "listPolicies", expectedArgs: [filters, 1, 20] },
  { name: "getPolicy",    invoke: (gw) => new GetPolicyUseCase(gw).execute("id-1"),           method: "getPolicy",    expectedArgs: ["id-1"] }
]

for case in cases:
  test("${case.name} delega argumentos exactos, retorna respuesta intacta y propaga fallos")
```

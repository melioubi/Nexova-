# Regla: Convenciones de Dominio Nexova

> **Alcance**: Siempre activa — aplica a cualquier archivo que contenga o procese datos de dominio Nexova (clientes, vacantes, candidatos, contratos, informes).
> **Patrón de archivo**: `**/*.ts`, `**/*.tsx`, `**/*.py`, `**/*.json`, `**/*.md`

---

## 🎯 Propósito

Garantizar que todos los datos, tipos y referencias al dominio de Nexova sean consistentes con el `CONTEXT.md` y las reglas de negocio de la empresa. Esto evita que diferentes partes del sistema usen nombres de campo, monedas o estructuras incompatibles.

---

## 📋 Reglas

### 1. Identificadores de dominio

Todos los IDs de entidades Nexova DEBEN usar el prefijo correspondiente:

| Entidad   | Prefijo | Ejemplo         |
|-----------|---------|-----------------|
| Cliente   | `cli-`  | `cli-001`       |
| Vacante   | `vac-`  | `vac-045`       |
| Candidato | `can-`  | `can-203`       |
| Contrato  | `ctr-`  | `ctr-012`       |
| Informe   | `inf-`  | `inf-007`       |

> ❌ Incorrecto: `id: "123"`, `id: "C001"`, `uuid: "abc-def"`
> ✅ Correcto: `id: "cli-001"`, `id: "vac-045"`

### 2. Moneda

Siempre usar **código ISO 4217** para moneda. Las operaciones de Nexova usan exclusivamente:

| País      | Moneda | Código |
|-----------|--------|--------|
| Chile     | Peso chileno | `CLP` |
| Argentina | Peso argentino | `ARS` |

> ❌ Incorrecto: `moneda: "$"`, `currency: "pesos"`, `salario: 3500000` (sin moneda)
> ✅ Correcto: `moneda: "CLP"`, `salarioMin: 3500000`

### 3. Fechas

Todas las fechas DEBEN estar en formato ISO 8601 (`YYYY-MM-DD`).

> ❌ Incorrecto: `"01/08/2026"`, `"08-01-2026"`, `"August 1, 2026"`
> ✅ Correcto: `"2026-08-01"`

### 4. Estados de vacante

Los estados de una vacante solo pueden ser:

| Valor | Significado |
|-------|-------------|
| `abierta` | Vacante publicada, recibiendo candidaturas |
| `en_proceso` | En fase de selección activa |
| `pausada` | Temporalmente detenida por el cliente |
| `cerrada_con_exito` | Cubierta con candidato aceptado |
| `cerrada_sin_exito` | No se cubrió, expiró o se canceló |

### 5. Estados de candidato

Los estados de un candidato en un proceso solo pueden ser:

| Valor | Significado |
|-------|-------------|
| `recibido` | Candidatura recibida, pendiente de revisión |
| `en_revision` | Siendo evaluado por el consultor |
| `preseleccionado` | Pasa a la siguiente fase |
| `entrevistado` | Entrevista completada |
| `rechazado` | No continúa en el proceso |
| `contratado` | Oferta aceptada, proceso cerrado |

### 6. Género para reportes de diversidad

Usar exclusivamente para reportes de equidad:

| Valor | Significado |
|-------|-------------|
| `femenino` | Género femenino |
| `masculino` | Género masculino |
| `no_binario` | Género no binario |
| `no_especifica` | Prefiere no indicar |

### 7. Campos obligatorios por entidad

**Cliente**: `id`, `nombre`, `sector`, `pais`, `fechaAlta`, `estado`
**Vacante**: `id`, `idCliente`, `titulo`, `departamento`, `tipoContrato`, `modalidad`, `fechaApertura`, `estado`, `salarioMin`, `salarioMax`, `moneda`
**Candidato**: `id`, `nombres`, `apellidos`, `email`, `pais`, `estado`

---

## 🚨 Violaciones Comunes

1. Usar `camelCase` vs `snake_case` inconsistentemente → Usar siempre `camelCase` (TypeScript) o `snake_case` (Python) según el lenguaje
2. Olvidar el prefijo en IDs → Siempre incluir el prefijo de 3 letras + guión
3. No incluir la moneda en campos salariales → `salarioMin`/`salarioMax` siempre acompañados de `moneda`
4. Usar estados inventados → Solo usar los valores de las tablas anteriores

---

> **Referencia**: [CONTEXT.md](../../CONTEXT.md) — Fuente única de verdad con datos de ejemplo
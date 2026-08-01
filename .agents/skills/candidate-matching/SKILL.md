# Skill: Candidate-Vacancy Matching (Matching Candidato-Vacante)

> **Última actualización**: 2026-08-01
> **Categoría**: HR / People Analytics
> **Ubicación en el monorepo**: `.agents/skills/candidate-matching/`

---

## 🎯 Objetivo Único

Evaluar el grado de alineación entre un candidato y una vacante activa de Nexova, produciendo un score de matching y un reporte estructurado con fortalezas, brechas y recomendación final.

---

## 📥 Inputs

| Parámetro | Tipo | Obligatorio | Descripción |
|-----------|------|-------------|-------------|
| `candidato` | `Candidato` (objeto) | Sí | Datos del candidato (skills, experiencia, ubicación, etc.) |
| `vacante` | `Vacante` (objeto) | Sí | Datos de la vacante (requisitos, ubicación, rango salarial, etc.) |
| `ponderacionSkills` | `Record<string, number>` (opcional) | No | Ponderación personalizada por skill (0-1). Por defecto todas las skills pesan igual. |
| `incluirDetalle` | `boolean` (opcional) | No | Si es `true`, incluye desglose línea por línea del scoring. Default: `false`. |

### Formato esperado de `Candidato`

```typescript
{
  id: "can-203",
  nombres: "María",
  apellidos: "González López",
  email: "maria.gonzalez@email.com",
  pais: "Chile",
  ciudad: "Santiago",
  tituloProfesional: "Ingeniera Civil Informática",
  añosExperiencia: 6,
  skills: ["React", "Node.js", "TypeScript", "AWS", "PostgreSQL"],
  estado: "en_proceso",
  salarioEsperado: 4200000,
  moneda: "CLP",
  disponibilidad: "inmediata"
}
```

### Formato esperado de `Vacante`

```typescript
{
  id: "vac-045",
  idCliente: "cli-001",
  titulo: "Senior Full Stack Developer",
  departamento: "Ingeniería",
  tipoContrato: "indefinido",
  modalidad: "híbrida",
  ubicacion: "Santiago, Chile",
  fechaApertura: "2026-06-01",
  fechaLimite: "2026-08-01",
  estado: "en_proceso",
  salarioMin: 3500000,
  salarioMax: 5000000,
  moneda: "CLP",
  skillsRequeridas: ["React", "Node.js", "TypeScript", "PostgreSQL"],
  skillsDeseables: ["AWS", "Docker", "GraphQL"],
  experienciaMinima: 4,
  requiereViaje: false
}
```

---

## 🔄 Proceso de Matching

El agente debe ejecutar los siguientes pasos en orden:

### Paso 1: Validar inputs
- Verificar que `candidato` cumple con el formato de `Candidato` del `CONTEXT.md`
- Verificar que `vacante` cumple con el formato de `Vacante` del `CONTEXT.md`
- Si falta algún campo obligatorio, detenerse y reportar el error

### Paso 2: Calcular score de skills
- Comparar `candidato.skills` contra `vacante.skillsRequeridas` y `vacante.skillsDeseables`
- **Skills requeridas**: Cada skill presente suma 20 puntos (max 100 si hay 5 skills, ponderar si son más o menos). Si falta alguna skill requerida, penalizar -15 puntos por cada una.
- **Skills deseables**: Cada skill presente suma 10 puntos adicionales.
- Aplicar `ponderacionSkills` si se proporcionó.

### Paso 3: Evaluar experiencia
- Comparar `candidato.añosExperiencia` contra `vacante.experienciaMinima`
- Si cumple o supera: +10 puntos
- Si está por debajo pero hasta 50% menos: +5 puntos (experiencia cercana)
- Si está por debajo del 50%: -10 puntos

### Paso 4: Evaluar ubicación
- Si `candidato.pais` coincide con el país de `vacante.ubicacion`: +10 puntos
- Si además `candidato.ciudad` coincide con la ciudad: +5 puntos adicionales
- Para modalidad `remota`: +5 puntos independientemente de la ubicación

### Paso 5: Evaluar rango salarial
- Si `candidato.salarioEsperado` está dentro de `[vacante.salarioMin, vacante.salarioMax]`: +15 puntos
- Si está hasta 15% por encima del máximo: +5 puntos (negociable)
- Si está más de 15% por encima: -10 puntos
- Si no hay dato salarial del candidato: 0 puntos (sin penalizar)

### Paso 6: Calcular score total y categoría
- Sumar todos los puntajes (máximo teórico: skills 100 + deseables 50 + experiencia 10 + ubicación 15 + salario 15 = **190 puntos**)
- Normalizar a porcentaje: `scoreFinal = (puntajeTotal / 190) * 100`
- Categorizar:
  - **Alto** (≥80%): Candidato muy alineado. Recomendar preselección.
  - **Medio** (≥50% y <80%): Candidato parcialmente alineado. Considerar entrevista.
  - **Bajo** (<50%): Candidato no alineado. No recomendar.

---

## 📤 Output

El agente DEBE producir un reporte estructurado en el siguiente formato:

```json
{
  "skillName": "candidate-matching",
  "version": "1.0.0",
  "timestamp": "2026-08-01T12:00:00Z",
  "candidatoId": "can-203",
  "vacanteId": "vac-045",
  "scoreTotal": 85,
  "categoria": "Alto",
  "recomendacion": "Preseleccionar",
  "desglose": {
    "skillsRequeridas": {
      "puntaje": 80,
      "maximo": 100,
      "detalle": {
        "React": "presente",
        "Node.js": "presente",
        "TypeScript": "presente",
        "PostgreSQL": "presente"
      }
    },
    "skillsDeseables": {
      "puntaje": 20,
      "maximo": 50,
      "detalle": {
        "AWS": "presente",
        "Docker": "ausente",
        "GraphQL": "ausente"
      }
    },
    "experiencia": {
      "puntaje": 10,
      "maximo": 10,
      "detalle": "6 años vs 4 años mínimos requeridos"
    },
    "ubicacion": {
      "puntaje": 15,
      "maximo": 15,
      "detalle": "Misma ciudad (Santiago, Chile)"
    },
    "salario": {
      "puntaje": 15,
      "maximo": 15,
      "detalle": "CLP 4,200,000 dentro del rango CLP 3,500,000 - 5,000,000"
    }
  },
  "fortalezas": [
    "Cumple con todas las skills requeridas",
    "Experiencia supera el mínimo requerido",
    "Ubicación coincide exactamente con la vacante"
  ],
  "brechas": [
    "No tiene Docker (skill deseable)",
    "No tiene GraphQL (skill deseable)"
  ],
  "notasAdicionales": "Candidato con disponibilidad inmediata, factor positivo para el cliente."
}
```

---

## ✅ Criterios de Aceptación

| # | Criterio | Cómo verificar |
|---|----------|---------------|
| 1 | Score calculado correctamente | Reproducir manualmente con los mismos inputs y verificar que el score numérico coincide |
| 2 | Formato de output válido | El JSON de output contiene todos los campos requeridos: `skillName`, `version`, `timestamp`, `candidatoId`, `vacanteId`, `scoreTotal`, `categoria`, `recomendacion`, `desglose`, `fortalezas`, `brechas` |
| 3 | Categorización correcta | Score < 50 → "Bajo", ≥ 50 y < 80 → "Medio", ≥ 80 → "Alto" |
| 4 | Manejo de errores en inputs | Si falta un campo obligatorio en candidato o vacante, el skill devuelve un error descriptivo y no produce score |
| 5 | Ponderación personalizada | Si se proporciona `ponderacionSkills`, los pesos se aplican correctamente al cálculo de skills |
| 6 | Sin efectos secundarios | El skill solo lee los inputs y produce output — no modifica ningún archivo, base de datos ni estado del monorepo |
| 7 | Compatibilidad con datos reales | El skill funciona con los datos de ejemplo de `CONTEXT.md` (cli-001, vac-045, can-203) |

---

## 📋 Ejemplo de Uso (Prompt para el agente)

```
Ejecuta la skill candidate-matching con los siguientes datos:
- candidato: can-203 (María González, datos en CONTEXT.md)
- vacante: vac-045 (Senior Full Stack Developer, datos en CONTEXT.md)
- incluirDetalle: true
```

---

## 🔗 Referencias

- [CONTEXT.md](../../../CONTEXT.md) — Datos de ejemplo de cliente, vacante y candidato
- [nexova-domain-conventions.md](../../rules/nexova-domain-conventions.md) — Convenciones de IDs, moneda, estados
- [projectbrief.md](../../../memory-bank/projectbrief.md) — Contexto del proyecto
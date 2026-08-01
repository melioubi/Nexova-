# Nexova — Contexto de la Empresa

> **Consultoría de RR.HH. y Adquisición de Talento**
> Operaciones en Chile y Argentina
> Fundada: 2019
> Equipo: 45+ consultores internos

---

## 📋 Descripción del Negocio

Nexova es una consultora especializada en **recursos humanos y adquisición de talento** que opera en Chile y Argentina. La empresa ofrece servicios integrales de gestión de capital humano a organizaciones de diversos sectores, ayudándoles a atraer, retener y desarrollar el mejor talento disponible en la región.

---

## 🎯 Propuesta de Valor

Nexova combina **consultoría estratégica en RR.HH.** con **tecnología de análisis de personas** para ofrecer soluciones basadas en datos. La empresa se diferencia por su profundo conocimiento del mercado laboral chileno y argentino, sus redes de talento sectoriales y su capacidad para ejecutar procesos de búsqueda y selección en plazos reducidos.

---

## 🧩 Servicios

### 1. Adquisición de Talento (Executive Search & RPO)
- Búsqueda y selección de perfiles ejecutivos y mandos medios
- Recruitment Process Outsourcing (RPO) para empresas en crecimiento
- Headhunting sectorial (tecnología, finanzas, retail, minería, salud)
- Evaluación psicométrica y por competencias

### 2. Consultoría en RR.HH.
- Diagnóstico organizacional y clima laboral
- Diseño de estructuras salariales y compensaciones
- Planes de carrera y sucesión
- Transformación cultural y gestión del cambio
- Outsourcing de nómina y administración de personal

### 3. People Analytics
- Dashboard de métricas de RR.HH. para clientes (rotación, ausentismo, tiempo de contratación)
- Modelos predictivos de fuga de talento
- Análisis de brechas de habilidades y planes de capacitación
- Informes de equidad salarial y diversidad

---

## 🌍 Mercado y Operaciones

| País  | Oficina central | Sectores principales                          | Clientes activos |
|-------|----------------|-----------------------------------------------|------------------|
| Chile | Santiago       | Minería, Retail, Tecnología, Banca            | 38               |
| Argentina | Buenos Aires  | Fintech, Salud, Agroindustria, Manufactura    | 27               |

---

## 📊 KPIs Clave del Negocio

- **Rotación de personal (clientes)**: `(bajas en período / plantilla media en período) * 100`
- **Tasa de ausentismo**: `(días ausentes / total días laborables) * 100`
- **Tiempo de contratación (Time to Fill)**: Días desde apertura de vacante hasta aceptación de oferta
- **Tasa de retención a 12 meses**: `(contratados que continúan tras 12 meses / total contratados en el período) * 100`
- **Satisfacción del cliente (NPS)**: Encuesta trimestral a clientes activos
- **% de vacantes cubiertas en plazo**: Proporción de procesos que cierran dentro del SLA acordado

---

## 🏗️ Stack Tecnológico

- **Frontend**: Next.js + TypeScript + Tailwind CSS
- **Backend**: FastAPI (Python)
- **Base de datos**: PostgreSQL
- **Infraestructura**: Docker, GitHub Actions
- **IA/Agentes**: Python, LangChain, OpenAI API

---

## ⚠️ Restricciones y Reglas de Negocio

1. **Cumplimiento legal**: Todos los procesos deben cumplir con las leyes laborales de Chile y Argentina (Código del Trabajo CL, Ley de Contrato de Trabajo AR)
2. **Confidencialidad**: Los datos de clientes y candidatos son estrictamente confidenciales
3. **SLA de contratación**: Los procesos de selección ejecutiva deben cerrarse en máximo 45 días hábiles
4. **Equidad salarial**: Todas las recomendaciones salariales deben considerar las bandas salariales del mercado y equidad interna
5. **Diversidad**: En cada proceso de selección debe haber al menos un 40% de candidatos del género subrepresentado en la shortlist final

---

## 🧪 Datos de Ejemplo

```typescript
// Cliente
{
  id: "cli-001",
  nombre: "TechCorp Chile S.A.",
  sector: "Tecnología",
  pais: "Chile",
  fechaAlta: "2022-03-15",
  estado: "activo",
  npsActual: 82
}

// Vacante
{
  id: "vac-045",
  idCliente: "cli-001",
  titulo: "Senior Full Stack Developer",
  departamento: "Ingeniería",
  tipoContrato: "indefinido",
  modalidad: "híbrida",
  fechaApertura: "2026-06-01",
  fechaLimite: "2026-08-01",
  estado: "en_proceso",
  salarioMin: 3500000,
  salarioMax: 5000000,
  moneda: "CLP"
}

// Candidato
{
  id: "can-203",
  nombres: "María",
  apellidos: "González López",
  email: "maria.gonzalez@email.com",
  telefono: "+56 9 1234 5678",
  pais: "Chile",
  tituloProfesional: "Ingeniera Civil Informática",
  añosExperiencia: 6,
  skills: ["React", "Node.js", "TypeScript", "AWS", "PostgreSQL"],
  estado: "en_proceso",
  idVacante: "vac-045"
}
```

---

_Última actualización: 2026-08-01_
_Este archivo es la fuente única de verdad sobre el negocio de Nexova. Cualquier agente, skill o automatización debe referirse a este contexto antes de operar._

# Nexova — Contexto de la Empresa

> **Consultoría de RR.HH. y Adquisición de Talento**
> Operaciones en Chile y Argentina
> Fundada: 2019
> Equipo: 45+ consultores internos

---

## 📋 Descripción del Negocio

Nexova es una consultora especializada en **recursos humanos y adquisición de talento** que opera en Chile y Argentina. La empresa ofrece servicios integrales de gestión de capital humano a organizaciones de diversos sectores.

---

## 🧩 Servicios

1. **Adquisición de Talento** — Executive Search & RPO
2. **Consultoría en RR.HH.** — Diagnóstico organizacional, compensaciones, planes de carrera
3. **People Analytics** — Dashboards de métricas, modelos predictivos

---

## 🏗️ Stack Tecnológico

- **Frontend**: Next.js + TypeScript + Tailwind CSS
- **Backend**: FastAPI (Python)
- **Base de datos**: PostgreSQL (Supabase)
- **Infraestructura**: Docker, GitHub Actions

---

## 🧪 Entidades de Inventario para Nexova

Nexova gestiona su talento como un inventario clasificado por categorías de skill y país.

### TalentAsset (equivalente a producto)
Representa una categoría de talento que Nexova gestiona como inventario.

| Campo            | Tipo   | Descripción                                      |
|------------------|--------|--------------------------------------------------|
| id               | UUID   | Identificador único                              |
| name             | str    | Nombre del talent asset (ej: "Full-Stack Dev")   |
| skill_category   | str    | Categoría de skill (ej: "Engineering", "Data")   |
| country          | str    | País (Chile / Argentina) — **clave de partición** |
| description      | str    | Descripción del perfil                           |

### TalentEntry (equivalente a entrada / inbound)
Registra la incorporación de talento al pipeline.

| Campo          | Tipo     | Descripción                                            |
|----------------|----------|--------------------------------------------------------|
| id             | UUID     | Identificador único                                    |
| talent_asset_id| UUID     | FK → TalentAsset.id                                    |
| quantity       | int      | Cantidad de unidades de talento añadidas               |
| notes          | str      | Notas del consultor                                    |
| created_at     | datetime | Fecha del registro                                     |
| user_uuid      | str      | UUID del usuario TinyDB que creó la orden              |

### TalentExit (equivalente a salida / outbound)
Registra la salida/colocación de talento del pipeline.

| Campo          | Tipo     | Descripción                                            |
|----------------|----------|--------------------------------------------------------|
| id             | UUID     | Identificador único                                    |
| talent_asset_id| UUID     | FK → TalentAsset.id                                    |
| quantity       | int      | Cantidad de unidades de talento retiradas              |
| notes          | str      | Notas del consultor                                    |
| created_at     | datetime | Fecha del registro                                     |
| user_uuid      | str      | UUID del usuario TinyDB que creó la orden              |

### Reglas de Negocio

1. **Stock calculado**: `current_stock = SUM(entries) - SUM(exits)` por `(talent_asset_id, country)` — nunca almacenado directamente.
2. **Sin stock negativo**: Un exit que resultaría en stock < 0 se rechaza con HTTP 400.
3. **Trazabilidad**: Toda orden almacena el `user_uuid` del creador autenticado (TinyDB).
4. **Partición por país**: El stock se calcula dentro del mismo país (Chile o Argentina).

---

## 📊 Datos Semilla

### TalentAssets

| name                  | skill_category  | country    | description                          |
|-----------------------|-----------------|------------|--------------------------------------|
| Full-Stack Developer  | Engineering     | Chile      | Perfiles senior full-stack           |
| Data Scientist        | Data            | Chile      | Especialistas en datos y ML          |
| Executive Headhunter  | Consulting      | Argentina  | Headhunters senior                   |
| UX Researcher         | Design          | Argentina  | Investigadores de experiencia        |

### TalentEntries (stock inicial)

| talent_asset                 | quantity | notes                  |
|------------------------------|----------|------------------------|
| Full-Stack Developer (Chile) | 15       | Stock inicial pipeline |
| Data Scientist (Chile)       | 10       | Stock inicial pipeline |
| Executive Headhunter (Arg)   | 8        | Stock inicial pipeline |
| UX Researcher (Arg)          | 5        | Stock inicial pipeline |

### TalentExits

| talent_asset                 | quantity | notes                          |
|------------------------------|----------|--------------------------------|
| Full-Stack Developer (Chile) | 3        | Colocados en TechCorp Chile    |
| Executive Headhunter (Arg)   | 2        | Colocados en Fintech AR        |

### Stock neto resultante

| talent_asset                 | country    | stock |
|------------------------------|------------|-------|
| Full-Stack Developer         | Chile      | 12    |
| Data Scientist               | Chile      | 10    |
| Executive Headhunter         | Argentina  | 6     |
| UX Researcher                | Argentina  | 5     |

---

_Última actualización: 2026-09-26_
_Este archivo es la fuente única de verdad sobre Nexova. Cualquier agente, skill o automatización debe referirse a este contexto antes de operar._

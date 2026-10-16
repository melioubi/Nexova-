# Nexova — Project Brief

> **Última actualización**: 2026-08-01
> **Propósito**: Este archivo es la fuente principal de contexto de negocio para cualquier agente que opere en el monorepo. Debe leerse al inicio de cada sesión.

---

## 🏢 La Empresa

**Nexova** es una consultora de **RR.HH. y Adquisición de Talento** fundada en 2019, con operaciones en **Chile** (Santiago) y **Argentina** (Buenos Aires). Cuenta con un equipo de **45+ consultores internos** que atienden a **65+ clientes activos** en sectores como minería, retail, tecnología, banca, fintech, salud, agroindustria y manufactura.

---

## 🎯 Objetivos del Proyecto

1. **Centralizar la operación digital de Nexova** en un monorepo que integre frontend, backend, agentes de IA y automatizaciones.
2. **Construir una plataforma web pública** que comunique los servicios de Nexova y atraiga nuevos clientes.
3. **Desarrollar un backoffice interno** que permita gestionar clientes, vacantes, candidatos y métricas de RR.HH.
4. **Implementar agentes de IA** que automaticen tareas recurrentes: análisis de CVs, matching candidato-vacante, generación de informes.
5. **Establecer una infraestructura AI-ready** con banco de memoria, reglas de agente y skills reutilizables.

---

## 🧩 Problema que Resuelve

Las consultoras de RR.HH. tradicionales operan con procesos manuales, datos dispersos en hojas de cálculo y poca capacidad de análisis. Nexova necesita:

- Unificar la gestión de **clientes, vacantes y candidatos** en un solo sistema
- Ofrecer a sus clientes **dashboards de métricas** (rotación, ausentismo, time to fill)
- Automatizar la **preselección de candidatos** con IA
- Mantener la **confidencialidad y compliance** legal en Chile y Argentina
- Escalar su operación sin multiplicar el equipo administrativo

---

## 📐 Principios de Arquitectura

| Principio | Descripción |
|-----------|-------------|
| **AI-ready** | Todo el código debe ser navegable por agentes de IA: contexto claro, estructura predecible, reglas documentadas |
| **Coherencia** | Un solo monorepo, un solo contexto de negocio (`CONTEXT.md`), tipos compartidos en `packages/shared` |
| **Separación de responsabilidades** | Cada carpeta top-level tiene un propósito único (ver `README.md` raíz) |
| **Reutilización** | Componentes React, types y lógica de negocio se comparten, no se duplican |
| **Verificabilidad** | Skills y agentes tienen criterios de aceptación explícitos y testables |

---

## 📁 Estructura del Monorepo

```
./
├── CONTEXT.md              ← Fuente única de verdad del negocio
├── AGENTS.md               ← Protocolo de operación para agentes de IA
├── memory-bank/            ← Banco de memoria del proyecto
│   ├── projectbrief.md     ← Este archivo
│   ├── techContext.md      ← Contexto técnico
│   └── progress.md         ← Estado del desarrollo
├── .agents/                ← Configuración de agentes de código (reglas + skills)
│   ├── rules/              ← Reglas de desarrollo
│   └── skills/             ← Skills de agente reutilizables
├── uis/                    ← Interfaces de usuario
│   ├── website/            ← Web pública (Next.js)
│   └── backoffice/         ← Backoffice interno (Next.js)
├── services/               ← APIs (FastAPI)
├── agents/                 ← Agentes de IA (producto)
├── skills/                 ← Skills de agente (producto)
├── packages/shared/        ← Tipos compartidos
└── data/                   ← Datos, pipelines, evaluaciones
```

---

## 🌐 Canales y Público

| Canal | Público | Tecnología |
|-------|---------|------------|
| Web pública (`uis/website`) | Clientes potenciales | Next.js + TypeScript + Tailwind |
| Backoffice (`uis/backoffice`) | Consultores internos Nexova | Next.js + TypeScript + Tailwind |
| API (`services/`) | Sistemas internos y futuras integraciones | FastAPI (Python) |

---

_Referencia: [CONTEXT.md](../CONTEXT.md)_
# Nexova — Tech Context

> **Última actualización**: 2026-08-01
> **Propósito**: Documentar el stack tecnológico, las decisiones de arquitectura y las restricciones técnicas del proyecto Nexova.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Versión | Propósito |
|------|-----------|---------|-----------|
| Frontend (web pública) | Next.js + TypeScript | 14+ | Sitio corporativo y landing pages |
| Frontend (backoffice) | Next.js + TypeScript | 14+ | Panel interno de gestión |
| Estilos | Tailwind CSS | 3.x | Diseño utilitario y consistente |
| Backend / API | FastAPI (Python) | 0.110+ | API centralizada del negocio |
| Base de datos | PostgreSQL | 15+ | Datos relacionales (clientes, vacantes, candidatos) |
| Contenedores | Docker | 24+ | Entorno de desarrollo local |
| CI/CD | GitHub Actions | — | Integración y despliegue continuos |
| IA / Agentes | Python + LangChain + OpenAI | — | Agentes inteligentes y skills |
| Paquete compartido | `@repo/shared-types` | 0.0.1 | Tipos TypeScript compartidos |

---

## 🏗️ Decisiones de Arquitectura

### 1. Monorepo con estructura por capas
Cada carpeta raíz tiene una responsabilidad única (ver `README.md`). No se mezclan frontends con backends, ni agentes con datos.

- `uis/` → Solo interfaces de usuario
- `services/` → Solo APIs (FastAPI)
- `agents/` → Solo agentes de IA (producto)
- `data/` → Solo archivos y pipelines de datos

### 2. Next.js 14 con App Router
Ambos frontends (`website` y `backoffice`) usan Next.js 14+ con App Router para aprovechar:
- Server Components para contenido estático
- Layouts anidados y templates
- TypeScript nativo

### 3. Backend único con FastAPI
Siguiendo la recomendación del template, un solo backend FastAPI centralizado, evitando microservicios prematuros. Los routers se organizan por dominio:
- `/clientes`, `/vacantes`, `/candidatos`, `/reportes`, `/usuarios`

### 4. Types compartidos desde `packages/shared`
Los tipos de dominio (Cliente, Vacante, Candidato, etc.) viven en `packages/shared/types/` y se importan desde cualquier frontend o servicio, **nunca se duplican**.

### 5. Banco de memoria como fuente de contexto
Los agentes de código leen `memory-bank/` al inicio de cada sesión. El `CONTEXT.md` es la fuente única de verdad del negocio.

### 6. Configuración de agente en `.agents/` no en `agents/`
- `.agents/` → Configuración del agente de desarrollo (reglas, skills para Cursor/Windsurf/Claude Code)
- `agents/` → Código de producto (agentes que construimos para Nexova)

---

## ⚙️ Convenciones de Código

| Convención | Estándar |
|-----------|----------|
| TypeScript | Strict mode, `noImplicitAny`, `strictNullChecks` |
| Nombres de componentes | PascalCase (`CandidateCard.tsx`) |
| Nombres de archivos de lógica | camelCase (`matchCandidates.ts`) |
| Estilos | Tailwind CSS utility classes (sin CSS modules ni styled-components) |
| Formato de fechas | ISO 8601 (`2026-08-01`) |
| Moneda | Usar código ISO (`CLP`, `ARS`) — nunca símbolos en datos |
| Tipos compartidos | Definir en `packages/shared/types/index.ts` |
| Commits | Convencional commits (`feat:`, `fix:`, `docs:`, `chore:`) |

---

## 📦 Dependencias Compartidas

```json
{
  "name": "@repo/shared-types",
  "version": "0.0.1",
  "main": "types/index.ts",
  "types": "types/index.ts"
}
```

Actualmente contiene tipos base (`Id`, `BaseEntity`). Debe extenderse con tipos de dominio Nexova:
- `Cliente`, `Vacante`, `Candidato`, `Contrato`, `Informe`

---

## 🚧 Restricciones Técnicas

1. **Sin duplicación de lógica de negocio**: El código de lógica (Hito 2) se importa desde su ubicación original, no se copia.
2. **Las APIs deben ir en `/services`**: No se crean APIs dentro de `uis/`.
3. **Node.js 18+ requerido**: Para compatibilidad con Next.js 14.
4. **El puerto 3000** se reserva para `uis/website`. `uis/backoffice` debe usar otro puerto (ej: 3001).
5. **Variables de entorno**: No committear `.env.local`. Usar `.env.example` como plantilla.

---

## 🔗 Referencias

- [Project Brief](./projectbrief.md)
- [CONTEXT.md](../CONTEXT.md)
- [README.md](../README.md) (raíz del monorepo)
- [uis/README.md](../uis/README.md)
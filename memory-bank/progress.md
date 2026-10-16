# Nexova — Progress

> **Última actualización**: 2026-08-01
> **Próxima actualización**: Al completar cada hito o decisión relevante

---

## 🟢 Estado Actual

### Hito 4 — Ingeniería impulsada por IA (COMPLETADO ✅)

| Componente | Estado | Notas |
|-----------|--------|-------|
| `CONTEXT.md` | ✅ Completo | Briefing de Nexova documentado (incluye ES) |
| `memory-bank/` | ✅ Completo | `projectbrief.md`, `techContext.md`, `progress.md` creados |
| `AGENTS.md` | ✅ Completo | Flujo de 5 pasos pre-commit, 11 entradas protegidas, Conventional Commits |
| `.agents/rules/nexova-domain-conventions.md` | ✅ Completo | Convenciones de naming, IDs, monedas, estados |
| `.agents/skills/candidate-matching/SKILL.md` | ✅ Completo | Skill con scoring 190pts, 3 tiers, 7 acceptance criteria |
| `uis/website` (Next.js) | ✅ Completo | 6 componentes, build exitoso, ruta `/` estática |
| `uis/backoffice` | ✅ Completo | Layout dashboard sidebar, build exitoso |
| Integración Hito 2 | ✅ Completo | Importa `@nexova/business-logic` vía npm workspaces  |
| `packages/business-logic/` | ✅ Completo | Barrel export, 4 utils (collections, search, transformations, validations), sampleData |
| `packages/shared/types/` | ✅ Completo | BaseEntity, Id types |
| Verificación final | ✅ Completo | Ambos frontends compilan sin errores |
| PR preparado | 🔜 Pendiente | Por crear PR hacia `main` con capturas de pantalla |

---

## ✅ Hitos Completados

### Hito 1 — Web Corporativa
- Maqueta HTML/CSS de la web corporativa de Nexova
- Secciones: Hero, Servicios, Metodología, Equipo, Contacto
- Diseño responsive con identidad visual definida

### Hito 2 — Lógica de Negocio
- Módulo TypeScript con lógica de gestión de RR.HH.
- Tipos y funciones para clientes, vacantes, candidatos
- Procesamiento de datos de ejemplo

### Hito 3 — Componentes con IA
- Primeros componentes generados con asistencia de IA
- Refinamiento de prompts y estructura

### Hito 4 — Ingeniería impulsada por IA (2026-08-01)
- Infraestructura de agentes completa (AGENTS.md, rules, skills)
- Monorepo con npm workspaces raíz
- `uis/website`: web corporativa Next.js con 6 componentes reutilizables
- `uis/backoffice`: dashboard interno con sidebar, 4 pestañas (Ranking, Reportes, Colecciones, Búsqueda)
- `packages/business-logic`: módulo compartido importado desde Hito 2
- Integración completa de lógica de negocio en backoffice con visualización en pantalla

---

## 📋 Próximos Pasos (Priorizados)

1. **Abrir PR hacia `main`**
   - Verificar que todo compila correctamente
   - Incluir capturas de pantalla de ambos frontends
   - Enlazar AGENTS.md en la descripción

---

## 🐛 Problemas Conocidos

- Next.js advierte sobre múltiples lockfiles al tener workspaces; se puede silenciar con `turbopack.root` en `next.config.js`

---

## 📌 Decisiones Recientes

| Fecha | Decisión | Justificación |
|-------|----------|---------------|
| 2026-08-01 | Usar `uis/website` en puerto 3000 y `uis/backoffice` en puerto 3001 | Evitar conflictos de puerto al desarrollar ambos frontends simultáneamente |
| 2026-08-01 | Banco de memoria como fuente de contexto para agentes | Asegurar que cada sesión del agente comience con el contexto completo del proyecto |
| 2026-08-01 | Tipos de dominio en `packages/shared` | Evitar duplicación y mantener coherencia entre frontends y backend |
| 2026-08-01 | npm workspaces raíz con `@nexova/business-logic:*` | Permite imports directos entre packages/ y uis/ sin configurar publicaciones npm |
| 2026-08-01 | Import relativo a `@nexova/business-logic` en backoffice | Resuelto via symlink en node_modules raíz por npm workspaces |

---

_Actualiza este archivo cada vez que completes un hito, tomes una decisión de arquitectura o identifiques un problema._
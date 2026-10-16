# AGENTS.md — Protocolo de Operación para Agentes de IA

> **Última actualización**: 2026-08-01
> **Propósito**: Definir cómo cualquier agente de IA debe operar en el monorepo de Nexova. Este archivo es de obligado cumplimiento.

---

## 1. 📖 Lectura Obligatoria al Inicio de Cada Sesión

Antes de tocar cualquier archivo o escribir código, el agente DEBE leer los siguientes archivos en este orden:

| Orden | Archivo | Propósito |
|-------|---------|-----------|
| 1 | `CONTEXT.md` | Contexto de negocio de Nexova — empresa, servicios, restricciones |
| 2 | `memory-bank/projectbrief.md` | Objetivos del proyecto, problema que resuelve, principios de arquitectura |
| 3 | `memory-bank/techContext.md` | Stack tecnológico, decisiones de arquitectura, convenciones de código |
| 4 | `memory-bank/progress.md` | Estado actual del desarrollo, próximos pasos, problemas conocidos |
| 5 | `AGENTS.md` | Este archivo — protocolo de operación del agente |
| 6 | `.agents/rules/` (todos los archivos) | Reglas de desarrollo específicas del repositorio |

> ⚠️ **Importante**: Si el agente no puede acceder a alguno de estos archivos, debe detenerse y notificar al desarrollador antes de continuar.

---

## 2. 🔄 Flujo Obligatorio Antes de Cada Commit

El agente DEBE seguir estos 5 pasos en orden antes de hacer cualquier commit:

### Paso 1: Verificar contexto
- Releer `memory-bank/progress.md` para conocer el estado actual
- Confirmar que lo que va a hacer está alineado con los próximos pasos documentados
- Si no lo está, preguntar al desarrollador antes de proceder

### Paso 2: Analizar el impacto
- Identificar todos los archivos que serán modificados, creados o eliminados
- Verificar que ningún cambio afecta a archivos o carpetas protegidas (ver Sección 3)
- Ejecutar `git diff --stat` para tener una visión general de los cambios

### Paso 3: Validar contra las reglas
- Revisar las reglas en `.agents/rules/` aplicables al alcance del cambio
- Verificar que el código sigue las convenciones definidas en `techContext.md`
- Confirmar que no se duplica lógica de negocio existente

### Paso 4: Ejecutar validaciones técnicas
- Si hay cambios en `uis/`: ejecutar `npm run lint` y `npm run build` (o `tsc --noEmit`) en el proyecto afectado
- Si hay cambios en tipos compartidos: verificar que no se rompen imports en otros proyectos
- Si hay cambios en skills o reglas: verificar que los criterios de aceptación son comprobables
- Corregir cualquier error antes de continuar

### Paso 5: Actualizar documentación
- Actualizar `memory-bank/progress.md` con el cambio realizado (nuevo estado, decisiones tomadas)
- Si el cambio introduce una nueva decisión de arquitectura, documentarla en `memory-bank/techContext.md`
- Si el cambio afecta al negocio, actualizar `CONTEXT.md` si es necesario

> ❌ **Nunca hacer commit sin completar los 5 pasos. Si hay errores en el paso 4, detenerse y notificar.**

---

## 3. 🚫 Archivos y Carpetas Protegidos

El agente NO DEBE modificar los siguientes archivos sin confirmación explícita del desarrollador:

| Ruta | Motivo |
|------|--------|
| `CONTEXT.md` | Fuente única de verdad del negocio — cambios pueden desalinear todo el proyecto |
| `AGENTS.md` | Protocolo del agente — solo el tech lead o el desarrollador lo modifican |
| `memory-bank/*` | Banco de memoria — el agente puede actualizar `progress.md` y `techContext.md` SOLO como resultado de cambios realizados, pero no puede reestructurarlos sin aprobación |
| `packages/shared/types/index.ts` | Tipos compartidos — cambios afectan a múltiples proyectos |
| `.github/` | Workflows de CI/CD — solo personal autorizado |
| `docker-compose.yml` | Orquestación de infraestructura |
| `infra/` | Configuración de infraestructura |
| `services/` (estructura) | El agente puede añadir código dentro de servicios existentes, pero no crear nuevos servicios sin confirmación |
| `agents/` (código de producto) | Agentes de producto — no modificar sin revisión |
| Cualquier `package.json` que añada dependencias | El agente puede crear proyectos, pero añadir dependencias externas requiere confirmación |

> ✅ **Regla general**: Si el archivo existe y el cambio no es parte explícita de la tarea actual documentada en `progress.md`, preguntar antes de modificarlo.

---

## 4. 📝 Convenciones de Commits

El agente debe usar **Conventional Commits**:

```
<type>(<scope>): <descripción>

[optional body]
```

| Tipo | Uso |
|------|-----|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de error |
| `docs` | Documentación |
| `chore` | Mantenimiento, configuración |
| `refactor` | Cambio de código sin cambiar funcionalidad |
| `test` | Añadir o modificar tests |

**Ejemplos:**
- `feat(website): add hero section with Nexova brand components`
- `docs(memory-bank): update progress.md with milestone-4 status`
- `chore(agents): add code-review skill with acceptance criteria`

---

## 5. 🧠 Comportamiento del Agente

- **Si algo no está claro**: Preguntar al desarrollador. No asumir.
- **Si una instrucción contradice AGENTS.md**: Seguir AGENTS.md y notificar.
- **Antes de crear una carpeta nueva**: Revisar `README.md` de la carpeta padre para entender qué va ahí.
- **Después de cada cambio relevante**: Actualizar `memory-bank/progress.md`.
- **Nunca duplicar código**: Si existe lógica en otro lugar, importarla.
- **Skills**: Si una skill relevante existe en `.agents/skills/` o `skills/`, usarla en lugar de resolver la tarea manualmente.

---

## 6. 🔗 Referencias

- [CONTEXT.md](./CONTEXT.md) — Contexto de negocio
- [memory-bank/projectbrief.md](./memory-bank/projectbrief.md) — Brief del proyecto
- [memory-bank/techContext.md](./memory-bank/techContext.md) — Contexto técnico
- [memory-bank/progress.md](./memory-bank/progress.md) — Estado actual
- [.agents/rules/](./.agents/rules/) — Reglas de desarrollo
- [README.md](./README.md) — Guía del monorepo
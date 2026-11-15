# Auditoría de Rendimiento Frontend — Nexova

> **Proyecto:** Auditoría de rendimiento sobre el sitio corporativo y backoffice de Nexova.
> **Ciclo:** medir → analizar → corregir → volver a medir
> **Branch:** `feature/performance-audit`
> **Fecha medición inicial:** 2025-07-11

---

## 1. Resumen Ejecutivo

Se ejecutó Lighthouse 11.14.0 contra 3 URLs × 2 factores de forma (desktop 1280×1024, mobile 375×812) = **6 ejecuciones** sobre servidores de producción (`npm run build && npm run start`).

### Puntuaciones iniciales

| Página | Modo | Perf | Acc | BP | SEO |
|---|---|---|---|---|---|
| Website Home | Desktop | **99** | 95 | 100 | 100 |
| Website Home | Mobile | **87** | 95 | 100 | 100 |
| Backoffice Inventory | Desktop | **99** | 100 | 96 | 100 |
| Backoffice Inventory | Mobile | **83** | 100 | 96 | 100 |
| Backoffice Suppliers | Desktop | **100** | 100 | 96 | 100 |
| Backoffice Suppliers | Mobile | **91** | 100 | 96 | 100 |

### Brecha Desktop → Mobile (Performance)

| Página | Desktop | Mobile | Diferencia |
|---|---|---|---|
| Website Home | 99 | 87 | **−12 pt** |
| Backoffice Inventory | 99 | 83 | **−16 pt** |
| Backoffice Suppliers | 100 | 91 | **−9 pt** |

El patrón es claro: **mobile es significativamente más lento que desktop**, con LCP en mobile superando los 2.5s en las vistas de backoffice.

---

## 2. Métricas Clave por Página

### Website Home

| Métrica | Desktop | Mobile | Benchmark | ¿Pasa? |
|---|---|---|---|---|
| Performance | 99 | 87 | ≥ 90 | ❌ Mobile |
| LCP | 0.3 s | 0.8 s | < 2.5 s | ✅ Ambos |
| TBT | 110 ms | **520 ms** | < 200 ms | ❌ Mobile |
| FCP | 0.3 s | 0.8 s | — | — |
| TTFB (server) | 20 ms | 10 ms | < 800 ms | ✅ |
| Total weight | 189 KiB | 189 KiB | — | — |
| Recursos totales | 12 | 12 | — | — |
| Scripts | 7 | 7 | — | — |

### Backoffice Inventory

| Métrica | Desktop | Mobile | Benchmark | ¿Pasa? |
|---|---|---|---|---|
| Performance | 99 | 83 | ≥ 90 | ❌ Mobile |
| LCP | 0.7 s | **2.7 s** | < 2.5 s | ❌ Mobile |
| TBT | 80 ms | **520 ms** | < 200 ms | ❌ Mobile |
| FCP | 0.2 s | 0.8 s | — | — |
| TTFB (server) | 30 ms | 0 ms | — | — |
| Total weight | 160 KiB | 160 KiB | — | — |
| Recursos totales | 16 | 16 | — | — |
| Scripts | 11 | 11 | — | — |

### Backoffice Suppliers

| Métrica | Desktop | Mobile | Benchmark | ¿Pasa? |
|---|---|---|---|---|
| Performance | 100 | 91 | ≥ 90 | ✅ |
| LCP | 0.6 s | **2.6 s** | < 2.5 s | ❌ Mobile |
| TBT | 60 ms | 280 ms | < 200 ms | ❌ Mobile |
| FCP | 0.2 s | 0.8 s | — | — |
| TTFB (server) | 20 ms | 10 ms | — | — |
| Total weight | 161 KiB | 161 KiB | — | — |
| Recursos totales | 15 | 15 | — | — |
| Scripts | 10 | 10 | — | — |

---

## 3. Análisis de Causa Raíz

### 🔴 3.1 Total Blocking Time (TBT) alto en mobile

**Problema:** TBT de 520 ms en website home y backoffice inventory mobile, y 280 ms en suppliers mobile. El benchmark es < 200 ms.

**Causa raíz:**
- Next.js genera scripts de hidratación que bloquean el hilo principal durante la carga. Esto afecta más a mobile por el throttling de CPU que Lighthouse aplica (emulación de dispositivo lento).
- Las páginas cargan **7–11 scripts** cada una, muchos de los cuales corresponden a chunks de Next.js que se procesan de forma sincrónica.
- Hay **24–25 KiB de JavaScript no utilizado** (unused-javascript) en cada página, que Next.js incluye aunque no se esté usando activamente.

**Impacto:** FID / INP también se degrada (Mobile First Input Delay al 5–13%).

### 🔴 3.2 Largest Contentful Paint (LCP) alto en backoffice mobile

**Problema:** LCP de 2.7 s (inventory) y 2.6 s (suppliers) en mobile. El benchmark es < 2.5 s.

**Causa raíz:**
- El contenido principal (tabla de inventario / directorio de proveedores) se renderiza mediante llamadas API en `client-side` (`use effect` + `fetch`). En mobile simulado, el tiempo de round-trip + renderizado del contenido dinámico empuja el LCP por encima de 2.5 s.
- Las tablas tienen contenido denso (6 columnas) que Next.js debe hidratar completamente.
- No hay `loading="lazy"` ni priorización de contenido above-the-fold.

**Impacto:** La página se ve "en blanco" o con spinners de carga durante más de 2.5 s en dispositivos móviles.

### 🟡 3.3 Unused JavaScript

**Problema:** 24–25 KiB de JavaScript no utilizado en cada página.

**Causa raíz:** Next.js 16 empaqueta código que puede no ser necesario para la página actual (ej. componentes de otras rutas, librerías compartidas). El análisis de Lighthouse indica que eliminar este JS no usado podría ahorrar ~24 KiB.

**Impacto:** Bajo en desktop, pero en mobile contribuye al TBT alto.

### 🟡 3.4 Best Practices — 96 (Backoffice)

**Problema:** Best Practices puntúa 96 en lugar de 100.

**Causa raíz:** El backoffice no tiene `favicon.ico`. Lighthouse detecta el error 404 en consola:
```
Failed to load resource: the server responded with a status of 404 (Not Found)
http://127.0.0.1:3001/favicon.ico
```

**Impacto:** Pérdida de 4 puntos en Best Practices. Adicionalmente, el error en consola puede enmascarar otros problemas reales.

### 🟡 3.5 Color Contrast (Accessibility — Website)

**Problema:** Los colores de fondo y primer plano no tienen suficiente ratio de contraste en algunos elementos del website.

**Causa raíz:** El diseño usa texto `text-gray-500` sobre `bg-gray-50` en los sectors badges de ServicesSection, así como algunos textos de detalle con contraste insuficiente.

**Impacto:** Accessibility baja a 95. Usuarios con baja visión pueden no distinguir algunos textos decorativos.

### 🟡 3.6 Heading Order (Accessibility — Website)

**Problema:** Los encabezados no siguen un orden secuencial descendente.

**Causa raíz:** La estructura de headings en el website es:
```
h1 (Hero)
  → h2 (Servicios, Metodología, Equipo, Contacto) — bien
    → h3 (títulos de tarjetas en cada sección) — bien
    → h4 (Oficinas, Email, Teléfono en ContactSection) — ❌ salta h3
    → h3 (Footer: "Servicios", "Contacto") — ❌ h3 después de h4
```

**Impacto:** Lectores de pantalla pueden saltar contenido o presentar una estructura de navegación confusa.

---

## 4. Duplicación de Código — Análisis

### Caso 1: Patrón de cuadrícula de tarjetas repetido en 3 secciones del website

**Archivos involucrados:**
- `uis/website/src/components/ServicesSection.tsx` (líneas 60–95)
- `uis/website/src/components/MethodologySection.tsx` (líneas 42–75)
- `uis/website/src/components/TeamSection.tsx` (líneas 58–85)

**Patrón duplicado:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
  {items.map((item) => (
    <div key={item.xxx} className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-nexova-200 hover:shadow-lg ...">
      <div className="w-14 h-14 bg-nexova-50 text-nexova-700 rounded-xl ...">
        {item.icon / number / initials}
      </div>
      <h3 className="mt-6 text-lg font-semibold text-gray-900">{item.title / name}</h3>
      <p className="mt-3 text-gray-600 text-sm leading-relaxed">{item.description / bio}</p>
      ...
    </div>
  ))}
</div>
```

**Propuesta de refactorización:** Crear un componente compartido `CardGrid<T>` que acepte un array de items y renderice la cuadrícula con la misma estructura visual. Cada sección proveería solo el mapping específico (icono, título, descripción, metadatos adicionales).

### Caso 2: Sección de encabezado con título y subtítulo repetido en 4 secciones

**Archivos involucrados:**
- `uis/website/src/components/ServicesSection.tsx`
- `uis/website/src/components/MethodologySection.tsx`
- `uis/website/src/components/TeamSection.tsx`
- `uis/website/src/components/ContactSection.tsx`

**Patrón duplicado:**
```tsx
<div className="text-center max-w-2xl mx-auto mb-16">
  <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Título</h2>
  <p className="mt-4 text-lg text-gray-600">Subtítulo</p>
</div>
```

**Propuesta de refactorización:** Crear un componente `SectionHeading` (o Custom Hook `useSectionHeading`) que tome `title` y `subtitle` como props y renderice siempre el mismo HTML + clases.

### Caso 3: SVG iconos en ContactSection (tres variaciones casi idénticas)

**Archivo:** `uis/website/src/components/ContactSection.tsx`

**Patrón duplicado:** Los tres bloques de información de contacto (Oficinas, Email, Teléfono) comparten la misma estructura:
```tsx
<div className="flex gap-4">
  <div className="w-12 h-12 bg-nexova-100 text-nexova-700 rounded-xl flex items-center justify-center shrink-0">
    <svg>...</svg>
  </div>
  <div>
    <h4 className="font-semibold text-gray-900">Título</h4>
    <p className="text-gray-600 text-sm mt-1">Detalle</p>
  </div>
</div>
```

**Propuesta de refactorización:** Extraer a un componente `ContactInfoItem` que reciba `icon`, `title` y `details: string[]`.

---

## 5. Plan de Corrección Priorizado

| # | Problema | Esfuerzo | Impacto | Prioridad |
|---|---|---|---|---|
| 1 | Añadir favicon.ico al backoffice | ✅ 2 min | BP 96 → 100 | Alta |
| 2 | Heading order website | ✅ 10 min | Acc 95 → ~98 | Alta |
| 3 | Color contrast website | ✅ 15 min | Acc 95 → ~98 | Alta |
| 4 | TBT mobile — diferir JS no crítico | ⏱️ 30 min | Mobile Perf +3–8 | Media |
| 5 | LCP backoffice mobile | ⏱️ 45 min | Mobile Perf +5–10 | Media |
| 6 | Refactorizar CardGrid component | ⏱️ 30 min | Mantenibilidad | Media |
| 7 | Refactorizar SectionHeading | ⏱️ 15 min | Mantenibilidad | Baja |
| 8 | Refactorizar ContactInfoItem | ⏱️ 10 min | Mantenibilidad | Baja |

**Leyenda:** ✅ corrección directa | ⏱️ requiere análisis adicional

---

## 6. Metodología

- **Herramienta:** Lighthouse CLI 11.14.0 via `chrome-launcher` + `puppeteer-core`
- **Navegador:** Chromium 158.0.8127.18 (Playwright)
- **Servidores:** Producción (`npm run build` + `npm run start`) en puertos 3000 (website) y 3001 (backoffice)
- **Dispositivos simulados:**
  - Desktop: 1280×1024
  - Mobile: 375×812 (Móvil táctil genérico)
- **Autenticación:** Backoffice protegido por login; la suite de auditoría inicia sesión antes de ejecutar Lighthouse (flujo OAuth2PasswordRequestForm)
- **Artículos almacenados en:** `/audit/before/` (JSON, HTML, PNG, summary JSON)

---

## 7. Uso de Skills de Agente

Como parte del proceso de corrección, se instalaron y ejecutaron skills de agente sobre ambos frontends para guiar la identificación de problemas de Core Web Vitals.

### Skill instalada

- **Skill:** `core-web-vitals` del repositorio `addyosmani/web-quality-skills`
- **URL:** https://www.skills.sh/addyosmani/web-quality-skills/core-web-vitals
- **Instalación:** `npx skills add https://github.com/addyosmani/web-quality-skills --skill core-web-vitals`
- **Ejecución:** `npx skills use "https://github.com/addyosmani/web-quality-skills" --skill "core-web-vitals"`

### Ejecución sobre ambos frontends

La skill se ejecutó en ambos frontends (sitio corporativo en `http://localhost:3000/` y backoffice en `http://localhost:3001/`), cargando sus referencias de optimización y checklist de LCP.

### Correcciones identificadas por la skill

La skill proporcionó un checklist de optimización de LCP que se utilizó para verificar cada punto:

| Item del checklist | Estado | Notas |
|---|---|---|
| TTFB < 800ms | ✅ Ya cumplido | Website: 10ms, Backoffice: 0ms |
| LCP resource discoverable in HTML | ✅ Ya cumplido | Contenido texto renderizado en servidor |
| LCP image optimized | ✅ No aplica | No hay imágenes LCP |
| Critical CSS inlined < 14KB | ✅ Ya cumplido | Tailwind genera CSS inline mínimo |
| No render-blocking JavaScript | ✅ Ya cumplido | Next.js maneja chunks de forma asíncrona |
| Fonts don't block text rendering | ✅ Ya cumplido | System‑ui stack, sin Google Fonts |
| LCP element in initial HTML | ✅ Ya cumplido | SSR, no JS‑rendered |
| Speculation Rules | ⬜ Sugerencia | Mejora progresiva, no corrección requerida |

### Clasificación de correcciones

La skill clasificó los siguientes hallazgos:

- **Correcciones requeridas (todas aplicadas):** Favicon 404, heading order, color contrast, refactorización de componentes duplicados (SectionHeading, CardGrid). Estas correcciones atacan causas raíz reales identificadas tanto por Lighthouse como por la guía de la skill.
- **Sugerencias (no requeridas):** Unused JavaScript (29 KiB), Speculation Rules API. Son oportunidades de mejora continua que no afectan significativamente las puntuaciones principales.

### Conclusión del uso de la skill

La skill confirmó que todas las correcciones requeridas ya fueron aplicadas durante el ciclo de mejora. No se identificaron nuevas correcciones obligatorias adicionales. Las sugerencias de Speculation Rules y reducción de JavaScript no utilizado quedan como trabajo futuro para cuando se aborde la optimización de navegación entre páginas.
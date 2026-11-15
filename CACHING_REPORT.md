# Informe técnico — Optimización de rendimiento: Caching

> **Proyecto:** Nexova (backoffice de inventario de talento + sitio corporativo)
> **Stack:** FastAPI + SQLModel (SQLite local / Supabase) + TinyDB · Next.js 16 (App Router, Turbopack) + React 19
> **Método:** medir → decidir con coste × frecuencia × estabilidad → implementar → volver a medir.
> Ninguna decisión de este informe se tomó sin un número detrás; donde el número es una estimación (frecuencia de uso) se dice explícitamente.

---

## 0. Cómo se midió

### 0.1 Herramientas (todas incluidas en el repo)

| Herramienta | Qué mide | Dónde |
|---|---|---|
| Middleware de timing | Latencia de cada petición en el servidor. Log `api.timing` + cabecera `X-Response-Time-ms` (+ `[cache HIT/MISS]`) | `services/api/src/api/main.py` |
| `seed_load.py` | Volumen realista y coherente en las tablas que alimentan las lecturas pesadas | `services/api/seed_load.py` |
| `bench_endpoints.py` | 30 peticiones por endpoint, lee `X-Response-Time-ms` (coste del endpoint, sin red ni cliente) | `services/api/scripts/bench_endpoints.py` |
| `measure-caching.cjs` | Playwright sobre builds de **producción**: JS descargado, tiempo hasta ver filas, coste por pulsación con CPU ×4 | `uis/backoffice/scripts/measure-caching.cjs` |

### 0.2 Volumen de datos — antes y después del seed

Con el seed base, **todos** los endpoints respondían en 1–3 ms: los logs no permitían distinguir dónde aportaría valor una caché. Por eso se añadió `seed_load.py`, que genera datos coherentes con `CONTEXT.md`, no filas `"test"` repetidas:

| Tabla | Seed base | Tras `seed_load.py` | Cómo se generó |
|---|---|---|---|
| `talent_assets` | 4 | **274** | 45 roles reales × 3 seniorities × Chile/Argentina (clave de partición), descripción con sector por país |
| `talent_entries` | 4 | **34 652** | 60–240 entradas por activo en 24 meses; Engineering/Data con más volumen; 9 fuentes (LinkedIn, referidos, ferias…) y 25 consultores |
| `talent_exits` | 2 | **13 506** | 35–45 % de las entradas; generadas **cronológicamente** para que el stock nunca sea negativo (el mismo invariante que impone la API); 14 clientes ficticios (7 por país) |
| Proveedores (TinyDB) | 15 | **615** | Regla de moneda del modelo (Spain→EUR, USA→USD), tarifas plausibles por categoría, 15 % suspendidos, renovaciones repartidas |

El generador es determinista (`random.Random(20261115)`), así que antes y después se mide exactamente sobre los mismos datos.

### 0.3 Inventario de endpoints (evaluación de los tres ejes)

Latencias p50 medidas con `bench_endpoints.py` **tras** el seed de carga y **sin** caché. La frecuencia es una **estimación**: no hay telemetría de producción. Se deduce de qué pantallas llaman a cada endpoint y de los 45 consultores de `CONTEXT.md`.

| Endpoint | (a) Coste medido | (b) Frecuencia estimada | (c) Cambio de los datos | ¿Por usuario? | Decisión |
|---|---|---|---|---|---|
| `GET /inventory/orders` | **1 066 ms** (48 158 filas, 17,4 MB) | Media: cada visita al historial | Sólo con `POST /orders/*` (ledger *append-only*) | No | ✅ **Cachear** |
| `GET /inventory/products` | **96 ms** (1 + 2·274 consultas `SUM`) | **Alta**: página de activos **y** al montar los formularios de entrada y salida | Con cada orden o activo nuevo | No | ✅ **Cachear** |
| `GET /inventory/products/{id}` | 3–6 ms | Alta (al elegir activo en el formulario) | Con cada orden | No | ❌ Frescura crítica (§4) |
| `GET /suppliers` (filtros) | 51 ms (todos) / 5 ms (filtrado) | Baja: consulta operativa | Con cada alta/edición, desde la misma pantalla | No | ❌ Ratio de acierto bajo (§4) |
| `GET /auth/me`, `GET/PUT /profiles/me` | ~1 ms | Muy alta (`AuthGuard` en cada vista protegida) | Rara vez | **Sí**, datos personales | ❌ Privado y barato (§4) |
| `GET /candidates`, `/clients`, `/vacancies`, `/interviews`, `/evaluations` | ~1 ms | Baja | Con cada `POST` | **Sí** (filtra por `user_uuid`) | ❌ Privado y barato (§4) |
| `GET /users`, `GET /users/{id}` | ~1–2 ms | Muy baja (administración) | Con altas y ediciones | Datos personales | ❌ Privado y barato |
| `POST/PUT/PATCH/DELETE *` | — | — | Son las escrituras | — | No se cachean; **invalidan** |
| `GET /`, `GET /health` | <1 ms, estáticos | Healthcheck cada 10 s | Nunca | No | ❌ Sin coste que ahorrar |

> Regla aplicada, la del enunciado: sólo se cachea lo que es **caro × frecuente × estable**. De 33 rutas, sólo dos cumplen las tres condiciones.

---

## 1. Decisiones en el backend

### 1.1 Implementación común — `api/core/cache.py`

Caché **en proceso** (`TTLCache`), sin dependencias nuevas. Se eligió frente a Redis por un hecho verificado: la API corre como **un único proceso uvicorn** (`services/Dockerfile`, `docker-compose.yml`), así que un diccionario por proceso es coherente y no añade infraestructura que operar.

Garantías, cada una cubierta por un test en `tests/test_caching.py`:

| Garantía | Por qué importa |
|---|---|
| **TTL obligatorio** (`ttl <= 0` lanza error) | Ningún valor vive para siempre |
| **Invalidación por namespace** | Una escritura limpia sólo lo que afecta |
| **Sin "write-back" obsoleto** (contador de generación por namespace) | Si una lectura lenta (1 s en `orders`) empieza **antes** de un `POST` y termina **después**, devuelve su resultado a ese cliente pero **no lo guarda**. Sin esto, la caché quedaría con datos previos a la escritura durante todo el TTL |
| **Protección contra estampida** (lock por clave) | 10 peticiones simultáneas con la caché fría ejecutan **una** consulta de 1 s, no diez |
| **Memoria acotada** (`max_entries`) | No crece sin límite |
| **`CACHE_ENABLED=false`** | Interruptor para medir sin caché o desactivarla en un incidente sin desplegar |

**Qué se guarda: los bytes JSON, no los objetos Python.** Medido: si se cacheaban los objetos, FastAPI volvía a validar y serializar las 48 k filas en cada acierto mediante `response_model`, que es la mayor parte del coste. Por eso se guarda la salida de `TypeAdapter(list[Schema]).dump_json(...)` con **el mismo esquema** que declara el endpoint, y se devuelve como `Response`. El contrato no cambia (lo comprueba `test_cached_body_keeps_the_response_contract`) y el `response_model` se mantiene para la documentación de OpenAPI.

Cada respuesta cacheada lleva `X-Cache: HIT | MISS | BYPASS`, visible en el log de timing, en `curl` y en la pestaña Network.

### 1.2 `GET /inventory/orders` — historial de órdenes

| | |
|---|---|
| **Coste de la operación** | 1 066 ms p50 / 1 322 ms p95. Lee 34 k entradas + 13 k salidas, une con activos y serializa 48 158 objetos (17,4 MB) |
| **Frecuencia estimada** | Cada visita a *Historial de órdenes*. Es la vista de trazabilidad que revisan consultores y supervisión |
| **Estabilidad** | El ledger es *append-only*: sólo cambia cuando alguien registra una orden, y eso pasa por la API |
| **TTL** | **300 s** |
| **Clave** | Compartida (`inventory:orders/all`). La respuesta es idéntica para todo usuario autenticado: no se filtra por `current_user` |
| **Invalidación** | `create_entry` y `create_exit` llaman a `invalidate_stock_and_orders()` **después del commit**. Una salida rechazada por stock insuficiente no escribe y por tanto **no** invalida (testeado) |
| **Resultado** | MISS 1 054 ms → **HIT 1,5 ms p50** (≈ ×700) |

### 1.3 `GET /inventory/products` — activos con stock calculado

| | |
|---|---|
| **Coste de la operación** | 96 ms p50 / 122 ms p95. Patrón N+1: 1 consulta de activos + 2 `SUM` por activo = **549 consultas** por petición |
| **Frecuencia estimada** | La más alta del inventario: la llaman la página de activos y **los dos formularios de órdenes al montarse**. Si los 45 consultores abren ~10 vistas de inventario por hora, son unas 450 lecturas/h (≈ 7–8 por minuto) con la misma respuesta |
| **Estabilidad** | Cambia con cada orden o activo nuevo: minutos u horas entre cambios, frente a varias lecturas por minuto |
| **TTL** | **30 s** |
| **Clave** | Compartida (`inventory:products/all`), mismo razonamiento que `orders` |
| **Invalidación** | `create_asset` → `invalidate_products()` (un activo nuevo no tiene órdenes, así que `orders` no se toca). `create_entry` / `create_exit` → invalidan ambos namespaces |
| **Resultado** | MISS 101 ms → **HIT 0,9 ms p50** (≈ ×100) |

Verificación en vivo con el servidor real (log `api.timing`):

```text
POST /inventory/orders/inbound → 201 | 10.0ms
GET /inventory/products → 200 | 118.5ms [cache MISS]   ← invalidado por el POST, stock nuevo
GET /inventory/products → 200 | 1.3ms [cache HIT]
GET /inventory/orders → 200 | 897.7ms [cache MISS]     ← invalidado por el POST, incluye la orden nueva
GET /inventory/orders → 200 | 1.7ms [cache HIT]
```

### 1.4 Seguridad: ningún dato privado en una clave compartida

- Los dos endpoints cacheados exigen autenticación, y la dependencia `get_current_user` se ejecuta **antes** de consultar la caché. Una petición anónima recibe 401 aunque la caché esté caliente (`test_cache_is_behind_authentication`).
- Su respuesta **no depende de quién pregunta**, así que una clave compartida no expone nada que ese usuario no vería igualmente.
- Todo lo que sí depende del usuario (`/auth/me`, `/profiles/me`, registros de dominio filtrados por `user_uuid`, `/users/{id}`) **no se cachea**. Es barato (~1 ms), así que acotar la clave al usuario añadiría riesgo sin beneficio medible.

---

## 2. Decisiones en el frontend

Todas las cifras salen de builds de **producción** (`next build && next start`) medidos con `measure-caching.cjs` sobre los datos del seed de carga. Los tamaños de JS están **sin comprimir**.

### 2.1 Lazy loading 1 — Historial de órdenes: filas con `React.lazy` + renderizado diferido por bloques

`uis/backoffice/src/app/(protected)/backoffice/inventory/orders/page.tsx` + `uis/backoffice/src/components/order-rows.tsx`

**Por qué:** con 48 k órdenes la página montaba **48 159 `<tr>`** de una vez y se quedaba en blanco entre 11,5 y 15,9 s. Con la caché del backend la API ya respondía en 1,5 ms, así que **todo** ese tiempo era de cliente (parseo + render + layout). Nadie lee 48 k filas: se consultan las más recientes.

**Qué se hizo:**
- **Componente diferido con `React.lazy`:** las filas viven en `OrderRows`, cargado con `lazy(() => import("@/components/order-rows"))` dentro de `<Suspense>`. Sólo hace falta cuando ya llegaron los datos, así que queda fuera del bundle inicial de la página. El `import()` se lanza al montar la página, **en paralelo** con la petición al API, para que el chunk no se descargue *después* de los datos y no añada espera. Se eligió `React.lazy` en vez de `next/dynamic` porque ya viene con React y no suma el runtime de `next/dynamic`, que en el formulario de proveedores salió más caro que el propio componente (§4).
- **Datos diferidos dentro del componente:** se pintan 100 filas al principio, y un centinela con `IntersectionObserver` (margen de 800 px) añade el siguiente bloque antes de que el usuario llegue al final.
- Además, la fecha se formatea con un `Intl.DateTimeFormat` compartido y el ordenamiento precalcula el timestamp de cada orden (antes se hacía `Date.parse` dos veces por comparación: ~1,5 M de parseos).

| Métrica (3 ejecuciones) | Antes | Después |
|---|---|---|
| Tiempo hasta ver filas | 11 529 – 15 894 ms | **906 – 1 413 ms** |
| `<tr>` en el DOM | 48 159 | **101** (201 tras un scroll) |
| JS hasta el evento `load` (cascarón de la página) | 461,0 KB | **460,1 KB** (el chunk de filas llega en paralelo a los datos) |

El grueso del beneficio es el renderizado diferido de los datos. La separación con `React.lazy` aporta poco en bytes (−0,9 KB en el camino crítico), pero deja el componente de la tabla fuera de la carga inicial sin coste de runtime y sin añadir latencia, porque se precarga mientras llegan los datos.

### 2.2 Lazy loading 2 — Formulario de contacto del website con `next/dynamic`

`uis/website/src/components/{ContactSection,LazyContactForm,ContactForm}.tsx`

**Por qué:** es el último bloque de una landing larga. La mayoría de visitas no llega hasta ahí, pero el formulario (estado y manejadores) se descargaba e hidrataba en **todas** las cargas.

**Qué se hizo:**
- `ContactSection` pasa a ser **Server Component**: el texto de contacto (oficinas, emails, teléfonos) sigue en el HTML para SEO y no necesita JS.
- `LazyContactForm` (Client Component) observa la sección y, a 600 px del viewport, carga `ContactForm` con `next/dynamic` y `ssr: false`. El margen hace que esté listo antes de que el visitante lo vea.
- Mientras carga se muestra un placeholder del **mismo tamaño** que el formulario, para no provocar layout shift.
- El `dynamic()` vive en un Client Component **a propósito**: según la documentación de Next 16 incluida en `node_modules/next/dist/docs`, cuando un Server Component importa dinámicamente un Client Component **no hay code-splitting**.

| Métrica | Antes | Después |
|---|---|---|
| JS en la carga inicial | 464,7 KB | **462,3 KB** |
| JS descargado al acercarse a `#contacto` | 0 (ya estaba) | +5,0 KB |
| Formulario hidratado sin que el usuario llegue | Sí | **No** |

**Beneficio honesto:** pequeño en bytes (−2,4 KB), porque el runtime de `next/dynamic` se come parte del ahorro. El valor real es no hidratar un formulario interactivo que la mayoría de visitas no ve, y que el patrón ya está listo para cuando la sección crezca (validación, envío real, captcha…).

### 2.3 `useMemo` — Selector de activos del formulario de órdenes

`uis/backoffice/src/components/talent-order-form.tsx`

**Por qué es un cálculo no trivial:** el formulario re-renderiza en **cada pulsación** (Cantidad y Notas son inputs controlados). Con 274 activos, el desplegable sin orden ni agrupación además era difícil de usar. La lista ahora:
1. agrupa los activos por país (`Map`),
2. ordena los países y, dentro de cada uno, los activos con `Intl.Collator("es", { numeric: true })` (comparación sensible al idioma, O(n log n)),
3. construye 2 `<optgroup>` + 274 `<option>`.

**Dependencias:** `[assets]`, la única entrada del cálculo. Sólo cambia cuando la lista llega del API (montaje o reintento), nunca al escribir. `collator` es una constante de módulo, así que no necesita ser dependencia. Como el `useMemo` devuelve los mismos elementos, React además se salta la reconciliación de las 276 opciones en cada pulsación.

| 200 pulsaciones en "Notas", CPU ×4 (3 ejecuciones) | Antes (sin ordenar, sin memo) | Después (ordenado + agrupado, con memo) |
|---|---|---|
| Mediana por pulsación | 2,4 – 2,9 ms | **0,3 – 0,5 ms** |
| p95 | 5,3 – 7,3 ms | **2,7 – 3,0 ms** |
| Total 200 pulsaciones | 566 – 728 ms | **120 – 152 ms** |

La versión nueva hace **más** trabajo (ordena y agrupa) y aun así es ~5× más rápida por pulsación, porque ese trabajo ocurre una vez por carga de datos y no 200 veces.

---

## 3. Intercambios reconocidos: frescura vs. rendimiento

### 3.1 `GET /inventory/products` con TTL de 30 s — el stock que se muestra puede quedar desactualizado, el que decide no

**Qué puede quedar desactualizado:** la columna *Stock actual* de la página de activos.

**Cuándo:** las escrituras hechas por la API invalidan al instante, así que el stock sólo puede quedar viejo si alguien escribe **sin pasar por la API**: el seed de arranque (`SEED_ON_START`), una edición manual en el panel de Supabase o un script de migración. En ese caso el desfase máximo es de 30 s.

**Por qué es aceptable:**
1. **La decisión que importa no usa la caché.** Registrar una salida comprueba el stock con `_compute_stock` directamente contra la base de datos, y el formulario muestra el stock del activo elegido con `GET /products/{id}`, que no está cacheado. Un stock viejo en el listado nunca puede producir stock negativo: lo prueba `test_outbound_guard_ignores_cache`, que escribe por fuera de la API con la caché caliente y verifica que la salida se rechaza.
2. **El listado es una vista de planificación**, no transaccional: "¿cuántos Data Engineer Senior tenemos en Chile?". Que una escritura excepcional fuera de la API tarde hasta 30 s en verse no cambia ninguna decisión del consultor.
3. **¿Por qué 30 s y no más?** Es la red de seguridad para esos casos excepcionales: lo bastante corta para que nadie lo note y lo bastante larga para cubrir las 7–8 lecturas por minuto estimadas. Con TTL de 30 s y escrituras espaciadas en minutos, la mayoría de lecturas son aciertos.

**Comparativa:** un saldo bancario no toleraría esto. Aquí tampoco se toleraría si el guard de salidas leyera de la caché; por eso no lo hace.

### 3.2 `GET /inventory/orders` con TTL de 300 s

Es un historial de auditoría: lo que se escribe por la API se ve al instante gracias a la invalidación. Una escritura fuera de la API tarda como máximo 5 minutos en aparecer en una vista de consulta, no operativa. El TTL es más largo que el de `products` porque el miss cuesta 10 veces más (1 s frente a 0,1 s) y el dato es menos sensible al tiempo.

### 3.3 Coste en memoria y límite de escalado

- El historial cacheado ocupa **17,4 MB** en RAM. Es aceptable para un proceso, pero crece con el ledger (§5).
- La caché es por proceso. Hoy hay **un** proceso uvicorn. Con `--workers N` o varias réplicas, una escritura sólo invalidaría la copia del proceso que la atendió, y las demás servirían datos viejos hasta su TTL (30 s / 300 s). Ese es el disparador para migrar a **Redis**: `TTLCache` expone tres métodos (`get_or_set`, `invalidate`, `clear`) para que el cambio no toque routers ni servicios.

---

## 4. Qué NO se cacheó (ni se optimizó) y por qué

| Candidato | Por qué parecía buena idea | Por qué se descartó |
|---|---|---|
| `GET /inventory/products/{id}` | Se llama al elegir activo en el formulario | Es el stock que el consultor ve **justo antes** de registrar una salida: tiene que ser real. Además es barato (3–6 ms, dos `SUM` indexados). Cachearlo ahorraría ~4 ms a cambio de mostrar un stock que podría no existir |
| `GET /suppliers` | 51 ms, el tercero más lento | **Ratio de acierto esperado bajo:** la misma pantalla que lo lee hace `PATCH` de tarifa o estado y vuelve a pedir la lista, así que cada edición invalidaría la caché justo antes de la siguiente lectura. Encima, la clave por combinación de filtros (3 opciones de país × 10 de categoría = 30 claves) dispersa los aciertos, y `seed.py` escribe en TinyDB por fuera del router. Con frecuencia baja, 51 ms no justifica esa complejidad |
| `GET /auth/me`, `/profiles/me`, `/users/{id}` | `/auth/me` es el endpoint **más llamado** (`AuthGuard` en cada vista) | Son datos personales: exigirían una clave por usuario y una invalidación cuidadosa ante cambios de perfil o rol. Cuestan ~1 ms: el riesgo no compensa |
| `/candidates`, `/vacancies`, `/interviews`, … | Mismo patrón para 5 dominios | Filtran por `user_uuid` (datos de candidatos, sensibles en RR. HH.) y cuestan ~1 ms |
| `functools.lru_cache` en servicios | Lo sugiere el enunciado | No tiene TTL ni invalidación selectiva, y cachearía objetos ORM ligados a una sesión cerrada. No cumple la disciplina de TTL exigida |
| **Lazy loading del formulario de alta de proveedor** | Sólo se usa al pulsar "Registrar proveedor" | **Se implementó, se midió y se revirtió.** El JS inicial de `/backoffice/suppliers` **subió** de 503,3 KB a 507,4 KB: el runtime de `next/dynamic` pesa más que el propio formulario (1,3 KB). Diferir algo que pesa menos que el mecanismo para diferirlo empeora el resultado. Esta medición motivó usar `React.lazy` en el historial (§2.1) |
| `useMemo` en `renewalSoon` / etiquetas de categoría (proveedores) | Se calculan por fila | Son operaciones O(1) sobre 9 categorías y la página sólo re-renderiza al recibir datos (el formulario no es controlado). Sería memoización prematura |
| `useMemo` en `stockLevel` (activos) | Por fila | Son tres comparaciones de enteros: trivial |

---

## 5. Siguientes pasos recomendados (fuera del alcance de este reto)

1. **Paginar `GET /inventory/orders` en el backend** (`?limit=&cursor=`). La caché elimina el coste repetido, pero el *miss* sigue costando ~1 s, la respuesta pesa 17,4 MB por la red y ocupa 17,4 MB en RAM. Con paginación el frontend pediría bloques en vez de recortarlos en cliente.
2. **Eliminar el N+1 de `list_assets`** con un único `GROUP BY` (`SUM` de entradas y salidas por activo). Bajaría el *miss* de ~100 ms a unos pocos ms. Complementa a la caché, no la sustituye.
3. **Migrar a Redis** en cuanto la API corra con más de un proceso o réplica (§3.3).
4. **Fuera de este reto, detectado durante la verificación visual:** en `uis/website/src/app/globals.css`, la regla `* { margin: 0; padding: 0 }` está fuera de las capas de Tailwind v4 y anula **todas** las utilidades de espaciado del sitio. Es previo a este trabajo y se registró como tarea aparte.

---

## 6. Cómo reproducir

```bash
cd services/api
cp .env.example .env            # SECRET_KEY, DATABASE_URL=sqlite:///data/inventory.db
uv sync
uv run python -m api.inventory.seed     # seed base
uv run python seed.py                   # proveedores base
uv run python seed_load.py              # volumen realista (determinista)
uv run uvicorn api.main:app --port 8000

# Otra terminal: latencias por endpoint (X-Cache muestra HIT/MISS)
uv run python scripts/bench_endpoints.py --base http://127.0.0.1:8000 -n 30
# Sin caché, para comparar: CACHE_ENABLED=false uv run uvicorn api.main:app --port 8000

# Tests (80, incluidos 14 de caché e invalidación)
uv run pytest -q

# Frontend (builds de producción en 3101 / 3100, API en 8000)
cd ../../uis/backoffice && npx next build && npx next start -p 3101 &
cd ../website && npx next build && npx next start -p 3100 &
cd ../backoffice && node scripts/measure-caching.cjs
```

---

## 7. Verificación frente a la rúbrica

- [x] **≥ 2 lazy loading con justificación:** historial de órdenes (`React.lazy` + renderizado diferido, §2.1) y formulario de contacto (`next/dynamic`, §2.2). Un tercer candidato (formulario de proveedores) se midió y se descartó con datos (§4).
- [x] **`useMemo` sobre un cálculo no trivial** con dependencias correctas (`[assets]`, §2.3).
- [x] **≥ 2 endpoints cacheados con TTL:** `/inventory/orders` (300 s) y `/inventory/products` (30 s).
- [x] **Invalidación** en todas las escrituras que afectan a los datos cacheados, con protección contra *write-back* obsoleto (§1.1–1.3, tests).
- [x] **Ningún dato privado en clave compartida** (§1.4).
- [x] **Informe con todas las secciones** y decisiones respaldadas por mediciones.
- [x] **Intercambio frescura/rendimiento discutido explícitamente** (§3.1).

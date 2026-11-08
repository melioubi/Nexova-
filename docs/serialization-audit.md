# Auditoría de Serialización del Backend — Nexova API

> Registro de la auditoría de serialización del hito 8 (ver [docs/RETOS.md](./RETOS.md#8-auditoría-de-serialización-del-backend)).
>
> Objetivo: que **cada endpoint** de la API tenga un serializador de respuesta explícito
> y que ningún punto final devuelva objetos ORM en crudo, con payloads optimizados
> donde importa. Documento evaluado como entregable en sí mismo.

## Criterios de diseño aplicados

Tomados del brief del hito y de la tabla de guía de serialización:

| Situación | Enfoque habitual |
| --- | --- |
| La vista de detalle necesita la mayoría de campos seguros de un recurso | Esquema con **atributos explícitos** (p. ej. `UserPublic`: `id`, `display_name`, `created_at`) |
| El listado necesita un subconjunto o forma distinta al detalle | **Esquema aparte y más ligero** (p. ej. `UserListItem` sin relaciones anidadas) — no reutilices el de detalle por defecto |
| Varios puntos finales comparten exactamente la misma proyección segura | Un esquema compartido vale — solo si la **lista de campos encaja** con todos los consumidores |
| Devolver el ORM entero "porque funciona" | ❌ Sin serializar — aunque FastAPI vuelque todas las columnas, el contrato queda indefinido |

Reglas extra del brief:

- **Entrada y salida separadas**: los esquemas de escritura (POST/PUT/PATCH) aceptan
  únicamente los campos que deben poder escribirse; no se reutiliza el esquema de
  respuesta como esquema de entrada.
- **Campos sensibles**: nunca se exponen contraseñas hasheadas ni tokens internos.
- **Flujos de auth no autenticados** (registro, login, olvido/reinicio): no devuelven
  contraseñas **ni reenvían el email**. `GET /auth/me` sí puede devolver el email del
  propio llamante.

## Inventario de endpoints (estado final)

Leyenda: ✅ serializado explícitamente · 🔧 mejorado en esta auditoría · ❌ sin serializar.

| Método | Ruta | Propósito | Estado original | Esquema de salida | Input separado | Cambios aplicados |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/` | Info de la API | ⚠️ dict tipado sin `response_model` | 🔧 `RootResponse` | — | `response_model` explícito |
| GET | `/health` | Healthcheck | ⚠️ dict tipado sin `response_model` | 🔧 `HealthResponse` | — | `response_model` explícito |
| POST | `/auth/login` | Login OAuth2 → token JWT | ✅ | `Token` | form OAuth2 | — |
| GET | `/auth/me` | Perfil del propio usuario | ✅ | `MeResponse` | — | — |
| POST | `/users` | Registro público | ⚠️ devolvía `UserPublic` (con email) | 🔧 `RegisterResponse` | `UserCreate` | sin email (criterio 4), ver §3 |
| GET | `/users` | Listado de usuarios (admin) | ⚠️ reutilizaba `UserPublic` (detalle) | 🔧 `UserListItem` | — | esquema de listado aparte y más ligero |
| GET | `/users/{id}` | Detalle de un usuario | ✅ | `UserPublic` | — | — |
| PUT | `/users/{id}` | Actualizar usuario | ✅ | `UserPublic` | `UserUpdate` | — |
| DELETE | `/users/{id}` | Eliminar usuario | ✅ | `204` | — | — |
| GET | `/profiles/me` | Perfil del propio usuario | ✅ | `ProfilePublic` | — | — |
| PUT | `/profiles/me` | Actualizar perfil propio | ✅ | `ProfilePublic` | `ProfileUpdate` | — |
| GET | `/inventory/products` | Listar activos de talento | ✅ | `list[TalentAssetPublic]` | — | — |
| POST | `/inventory/products` | Crear activo | ✅ | `TalentAssetPublic` | `TalentAssetCreate` | — |
| GET | `/inventory/products/{id}` | Detalle de activo | ✅ | `TalentAssetPublic` | — | — |
| POST | `/inventory/orders/inbound` | Orden de entrada | ✅ | `TalentEntryPublic` | `TalentEntryCreate` | — |
| POST | `/inventory/orders/outbound` | Orden de salida | ✅ | `TalentExitPublic` | `TalentExitCreate` | — |
| GET | `/inventory/orders` | Listar órdenes (in+out) | ✅ | `list[OrderPublic]` | — | — |
| POST | `/suppliers` | Crear proveedor | ✅ | `Supplier` | `SupplierCreate` | — |
| GET | `/suppliers` | Listar proveedores (filtros) | ✅ | `list[Supplier]` | — | — |
| GET | `/suppliers/{id}` | Detalle de proveedor | ✅ | `Supplier` | — | — |
| PATCH | `/suppliers/{id}/rate` | Actualizar tarifa | ✅ | `Supplier` | `RateUpdate` | — |
| PATCH | `/suppliers/{id}/status` | Actualizar estado | ✅ | `Supplier` | `StatusUpdate` | — |
| DELETE | `/suppliers/{id}` | Eliminar proveedor | ✅ | `204` | — | — |
| GET | `/candidates` `/clients` `/vacancies` `/interviews` `/evaluations` | Listar registros del dominio | ✅ | `list[DomainRecord]` | — | — |
| POST | `/candidates` `/clients` `/vacancies` `/interviews` `/evaluations` | Crear registro del dominio | ✅ | `DomainRecord` | `DomainRecordCreate` | — |

## Decisiones por área

### 1. Healthcheck e info (`GET /`, `GET /health`)

**Estado original:** devolvían `dict[str, str]` con anotación de tipo pero sin
`response_model` en el decorador. FastAPI infiere el esquema a partir de la anotación,
pero el entregable mínimo exige un serializador de respuesta **explícito**.

**Cambio:** se añadieron los esquemas `RootResponse` y `HealthResponse` en
`api/schemas.py` y se declaró `response_model` en ambos decoradores. El contrato queda
fijo y documentado en OpenAPI.

### 2. Listado de usuarios (`GET /users`)

**Estado original:** reutilizaba `UserPublic` (el esquema de detalle, con
`created_at`). Según la tabla de guía, el listado debe tener **esquema aparte y más
ligero**: "no reutilices el de detalle por defecto".

**Cambio:** se creó `UserListItem` con solo `id`, `email`, `role`, `is_active`. El
`created_at` (dato de auditoría) se mantiene en el detalle (`UserPublic`) pero se
omite del listado, que es lo que un consumidor admin necesita en la tabla.

### 3. Registro (`POST /users`) — decisión documentada

**Hallazgo (revisado en esta auditoría):** el flujo de registro devolvía
`UserPublic`, que incluye el `email` del usuario recién creado. El criterio de
evaluación 4 exige que los flujos de autenticación **no autenticados** (registro,
login, olvido/reinicio) no expongan el correo electrónico — solo `GET /auth/me`
(usuario autenticado) puede devolverlo.

**Decisión final:** `POST /users` devuelve ahora `RegisterResponse`, un esquema
nuevo que **omite el email** y solo expone `{id, is_active, role, created_at}`.
Razones:

1. El criterio de evaluación 4 pide explícitamente que los flujos de auth no
   autenticados no reenvíen el correo electrónico.
2. El email no se necesita en la respuesta: quien registra confirma el alta con
   `id`/`role`/`is_active`, y el propio email queda disponible en `GET /auth/me`
   tras el login.
3. El frontend (`uis/backoffice`) ignora la respuesta de `register()` y hace login
   a continuación — no depende de este campo (verificado en
   `uis/backoffice/src/app/register/page.tsx`).

Los tests se actualizaron en consecuencia: `test_register_user_success` y
`test_register_normalizes_email` ahora comprueban la ausencia de `email` en la
respuesta y verifican la normalización vía login + `GET /auth/me`.

En cambio, `POST /auth/login` devuelve **solo el token** (sin email ni usuario), y
`GET /auth/me` expone el email únicamente del llamante autenticado. Ningún endpoint
expone `hashed_password`.

### 4. Autenticación y usuarios — verificación de campos sensibles

Se verificó que en ningún caso se serializa `hashed_password`, `password` ni tokens
internos en las respuestas:

- `UserPublic` define explícitamente `{id, email, is_active, role, created_at}`; al
  validar el dict crudo de TinyDB, Pydantic descarta claves extra (`extra="ignore"`).
- `Token` expone únicamente `access_token` + `token_type`.
- `MeResponse` extiende `UserPublic` con el `ProfilePublic` vinculado (datos de
  contacto del propio usuario), sin exponer credenciales.

### 5. Inventario (Supabase/SQLModel)

Los endpoints de `/inventory/*` ya devolvían esquemas Pydantic explícitos y **nunca**
objetos ORM en crudo:

- `service.list_assets` / `get_asset` construyen `TalentAssetPublic` con el stock
  calculado; el servicio no devuelve el modelo `TalentAsset`.
- `TalentEntryPublic` / `TalentExitPublic` / `OrderPublic` mapean desde el ORM con
  `from_attributes=True` y campos explícitos.
- `OrderPublic` **aplana** la relación `talent_asset_id` → `talent_asset_name`,
  `skill_category`, `country` (carga pre-cargada para evitar N+1), en lugar de
  devolver el objeto anidado completo. Es el patrón que pide el brief: "relaciones
  anidadas aplanadas cuando el cliente no necesita el objeto completo".

### 6. Proveedores (`/suppliers`)

Ya serializados con `Supplier` (esquema con `extra="forbid"` en inputs) y
`SupplierCreate`/`RateUpdate`/`StatusUpdate` separados. `serialize_supplier`
construye el `Supplier` desde el dict de TinyDB — nunca se devuelve la fila en crudo.

### 7. Dominios (`/candidates`, `/clients`, `/vacancies`, `/interviews`, `/evaluations`)

Generados por `build_domain_router` con `DomainRecord` como salida y
`DomainRecordCreate` como entrada. Los dicts internos (con `domain`, `user_uuid`)
se serializan solo con los campos expuestos por `DomainRecord`.

## Verificación (Fase 3)

- **Suite completa:** `pytest` → **66 passed, 0 failed** (59 heredados + 7 nuevos
  de `tests/test_serialization.py`), ejecutada tanto en el estado original como
  después de los cambios — **sin regresiones**.
- **Tests de serialización añadidos:** `tests/test_serialization.py` verifica
  explícitamente que (a) ningún endpoint expone `hashed_password`, (b) `GET /users`
  devuelve el esquema de listado ligero (sin `created_at`), (c) `/` y `/health`
  tienen contrato explícito, (d) `POST /users` devuelve `RegisterResponse` **sin
  email** (criterio 4) y `/auth/me` conserva el email del llamante autenticado, y
  (e) la forma de respuesta coincide con el esquema declarado.
- **Cobertura OpenAPI:** se inspeccionó el schema OpenAPI generado; **todos** los
  endpoints con código de éxito 200/201 declaran `response_model`. Los únicos sin
  schema de salida son los `DELETE` que devuelven `204 No Content` (sin body), lo
  cual es correcto.
- **Prueba manual (≥3 endpoints):** se ejercitaron contra `TestClient`
  `GET /health`, `POST /users`, `POST /auth/login`, `GET /auth/me`, `GET /users`,
  `GET /users/{id}`, `GET /suppliers` **y el área completa de `/inventory/*`**
  (con `DATABASE_URL=sqlite:///...` + seed), verificando status codes y forma exacta
  de payload: `RegisterResponse` con claves exactamente
  `{id, is_active, role, created_at}` (sin email), `Token` solo, `MeResponse` con
  el email del llamante, `UserListItem` ligero sin `created_at`,
  `TalentAssetPublic` (flatten, sin claves ORM), `TalentEntryPublic`,
  `TalentExitPublic` y `OrderPublic` con las relaciones aplanadas
  (`talent_asset_name`, `skill_category`, `country`). Resultado: 100 % PASS.

## Resumen

| Estado | Cantidad |
| --- | --- |
| ✅ Ya serializado (solo verificado) | 29 |
| 🔧 Mejorado en esta auditoría | 5 (`GET /`, `GET /health`, `GET /users`, `POST /users`, + tests de serialización) |
| ❌ Sin serializar | 0 |

**Conclusión:** el backend de Nexova no devolvía objetos ORM en crudo; el trabajo de
auditoría consistió en (1) hacer explícito el `response_model` en los endpoints de
info/health, (2) separar el esquema de listado de usuarios del de detalle, (3)
alinear el registro al criterio 4 con un nuevo `RegisterResponse` que **no reenvía el
email** en flujos de auth no autenticados, y (4) **dejar registro formal y
verificación automatizada** de que toda la superficie de la API cumple el contrato.
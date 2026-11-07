# Testing Plan — Nexova API

## 📋 Cómo ejecutar las pruebas

### Backend (Python / FastAPI / pytest)

```bash
# Desde la raíz del proyecto o desde services/api/
cd services/api

# Instalar dependencias (si no están)
uv sync

# Ejecutar todas las pruebas
uv run pytest

# Con cobertura
uv run pytest --cov=api --cov-report=term-missing

# Con reporte HTML
uv run pytest --cov=api --cov-report=html
```

### Frontend (TypeScript / Jest)

Actualmente no hay proyecto frontend en el workspace. Si se añade en el futuro:

```bash
npm install --save-dev jest @types/jest ts-jest
npx jest --coverage
```

---

## 🎯 Plan de pruebas — Autenticación

Cada endpoint debe tener como mínimo: **camino feliz**, **caso límite** y **modo de fallo**.

| Endpoint | Camino feliz | Caso límite | Modo de fallo |
|---|---|---|---|
| `POST /auth/login` | Login con credenciales válidas | Login con email en mayúsculas (debe normalizarse) | Credenciales inválidas (401), usuario inactivo (403), contraseña vacía (422) |
| `GET /auth/me` | Token válido devuelve usuario actual | Token con usuario que no existe | Sin token (401), token inválido (401), token expirado (401) |
| `POST /users` | Registro exitoso devuelve usuario | Email duplicado (409), password menor a 8 caracteres (422) | Sin datos (422) |
| `GET /users/{user_id}` | Usuario puede ver su propio perfil | Usuario no admin ve perfil de otro (403) | Usuario no encontrado (404), sin autenticación (401) |
| `PUT /users/{user_id}` | Usuario actualiza su propio email | Admin cambia rol de otro usuario | Usuario no admin cambia rol (403), email duplicado (409) |
| `DELETE /users/{user_id}` | Usuario se elimina a sí mismo | Admin elimina a otro usuario | Usuario no encontrado (404) |
| `GET /profiles/me` | Perfil propio devuelto correctamente | — | Perfil no encontrado (404) |
| `PUT /profiles/me` | Actualización exitosa del perfil | Actualización parcial (solo un campo) | Sin autenticación (401) |
| `GET /{domain}` (candidates, clients, etc.) | Listar registros del dominio autenticado | Usuario sin registros (lista vacía) | Sin token (401) |
| `POST /{domain}` | Crear registro en dominio | Título vacío (422) | Sin token (401) |

### Casos identificados con ayuda de la IA

1. **Token con subject vacío**: El token puede tener `sub: ""` en lugar de null. Se verificó que `decode_access_token` lo rechaza correctamente.
2. **Email normalizado vs no normalizado**: El login debe funcionar independientemente de mayúsculas/minúsculas gracias a la normalización en `get_user_by_email`.
3. **Usuario inactivo intentando hacer login**: Se verifica que `is_active` se chequea después de la autenticación devolviendo 403.
4. **Admin modificando rol de otro usuario**: Solo admins pueden cambiar roles, un usuario regular debe recibir 403.

---

## 📊 Resultados de cobertura

### Backend (FastAPI)

Ejecutado con: `uv run pytest --cov=api --cov-report=term-missing`

| Módulo | Cobertura |
|---|---|
| `api/auth/router.py` | 100% |
| `api/users/router.py` | 100% |
| `api/users/service.py` | 98% |
| `api/profiles/router.py` | 100% |
| `api/profiles/service.py` | 100% |
| `api/security.py` | 100% |
| `api/dependencies.py` | 100% |
| `api/core/config.py` | 100% |
| `api/schemas.py` | 100% |
| `api/db.py` | 100% |
| `api/domains/router.py` | 100% |
| `api/domains/service.py` | 100% |
| **Total** | **99%** |

### Bugs detectados por la batería de pruebas

1. **Usuario normal no puede leer/modificar un ID que no existe** — Al intentar hacer GET/PUT/DELETE sobre un `user_id` que no es el suyo, el middleware de autorización (`get_current_user`) devuelve 403 antes de llegar a la validación de 404. Esto es correcto por diseño de seguridad (no revelar existencia de otros usuarios), pero es importante documentarlo.

### Actividad extra — Backoffice y Frontend

#### Ticket: API-042 — Pruebas unitarias para endpoints del backoffice

Se añadieron tests para los siguientes grupos de endpoints del backoffice:

- **Perfiles** (`/profiles/me`): GET, PUT — camino feliz, caso límite, modo de fallo
- **Dominios** (`/candidates`, `/clients`, `/vacancies`, `/interviews`, `/evaluations`): GET, POST — camino feliz, caso límite, modo de fallo

Cobertura alcanzada: **100%** en `api/profiles/router.py`, `api/profiles/service.py`, `api/domains/router.py`, `api/domains/service.py`.

#### Ticket: FE-019 — Pruebas unitarias para funciones de utilidad del frontend

No hay proyecto frontend en el workspace actual. Las funciones de utilidad en TypeScript (`packages/shared/types/index.ts`) contienen solo definiciones de tipos — no hay lógica de negocio que probar. Pendiente para cuando exista un frontend con utilidades reales.

---

## 📁 Estructura de tests

```
services/api/tests/
├── __init__.py           # Inicializador del paquete
├── conftest.py           # Fixtures compartidos (client, helpers)
├── test_auth.py          # Tests de autenticación (login, /me, security)
├── test_users.py         # Tests de CRUD de usuarios (register, read, update, delete)
├── test_profiles.py      # Tests de perfiles (GET/PUT /profiles/me)
└── test_domains.py       # Tests de dominios (candidates, clients, etc.)
```

### Resumen de tests por archivo

| Archivo | Tests | Cobertura |
|---|---|---|
| `test_auth.py` | 23 | Login, /me, seguridad (JWT, bcrypt) |
| `test_users.py` | 22 | CRUD usuarios, roles, permisos |
| `test_profiles.py` | 7 | Perfil propio, actualización parcial |
| `test_domains.py` | 7 | Listado y creación en 5 dominios |

**Total: 59 tests, todos pasando.**
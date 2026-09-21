
# Nexova API

API central de Nexova construida con FastAPI.

Copia `.env.example` como `.env` y define una clave secreta antes de ejecutar el
servicio.

## Desarrollo local

```bash
uv run uvicorn api.main:app --reload
```

La documentacion interactiva queda disponible en `http://127.0.0.1:8000/docs`.

## Endpoints

- `POST /users`: registro publico; crea tambien el perfil inicial.
- `GET|PUT|DELETE /users`: gestion protegida de credenciales.
- `POST /auth/login` y `GET /auth/me`: login OAuth2 y sesion JWT.
- `GET|PUT /profiles/me`: perfil del usuario autenticado.
- `GET|POST /candidates`, `/clients`, `/vacancies`, `/interviews` y
	`/evaluations`: dominios sensibles protegidos y aislados por `user_uuid`.

Todos los endpoints protegidos esperan `Authorization: Bearer <token>`.

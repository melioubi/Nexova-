# Checklist AUTH-01

## Implementado

- [x] Proyecto FastAPI centralizado en `services/api`.
- [x] Dependencias instaladas con `uv`.
- [x] `User` almacenado en TinyDB con `id`, `email`, `hashed_password`, `is_active`, `role` y `created_at`.
- [x] `Profile` almacenado en TinyDB con relación uno a uno mediante `user_id`.
- [x] Nombre y contacto permanecen fuera de `User`.
- [x] Roles limitados a `admin`, `manager` y `user`; el registro usa `user` por defecto.
- [x] CRUD de usuarios bajo `/users`.
- [x] Registro público con creación de perfil inicial.
- [x] Login OAuth2 en `/auth/login`.
- [x] JWT firmado con `python-jose`, `sub` igual al ID TinyDB y expiración configurable.
- [x] `get_current_user` reutilizable con respuestas `401`.
- [x] Perfiles bajo `/profiles/me`, con autorización del propio usuario.
- [x] Acceso cruzado a usuarios bloqueado con `403`.
- [x] Cinco dominios sensibles adicionales protegidos: `/candidates`, `/clients`, `/vacancies`, `/interviews` y `/evaluations`.
- [x] Registros de dominios referencian al usuario como `user_uuid`.
- [x] Secretos y ruta de TinyDB configurables por entorno; `.env` ignorado por Git.
- [x] Pruebas para registro, login, perfil, hashing, `401`, `403` y token expirado.

## Verificación ejecutada

```bash
cd services/api
uv run pytest -q
uv run python -m compileall -q src
```

Resultado actual: `8 passed` y compilación correcta.

## Flujo manual en `/docs`

1. Copiar `.env.example` a `.env` y establecer `SECRET_KEY`.
2. Ejecutar `uv run uvicorn api.main:app --reload`.
3. Usar `POST /users` con email, contraseña y perfil inicial.
4. Usar `POST /auth/login` con `username=<email>` y la contraseña.
5. Pulsar `Authorize` y enviar el token como Bearer.
6. Probar `/auth/me` y una ruta de dominio protegida.
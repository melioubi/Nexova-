# Plataforma Nexova en Docker

La rama `feature/monorepo-containerization` integra el sitio público, autenticación, perfil, inventario y proveedores. Website (3000) y backoffice (3001) se ejecutan en un único contenedor Node Alpine; FastAPI se ejecuta en un contenedor Python separado (8000).

## Desarrollo

Desde la raíz, genera una vez la configuración local y arranca:

```bash
node scripts/setup-env.mjs
docker compose up --build --wait
```

El generador conserva un `.env` existente. Genera una clave y una contraseña demo aleatorias sin imprimirlas. Para una configuración antigua, añade `NEXT_ALLOWED_DEV_ORIGINS` con `127.0.0.1` y los hosts concretos de tus túneles de desarrollo. No incluyas protocolos ni puertos en esa lista.

Compose prioriza las variables exportadas en la terminal frente a `.env`: elimina las exportaciones antiguas si no coincide la configuración esperada. No imprimas `docker compose config` completo porque contiene los secretos interpolados; usa `docker compose config -q` para validar.

Acceso local:

- Website: http://localhost:3000
- Backoffice: http://localhost:3001/login
- Swagger: http://localhost:8000/docs

En Codespaces usa los enlaces privados de los puertos 3000 y 3001. El generador configura el enlace `Acceso equipo` para el Codespace actual. Mantén privados los puertos mientras uses la cuenta demo.

La cuenta está definida por `DEMO_EMAIL` y `DEMO_PASSWORD` en el `.env` raíz. Es exclusivamente de desarrollo. Perfil, inventario y proveedores comparten el mismo JWT. La cuenta se crea idempotentemente junto a las semillas (4 activos y 15 proveedores); los datos se conservan en el volumen `backend-data`.

## Recarga y red

Los bind mounts reflejan el código del host. Next usa `next dev --webpack` y FastAPI `uvicorn --reload`. Los directorios `node_modules` y `.next` se aíslan mediante volúmenes anónimos por interfaz. Se verificaron cambios temporales en el panel y `/health` sin reconstruir imágenes y se restauraron después.

El navegador llama a `/api/backend`; Next reenvía a `http://backend:8000` por la red Docker `nexova-platform`. `localhost` en los healthchecks identifica el propio contenedor, no una conexión entre servicios.

Ambos contenedores tienen healthchecks. `docker compose up --wait` espera respuestas HTTP de API y de las dos interfaces. Tras cambiar variables públicas de Next, reinicia interfaces y renueva sus cachés si es necesario; nunca elimines el volumen de datos para eso.

## Verificación

```bash
docker compose config -q
docker compose ps
npm install --prefix /tmp/nexova-capture playwright @xterm/xterm
/tmp/nexova-capture/node_modules/.bin/playwright install chromium
NODE_PATH=/tmp/nexova-capture/node_modules node scripts/verify-compose.cjs
```

La prueba comprueba dos contenedores saludables, login demo real, perfil, inventario, proveedores protegidos, filtros y móvil. Las capturas se guardan en `docs/evidence/containerization` sin mostrar tokens ni contraseñas. Chromium necesita sus bibliotecas nativas instaladas.

## Producción

La configuración y secretos de producción se generan en el VPS, no se copian desde la demo ni se incluyen en Git. Configura al menos:

- `APP_MODE=production` y `ENABLE_DEMO=false`.
- Una `SECRET_KEY` nueva y la conexión `DATABASE_URL` de producción.
- `HOST_BIND` y los puertos públicos según el firewall y el proxy HTTPS del VPS.
- `BACKEND_API_URL=http://backend:8000` y URLs públicas que apunten al servidor, no a localhost ni al Codespace.

En el VPS, desde la raíz del checkout:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml config -q
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build --wait
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

El override construye las interfaces para producción y elimina los bind mounts. El backend arranca sin `--reload`. Las variables `NEXT_PUBLIC_*` de producción deben estar definidas antes de construir la imagen.

### Despliegue verificado en VPS

El acceso SSH se autorizó mediante una clave pública dedicada (par ed25519 generado para el despliegue, sin contraseñas en texto plano ni en `.env`). Se instaló Docker Engine + Compose plugin en el VPS (Ubuntu 22.04 LTS) y se desplegó el stack con el overlay de producción.

Verificado en el VPS:

- `docker compose -f docker-compose.yml -f docker-compose.prod.yml ps` → ambos contenedores `healthy` ([evidencia](evidence/containerization/vps-compose-ps.txt)).
- `GET /health` → `{"status":"ok"}`.
- Login real contra `/auth/login` (OAuth2 password flow) devuelve JWT válido.
- `GET /inventory/products` autenticado → 4 activos de talento (seed persistente).
- `GET /suppliers` autenticado → 15 proveedores (seed persistente).
- Sitio público (puerto 80) y backoffice (puerto 443→3001) responden `HTTP 200`.

`ENABLE_DEMO=false` en producción, por lo que la cuenta de prueba se creó explícitamente vía `POST /users` con una contraseña aleatoria generada en el propio VPS; nunca se imprimió ni se envió por el chat.
# Aplicación de proveedores Nexova

Interfaz Next.js para consultar y mantener el directorio de proveedores.

```bash
npm install
npm run dev
```

La aplicación escucha en `http://localhost:3000` y reenvía `/api/*` al servicio FastAPI en `http://127.0.0.1:8000`. Para cambiar ese destino, define `API_URL_INTERNAL` antes de iniciar Next.js.
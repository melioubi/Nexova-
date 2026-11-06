# API de proveedores Nexova

API FastAPI con almacenamiento persistente TinyDB y los datos del briefing de Nexova.

Desde esta carpeta:

```bash
uv run seed
uv run uvicorn main:app --reload
```

La documentación interactiva queda en `http://localhost:8000/docs`. Se puede cambiar el archivo local de TinyDB definiendo `SUPPLIERS_DB_PATH`.
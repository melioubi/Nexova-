# Evidencias del directorio Nexova

- [Terminal del seeder](seed-terminal.png): dos ejecuciones reales de `uv run seed`, con 15 y 0 inserciones.
- [Swagger filtrado](swagger-filter.png): respuesta HTTP 200 para `country=Spain&category=job_boards`.
- [Directorio filtrado en escritorio](suppliers-filter-desktop.png): LinkedIn Talent Solutions e InfoJobs Premium.
- [Directorio filtrado en móvil](suppliers-filter-mobile.png): menú y filtros a 390 px, con scroll interno de la tabla.

La captura de terminal usa xterm.js para mostrar la salida real de un pseudoterminal (`script`) al ejecutar el seeder sobre una base temporal vacía. No modifica la base de la aplicación. La salida también queda en [seed-output.txt](seed-output.txt).

Para regenerar las capturas, inicia FastAPI en el puerto 8000 y Next.js en el puerto 3000; luego ejecuta desde la raíz:

```bash
npm install --prefix /tmp/nexova-capture playwright @xterm/xterm
/tmp/nexova-capture/node_modules/.bin/playwright install chromium
NODE_PATH=/tmp/nexova-capture/node_modules node scripts/capture-suppliers.cjs
```

Chromium requiere sus bibliotecas nativas de sistema. El script comprueba las inserciones 15/0, la respuesta Swagger, las dos filas filtradas y que el menú y el documento no desborden en móvil.
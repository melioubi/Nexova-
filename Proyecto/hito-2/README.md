# Nexova - Hito 2 (Fundamentos de programacion)

Implementacion de utilidades TypeScript para procesamiento de datos de registros de talento en Nexova.

## Estructura

```text
src/
├── types/
│   └── models.ts
├── utils/
│   ├── collections.ts
│   ├── search.ts
│   ├── transformations.ts
│   └── validations.ts
└── index.html
```

- `src/types/models.ts`: interfaces y tipos del dominio
- `src/utils/collections.ts`: filtrado, ordenamiento y agrupacion
- `src/utils/search.ts`: busqueda lineal y binaria
- `src/utils/transformations.ts`: conteos, sumas, promedios, minimos y maximos
- `src/utils/validations.ts`: validaciones de negocio
- `src/demo.ts`: ejecucion de ejemplo por consola
- `src/index.html`: pagina simple para pruebas manuales

## Comandos

- `npm install`
- `npm run typecheck`
- `npm run demo`
- `npm run build`
- `npm run serve`

Luego abre:

- `http://localhost:3005/src/index.html`

Si necesitas otro puerto:

- `PORT=3010 npm run serve`

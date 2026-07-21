# Talent Pipeline Tracker (Hito 3)

Aplicacion Next.js (App Router + TypeScript) para gestionar candidaturas de Nexova:

- Listado de candidaturas con filtros por estado y etapa.
- Busqueda por nombre o email sin recarga.
- Vista de detalle por candidato.
- Edicion de datos, actualizacion de estado/etapa y gestion de notas.

## Requisitos de entorno

Crear un archivo `.env.local` en esta carpeta con:

```env
NEXT_PUBLIC_API_URL=https://playground.4geeks.com/tracker/api/v1
```

## Scripts

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Catalogo oficial del dominio

Para cumplir el Context del Hito 3, la app usa unicamente:

- `status`: `received`, `in_progress`, `selected`, `discarded`
- `stage`: `pending`, `review`, `personal_interview`, `technical_interview`, `offer_presented`

Etiquetas visibles en UI (siempre legibles):

- `status`: Recibida, En proceso, Seleccionada, Descartada
- `stage`: Pendiente, Revision, Entrevista personal, Entrevista tecnica, Oferta presentada

## Normalizacion legacy

Aunque el catalogo oficial es el anterior, el frontend mantiene una normalizacion defensiva para evitar mostrar valores crudos si la API devolviera datos antiguos:

- `hired` -> `selected`
- `rejected` -> `discarded`
- `interview` -> `personal_interview`
- `offer` -> `offer_presented`
- `closed` -> `review`

Fallback para valores desconocidos:

- `status` desconocido -> `received`
- `stage` desconocido -> `pending`

## Revision del backend (endpoint `/records`)

Se reviso el endpoint publico configurado en `.env.local` y actualmente devuelve valores alineados al catalogo oficial.

Combinaciones unicas observadas (sample con `limit=200`):

- `received` + `pending`
- `in_progress` + `review`
- `in_progress` + `personal_interview`
- `in_progress` + `technical_interview`
- `selected` + `personal_interview`
- `discarded` + `review`
- `discarded` + `personal_interview`
- `discarded` + `technical_interview`

Conclusion tecnica:

- Hoy el backend ya responde con valores oficiales en `/records`.
- Se mantiene la normalizacion frontend para robustez y compatibilidad ante datos historicos o respuestas no normalizadas en otros endpoints.

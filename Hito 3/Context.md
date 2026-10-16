⚛️ Hito 3 — Talent Pipeline Tracker

Antes de empezar: lee tu CONTEXT-company.md antes de escribir codigo. Debes respetar datos especificos de tu empresa, nombres de campos, valores del dominio y restricciones.

## Que debes hacer

### Vistas y navegacion

- Crea una pagina de listado de candidaturas (`/`) que muestre todos los candidatos obtenidos desde `GET /records`.
- Crea una pagina de detalle de candidatura (`/candidates/[id]`) que obtenga y muestre los datos completos desde `GET /records/:id`.
- La navegacion entre listado y detalle debe usar el sistema de rutas de Next.js, sin recargas completas de pagina.

### Listado de candidaturas

- Muestra el nombre completo, el puesto, el estado actual y la etapa actual de cada candidato.
- Implementa filtro por estado y filtro por etapa usando query parameters (`useSearchParams`).
- Implementa un campo de busqueda que filtre por nombre o email sin recargar la pagina.
- Muestra estado de carga mientras se obtienen datos y mensaje de error si falla la peticion.

### Detalle de candidatura

- Muestra todos los campos disponibles: nombre, email, telefono, puesto, LinkedIn, enlace al CV, anos de experiencia, estado, etapa y fecha de aplicacion.
- Incluye un control para actualizar el estado mediante `PATCH /records/:id`.
- Incluye un control para actualizar la etapa mediante `PATCH /records/:id`.
- Muestra listado de notas desde `GET /records/:id/notes`.
- Permite anadir una nueva nota mediante `POST /records/:id/notes`.
- Permite eliminar una nota mediante `DELETE /records/:id/notes/:note_id`.

### Gestion de candidaturas

- Incluye un formulario para registrar una nueva candidatura (`POST /records`).
- Incluye un formulario para editar los datos de una candidatura (`PUT /records/:id`).
- Ambos formularios deben validar campos requeridos antes de enviarse.
- Muestra feedback de exito o error tras cada envio.

### Estado y manejo asincrono

- Todas las llamadas a la API deben gestionarse con `async/await`.
- Cada operacion de obtencion de datos debe tener al menos tres estados en UI: cargando, exito y error.
- Tras un `PATCH`, `PUT` o `POST`, actualiza la interfaz para reflejar el cambio sin recargar toda la pagina.

### Estructura del codigo

- Organiza el proyecto con estructura clara: `/components`, `/hooks` (si aplica), `/types`, `/lib` o `/services`.
- Define tipos TypeScript para todas las estructuras de datos de la API.

⚠️ IMPORTANTE:

- Los nombres de campos, etiquetas visibles, estados y valores especificos del dominio deben coincidir con tu CONTEXT.md de empresa.
- Usa unicamente Next.js (App Router), React y TypeScript.
- No uses librerias externas de estado global (Redux, Zustand, Jotai, etc.).
- El estado local por componente con hooks es suficiente para este hito.

## Que vamos a evaluar

- La pagina de listado renderiza correctamente los datos de la API.
- Los filtros por estado y etapa funcionan con query parameters sin recarga completa.
- La busqueda por nombre o email funciona sin recarga.
- La pagina de detalle carga y muestra todos los campos del candidato correcto por ID.
- El estado y la etapa se actualizan desde detalle usando `PATCH`.
- Las notas se pueden listar, anadir y eliminar desde detalle.
- Las nuevas candidaturas se pueden registrar con formulario usando `POST`.
- Los datos de una candidatura existente se editan con formulario usando `PUT`.
- Los estados de carga, exito y error son visibles en todas las operaciones asincronas.
- Los tipos TypeScript estan definidos y utilizados para las estructuras de la API.
- La estructura de carpetas separa componentes, tipos y logica de acceso a datos.
- El App Router de Next.js se usa correctamente para navegacion y rutas dinamicas.
- No hay prop drilling innecesario: estado acotado a nivel de componente.
- La implementacion refleja el contexto de la empresa asignada.

Nota: el diseno visual y el estilado no se evaluaran formalmente en este hito, pero la interfaz debe ser usable y mostrar toda la informacion requerida con claridad.

## Como entregar

- Sube los cambios a tu repositorio del monorepo en GitHub.
- Comparte el enlace siguiendo las instrucciones de tu instructor.
- Asegurate de no commitear `.env.local` e incluye `.env.example` para documentar variables de entorno necesarias.
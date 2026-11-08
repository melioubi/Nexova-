# Retos y Contexto del Proyecto — Nexova

> Documento consolidado de los retos / hitos transversales del monorepo Nexova.
>
> Este archivo reúne los briefs que originalmente vivían en archivos sueltos de la raíz (`INFO`, `INFO2`, `INFO3`, `Interfaz`, `Auditoria`, `Contenedorizacion`) con el objetivo de dejar el contexto del proyecto en un único lugar dentro del repo.
>
> Documento consolidado de los retos / hitos transversales del monorepo Nexova.
>
> **Nota:** este archivo unifica los briefs que originalmente vivían en archivos sueltos de la raíz (`INFO`, `INFO2`, `INFO3`, `Informacion`, `Interfaz`, `Auditoria`, `Contenedorizacion`) con el objetivo de dejar el contexto del proyecto en un único lugar dentro del repo.
>
> Orden cronológico sugerido de los hitos:
>
> 1. [Autenticación y protección de rutas (AUTH-01)](#1-autenticación-y-protección-de-rutas-auth-01)
> 2. [Pruebas unitarias de la API de autenticación (AUTH-088)](#2-pruebas-unitarias-de-la-api-de-autenticación-auth-088)
> 3. [Backend: gestión de inventario con ORM y doble base de datos](#3-backend-gestión-de-inventario-con-orm-y-doble-base-de-datos)
> 4. [Backoffice: interfaz de gestión de inventario](#4-backoffice-interfaz-de-gestión-de-inventario)
> 5. [Gestión de errores transversal](#5-gestión-de-errores-transversal-auditoría-de-error-handling)
> 6. [Auditoría de rendimiento frontend](#6-auditoría-de-rendimiento-frontend)
> 7. [Contenedorización y despliegue del monorepo](#7-contenedorización-y-despliegue-del-monorepo)
> 8. [Auditoría de serialización del backend](#8-auditoría-de-serialización-del-backend)

---

## 1. Autenticación y protección de rutas (AUTH-01)

> 📌 Estás construyendo sobre **tu copia** del **[monorepo](https://github.com/4GeeksAcademy/ai-engineering-company-project-monorepo)** de la empresa seleccionada al inicio del curso — no en un repositorio nuevo.

La API de tu empresa está creciendo. Has construido endpoints que sirven datos al frontend, consultan la base de datos y procesan registros — pero en este momento, cualquier persona que conozca una URL puede llamarlos. Antes de que la plataforma pase a su siguiente fase, la CTO ha sido clara: **ninguna ruta que modifique o exponga datos sensibles debe ser accesible sin una sesión válida.**

Tu tech lead acaba de dejarte un ticket en la cola:

> #### AUTH-01 — Implementar autenticación y protección de rutas
>
> La API actualmente no tiene capa de autenticación. Esta tarea incluye:
>
> - Un módulo `users` con CRUD completo (crear, leer, actualizar, eliminar) **solo para credenciales** — email y contraseña.
> - Un módulo `profiles` con enlace uno a uno a cada usuario — **el nombre visible y los datos de contacto viven en `Profile`, no en `User`.**
> - Un endpoint de login que valide credenciales y devuelva un token JWT firmado.
> - Una dependencia reutilizable `get_current_user` que decodifique el token e identifique al usuario.
> - Aplicación de esa dependencia a todas las rutas que no deben ser de acceso público.
>
> Almacena `User` y `Profile` **solo en TinyDB** — El JWT debe llevar el `id` del usuario en TinyDB; otros módulos lo referencian como `user_uuid`.
>
> Usa `OAuth2PasswordBearer` de FastAPI y `python-jose` para la firma del token. Las contraseñas deben estar hasheadas — nunca almacenadas ni comparadas en texto plano. El token debe llevar como mínimo el ID del usuario y expirar tras una ventana configurable.
>
> Todas las rutas relacionadas con autenticación deben vivir bajo `/auth`. Las rutas de gestión de usuarios bajo `/users`. Las rutas de perfil bajo `/profiles`.

Esto es una cuestión de seguridad, no una feature: el trabajo que hagas aquí protege todo lo que se construyó antes y todo lo que vendrá después. Hazlo bien.

> **Nota:** Una vez que protejas tus rutas, puede que algunas llamadas del frontend dejen de funcionar temporalmente — es algo esperado. El frontend se actualizará para enviar el token en una fase posterior. Por ahora, el foco está en asegurar la API para evitar fuga de datos y accesos indebidos.

### Conocimiento complementario: cómo funciona la autenticación JWT en FastAPI

Si no has implementado auth con JWT antes, este es el modelo mental: cuando un usuario hace login, el servidor firma un pequeño payload JSON (los "claims") usando una clave secreta y devuelve el resultado como una cadena de token. En las solicitudes siguientes, el cliente envía ese token en la cabecera `Authorization`. El servidor lo decodifica — si la firma es válida y el token no ha expirado, la solicitud continúa; si no, recibe un `401`.

En FastAPI, este flujo se implementa como una dependencia. Escribes una función que extrae el token de la solicitud, lo valida y devuelve el objeto usuario. Cualquier ruta que declare esa función como dependencia requerirá autenticación automáticamente.

### Cómo Iniciar el Proyecto

Este proyecto es una extensión de tu API del proyecto transversal existente. **No crees un repositorio nuevo.** Trabaja dentro del codebase de backend actual de tu empresa.

1. Abre tu proyecto existente en Codespaces o clónalo en local.
2. Crea una nueva rama para esta feature: `git switch -c feature/auth-api`.
3. Instala los paquetes necesarios con `uv` (nunca uses `pip install` ni `pipenv`):
   ```bash
   uv add "python-jose[cryptography]" "libpass[bcrypt]"
   ```

### Qué Debes Hacer

#### Modelo de usuario y CRUD

- [ ] Crea un modelo `User` en **TinyDB** con al menos: `id`, `email`, `hashed_password`, `is_active`, `role`, `created_at`. **No** almacenes nombre visible ni datos de contacto en `User`.
- [ ] El campo `role` debe aceptar únicamente `admin`, `manager` o `user`. Usa un `Enum` o validador de campo para rechazar cualquier otro valor. Los registros nuevos vía `POST /users` usan `user` por defecto.
- [ ] Implementa una capa de servicios con funciones para: crear usuario, obtener usuario por ID, obtener usuario por email, actualizar usuario, eliminar usuario.
- [ ] Expón esos servicios como endpoints REST bajo `/users`:
  - `POST /users` — registrar un nuevo usuario (hashear la contraseña antes de guardar). Acepta campos opcionales de perfil inicial (`name`, `phone`, `address`) y crea el `Profile` vinculado en la misma operación.
  - `GET /users` — listar todos los usuarios (protegida).
  - `GET /users/{id}` — obtener un usuario por ID (protegida).
  - `PUT /users/{id}` — actualizar campos de credenciales como `email`, y `role` cuando quien llama es `admin` (protegida; solo el propio usuario o un admin).
  - `DELETE /users/{id}` — eliminar un usuario (protegida). También elimina el perfil vinculado.

#### Modelo de perfil y endpoints

- [ ] Crea un modelo `Profile` en **TinyDB**, vinculado uno a uno a `User` mediante `user_id`, con al menos: `id`, `user_id`, `name`, `phone`, `address`.
- [ ] Expón rutas de perfil bajo `/profiles`:
  - `GET /profiles/me` (protegida) — devuelve el perfil del usuario autenticado.
  - `PUT /profiles/me` (protegida) — actualiza `name`, `phone` y `address`. Solo el dueño del perfil puede modificarlo.

#### Endpoints de autenticación

- [ ] Implementa `POST /auth/login` — acepta `email` y `password`, valida credenciales y devuelve un token JWT de acceso.
- [ ] Implementa `GET /auth/me` (protegida) — devuelve el `email` y `role` del usuario autenticado más el `Profile` vinculado (nombre y datos de contacto).

#### Token y dependencia

- [ ] Crea una dependencia `get_current_user` que: extraiga la cabecera `Authorization: Bearer <token>`, decodifique y valide el JWT, recupere el usuario de la base de datos y lance `HTTPException(401)` si algo falla.
- [ ] Configura la expiración del token mediante una variable de entorno (ej. `ACCESS_TOKEN_EXPIRE_MINUTES`). Guarda la clave de firma en `.env` — nunca la hardcodees.

#### Protección de rutas

- [ ] Aplica `get_current_user` como dependencia a cada ruta que no deba ser pública. Como mínimo: todos los endpoints de `/users` excepto `POST /users`, `/auth/me`, **y al menos otras 5 rutas existentes** de la API de tu monorepo (fuera de `/users` y `/auth`) que expongan o modifiquen datos sensibles.
- [ ] Devuelve `401 Unauthorized` para solicitudes no autenticadas y `403 Forbidden` cuando un usuario intenta acceder a un recurso que no le pertenece.

#### Verificación

- [ ] Verifica el flujo completo manualmente usando los docs interactivos de FastAPI (`/docs`): registro con `POST /users` → login → copiar token → usar el token en una ruta protegida.
- [ ] Confirma que llamar a una ruta protegida sin token devuelve `401`.
- [ ] Confirma que llamar a una ruta protegida con un token expirado o mal formado devuelve `401`.

⚠️ **IMPORTANTE:** Almacena `User` y `Profile` **solo en TinyDB** — ahora y después de añadir Supabase. No crees tablas de usuarios ni perfiles en Supabase/SQLModel. Las tablas PostgreSQL de inventario y otros módulos guardan solo el `id` de TinyDB como `user_uuid`.

⚠️ **IMPORTANTE:** No uses autenticación basada en sesiones ni en cookies. Este proyecto implementa únicamente auth JWT stateless.

⚠️ **IMPORTANTE:** Nunca almacenes contraseñas en texto plano. Usa `libpass` con el esquema `bcrypt` para todas las operaciones con contraseñas. Instala `libpass[bcrypt]` — no el `passlib` sin mantenimiento. El import de Python sigue siendo `from passlib.hash import bcrypt` (libpass es un fork drop-in).

### Qué Vamos a Evaluar

- [ ] El CRUD de usuarios está completamente implementado y accesible a través de la API.
- [ ] Cada `User` tiene un `Profile` vinculado; `name`, `phone` y `address` se almacenan en `Profile`, no en `User`.
- [ ] El campo `role` acepta únicamente `admin`, `manager` o `user`; los usuarios nuevos creados vía `POST /users` usan `user` por defecto.
- [ ] Las contraseñas se hashean al crear el usuario y se comparan correctamente en el login — el texto plano nunca toca la base de datos.
- [ ] El endpoint de login devuelve un token JWT válido y firmado.
- [ ] La dependencia `get_current_user` decodifica correctamente el token e identifica al usuario.
- [ ] Las rutas protegidas devuelven `401` al ser llamadas sin un token válido.
- [ ] Un usuario que accede o actualiza el perfil o las credenciales de otro usuario recibe `403 Forbidden` (no solo `401` por token ausente o inválido).
- [ ] La expiración del token y la clave de firma se leen desde variables de entorno, no están hardcodeadas.
- [ ] Las rutas de auth están bajo `/auth`, las de usuarios bajo `/users` y las de perfil bajo `/profiles` — estructura limpia y coherente.
- [ ] Al menos **5 rutas existentes fuera de `/users` y `/auth`** requieren un token válido (además de las rutas protegidas de usuario/auth).
- [ ] `User` y `Profile` permanecen en TinyDB tras introducir Supabase — sin tablas de usuario en PostgreSQL.
- [ ] Las rutas protegidas del monorepo siguen funcionando correctamente cuando se llaman con un token válido (sin regresiones).

> Nota: Aplicar permisos distintos por rol en cada ruta no es requerido para esta entrega, aunque es una extensión válida si el tiempo lo permite.

### Cómo Entregar

Sube tu rama a GitHub y abre un pull request contra `main` en el repositorio de tu proyecto transversal. Comparte el enlace al PR con tu instructor. La descripción del PR debe incluir una nota breve sobre qué rutas están ahora protegidas y cómo lo verificaste.

---

## 2. Pruebas Unitarias de la API de Autenticación (AUTH-088)

La API de autenticación de tu empresa está en producción, gestionando usuarios y sesiones reales. La semana pasada, un compañero subió un pequeño refactor que rompió la lógica de expiración de tokens — ninguna prueba lo detectó, y los usuarios reportaron estar bloqueados durante dos horas antes de que alguien se diera cuenta. La respuesta del CTO fue breve y directa: _"Necesitamos una batería de pruebas. El código sin tests no es código de producción."_

Tu tarea es añadir una batería completa de pruebas unitarias a la API de autenticación que construiste en el hito anterior. Trabajarás al nivel de la lógica de funciones y endpoints — no probando la serialización HTTP ni las tuberías del framework, sino la lógica de negocio real: ¿se genera correctamente el token? ¿Se rechaza un token expirado? ¿Qué ocurre cuando el campo de contraseña está vacío?

No se trata de escribir pruebas por el mero hecho de escribirlas. Se trata de construir la confianza de que cada endpoint se comporta como se espera en condiciones normales, en casos límite y en escenarios de fallo — los tres pilares de cualquier plan de pruebas serio.

> Tu CTO ha registrado el siguiente ticket:
>
> #### Ticket: AUTH-088 — Cobertura de pruebas unitarias para la API de autenticación
>
> **Prioridad:** Alta
>
> **Contexto:** Tras la regresión de la semana pasada, requerimos pruebas unitarias en todos los endpoints de autenticación antes de fusionar cualquier nuevo cambio.
>
> **Alcance:**
>
> - La batería de pruebas debe cubrir todos los endpoints de la API de autenticación
> - Cada endpoint debe tener como mínimo: una prueba de camino feliz, una prueba de caso límite y una prueba de modo de fallo
> - Usar `pytest` para el backend en FastAPI y `Jest` para la lógica en TypeScript
> - Las pruebas deben pasar limpiamente con `uv run pytest` y `jest --coverage`
> - No probar la serialización HTTP — probar la lógica
>
> **Entregable:** Una batería de pruebas funcional incluida junto al código de la API existente, con un `TESTING.md` breve que explique cómo ejecutarla.

Antes de escribir tu primera prueba, define tu plan de pruebas: lista los casos que quieres cubrir para cada endpoint, identifica los casos límite (campos vacíos, usuarios duplicados, tokens malformados) y piensa qué entradas podrían producir comportamientos inesperados. Luego usa la IA para que te ayude a generar el código de los tests — pero las decisiones sobre _qué_ probar son tuyas.

Este es el tipo de trabajo que distingue a un junior que entrega funcionalidades de un profesional que entrega software fiable.

### Cómo iniciar el proyecto

Trabajarás sobre tu proyecto de API de autenticación existente — no hay un repositorio nuevo que clonar.

1. Abre tu proyecto de API de autenticación del hito anterior.
2. Si trabajas en local, asegúrate de haber ejecutado `uv sync` para instalar las dependencias.
3. Si usas GitHub Codespaces, reabre tu proyecto existente desde tu perfil de GitHub.

Instala las dependencias de testing si aún no están presentes:

```bash
# Python / FastAPI
uv add --dev pytest pytest-cov httpx

# TypeScript (si aplica)
npm install --save-dev jest @types/jest ts-jest
```

Si tienes dudas sobre cómo configurar un proyecto desde cero, visita: [cómo iniciar un proyecto de programación](https://4geeks.com/es/lesson/como-iniciar-un-proyecto-de-programacion).

### Qué debes hacer

#### Plan de pruebas

- [ ] Crea un archivo `TESTING.md` en la raíz de tu proyecto documentando: cómo ejecutar las pruebas, qué cubre cada suite y qué casos decidiste incluir y por qué.
- [ ] Antes de escribir ningún test, lista en `TESTING.md` los casos que planeas cubrir: camino feliz, casos límite y modos de fallo para cada endpoint.

#### FastAPI — pytest

- [ ] Crea un directorio `tests/` en la raíz de tu proyecto FastAPI.
- [ ] Escribe un módulo de pruebas para cada endpoint de autenticación (p. ej., `test_register.py`, `test_login.py`, `test_token.py`).
- [ ] Para cada endpoint, implementa como mínimo:
  - [ ] Una prueba de camino feliz (entrada válida, respuesta esperada)
  - [ ] Una prueba de caso límite (entrada en el límite: campo vacío, usuario duplicado, etc.)
  - [ ] Una prueba de modo de fallo (credenciales inválidas, token expirado, solicitud malformada)
- [ ] Todas las pruebas deben pasar al ejecutar `uv run pytest` desde la raíz del proyecto.
- [ ] Ejecuta `uv run pytest --cov` y comprueba que tu batería alcanza al menos **70% de cobertura** en el módulo de autenticación.

#### TypeScript — Jest (si tu proyecto incluye lógica de utilidades en TypeScript)

- [ ] Configura Jest con un archivo `jest.config.ts` o `jest.config.js` en la raíz de tu proyecto TypeScript.
- [ ] Escribe pruebas unitarias para cualquier función de utilidad relacionada con la autenticación (generación de tokens, validación, helpers de hash de contraseñas).
- [ ] Para cada función, implementa como mínimo: una prueba de camino feliz y una prueba de modo de fallo.
- [ ] Todas las pruebas deben pasar al ejecutar `jest --coverage`.

#### Flujo de trabajo asistido por IA

- [ ] Usa tu agente de IA para identificar casos de prueba que podrías haber pasado por alto — proporciónale la lógica de tu endpoint y pídele que sugiera casos límite.
- [ ] Usa la IA para generar el boilerplate de los tests, pero revisa y entiende cada prueba antes de confirmarla.
- [ ] Si un test generado revela un bug en tu código existente, corrígelo y documéntalo en `TESTING.md`.

⚠️ **IMPORTANTE:** No pruebes la serialización HTTP ni los internos del framework. Cada test debe afirmar algo sobre la lógica de negocio de tu aplicación — lo que el endpoint _decide_, no cómo _responde_.

### 🏆 Actividad extra — Cierra el backlog mientras tienes el setup hecho

El CTO marcó AUTH-088 como el bloqueante, pero hay dos tickets que llevan semanas en el backlog sin que nadie los persiga. Son de baja prioridad — nadie los está pidiendo — pero ahora que tienes la infraestructura de testing montada, sería una pena no cerrarlos. Si terminas antes de tiempo, liquídalos.

> #### Ticket: API-042 — Pruebas unitarias para los endpoints del backoffice
>
> **Prioridad:** Baja
>
> **Contexto:** La API del backoffice nunca ha tenido batería de pruebas. No se han reportado regresiones, pero probablemente es porque el equipo es pequeño, no porque el código sea sólido. Ahora que tenemos `pytest` configurado, ampliemos la cobertura antes de que el equipo crezca.
>
> **Alcance:**
>
> - Elige al menos dos grupos de endpoints del backoffice distintos a la autenticación (p. ej., recursos, usuarios, elementos — lo que tenga el dominio de tu empresa)
> - Aplica la misma estructura de tres niveles: camino feliz, caso límite, modo de fallo
> - Apunta a un 60% de cobertura en los módulos que pruebes — el listón es más bajo que en auth, pero sigue siendo significativo
>
> **Entregable:** Nuevos módulos de prueba añadidos al directorio `tests/` existente. Actualiza `TESTING.md` con los nuevos resultados de cobertura.

> #### Ticket: FE-019 — Pruebas unitarias para las funciones de utilidad del frontend
>
> **Prioridad:** Baja
>
> **Contexto:** El frontend ha ido acumulando funciones de utilidad a lo largo de los hitos anteriores — validadores de formularios, formateadores de datos, manejadores de respuestas de API — que nunca se han probado. Un bug en cualquiera de ellas podría romper la UI de forma silenciosa y difícil de rastrear.
>
> **Alcance:**
>
> - Identifica al menos tres funciones de utilidad o helper en tu frontend Next.js / TypeScript
> - Escribe tests de Jest para cada una: una prueba de camino feliz y una de modo de fallo por función
> - Buenas candidatas: validadores de entrada, formateadores de fechas o monedas, parsers de respuestas, helpers de almacenamiento de tokens
>
> **Entregable:** Un directorio `__tests__/` dentro de tu proyecto frontend con los archivos de prueba. Actualiza `TESTING.md` con las instrucciones para ejecutar los tests del frontend de forma independiente.

- [ ] _(Extra)_ Escribe tests con pytest para al menos dos grupos de endpoints del backoffice, alcanzando un 60% de cobertura en esos módulos.
- [ ] _(Extra)_ Escribe tests de Jest para al menos tres funciones de utilidad del frontend (camino feliz + modo de fallo en cada una).
- [ ] _(Extra)_ Actualiza `TESTING.md` con los resultados de cobertura e instrucciones de ejecución para ambas suites adicionales.

### Qué vamos a evaluar

- [ ] Existe un archivo `TESTING.md` que documenta el plan de pruebas, cómo ejecutarlas y los resultados de cobertura.
- [ ] `uv run pytest` se ejecuta sin errores desde la raíz del proyecto y todas las pruebas pasan.
- [ ] La batería incluye pruebas de camino feliz, casos límite y modos de fallo para cada endpoint de autenticación.
- [ ] La cobertura del módulo de autenticación es igual o superior al 70% (verificada con `uv run pytest --cov`).
- [ ] Las pruebas afirman lógica de negocio, no serialización HTTP ni comportamiento del framework.
- [ ] Si existen funciones de utilidad en TypeScript, los tests de Jest están presentes y pasan.
- [ ] El flujo asistido por IA es evidente: `TESTING.md` menciona al menos un caso identificado con ayuda de la IA o un bug detectado por la batería de pruebas.
- [ ] El código está limpio: los tests tienen nombres claros, siguen una estructura consistente e incluyen comentarios breves que explican las afirmaciones no evidentes.

> **Nota:** La evaluación no requiere un 100% de cobertura. La calidad y el criterio de los casos de prueba importan más que el porcentaje. Un 70% bien razonado vale más que un 95% mecánico.

> **Actividad extra:** Las baterías de pruebas del backoffice y el frontend no son obligatorias para aprobar, pero se reconocerán en la evaluación si están presentes y pasan.

### Cómo entregar

Sube el repositorio actualizado a GitHub — debe contener tu código de API existente más el nuevo directorio `tests/` y el archivo `TESTING.md` — y comparte la URL del repositorio con tu instructor según sus indicaciones.

---

## 3. Backend: Gestión de Inventario con ORM y Doble Base de Datos

> 📌 Estás construyendo sobre **tu copia** del **[monorepo](https://github.com/4GeeksAcademy/ai-engineering-company-project-monorepo)** de la empresa seleccionada al inicio del curso — no en un repositorio nuevo.

Ya has construido — o se espera que tengas — la API y la capa de autenticación bajo `services/`. Si FastAPI + auth TinyDB (`User` / `get_current_user`) aún no está en tu monorepo, completa los proyectos de autenticación (o monta esa capa) antes de empezar este hito: aquí **extiendes** ese servicio; no creas uno nuevo desde cero.

Ahora el equipo de operaciones ha enviado una **RFP** a la unidad tecnológica: la empresa necesita un sistema centralizado de gestión de inventario antes de la próxima revisión operativa.

Tu tech lead ha convertido esa RFP en una decisión arquitectónica que condiciona todo lo que construirás aquí: **la autenticación permanece en TinyDB** (búsquedas rápidas, locales y basadas en documentos), y **todos los datos de negocio — productos, órdenes de entrada y órdenes de salida — se mueven a Supabase** (una base de datos PostgreSQL alojada en la nube). Tu aplicación FastAPI mantendrá dos conexiones de base de datos simultáneas y deberá usarlas de forma deliberada: cada petición llega al almacén correcto.

Esto no es solo un ejercicio de persistencia. El equipo de operaciones incluyó una restricción no negociable en el **brief**:

> _"Los niveles de stock no se pueden modificar directamente. La única forma de cambiar el inventario es registrando una orden — ya sea una orden de entrada que añade stock, o una orden de salida que lo reduce. Cada orden debe ser trazable al usuario que la creó."_

Tu trabajo es hacer cumplir esa regla a nivel de API y de modelos, usando un ORM para traducir clases Python en tablas relacionales en Supabase. Todos los endpoints de inventario deben agruparse bajo el prefijo de router `/inventory`.

### ¿Qué es un ORM y por qué importa aquí?

Un ORM (Object-Relational Mapper) es una capa de traducción: una clase Python se convierte en una tabla, una instancia en una fila y un atributo en una columna. No reemplaza conocer SQL — entender lo que el ORM genera por debajo es lo que permite usarlo correctamente y depurar errores cuando algo falla. En este hito usarás **SQLModel**, que combina el motor ORM de SQLAlchemy con el sistema de tipos de Pydantic. No uses SQLAlchemy directamente.

Antes de escribir cualquier consulta, debes conocer el **problema N+1**. Si cargas una lista de órdenes y después accedes a los datos del producto de cada una dentro de un bucle, generas una consulta adicional por elemento — degradando el rendimiento de forma silenciosa. Estructura tus consultas para cargar los datos relacionados desde el inicio, no en el momento del acceso.

### Brief de tu tech lead

> > **De:** Tech Lead
> > **Asunto:** Hito — arquitectura de doble base de datos + ORM de inventario
> >
> > El **PRD** está listo. Esto es lo que debe hacer el sistema:
> >
> > 1. La aplicación FastAPI conecta a **dos bases de datos simultáneamente**: TinyDB (existente, para usuarios y autenticación) y Supabase (nueva, para inventario y órdenes).
> > 2. Los productos y el stock viven en Supabase. El stock **no debe ser una columna editable directamente** — siempre se deriva del historial de órdenes.
> > 3. Las **órdenes de entrada** incrementan el stock; las **órdenes de salida** lo reducen. Ambas se almacenan en Supabase y referencian el UUID del usuario de TinyDB — ninguna tabla de usuarios se replica en Supabase.
> > 4. Los modelos ORM usan **SQLModel**. Los schemas Pydantic para request y response están en un archivo separado de los modelos ORM — nunca devuelvas un objeto ORM directamente desde un endpoint.
> > 5. Todas las rutas de inventario deben registrarse bajo el prefijo `/inventory` usando un `APIRouter` dedicado.
> > 6. Revisa tu CONTEXT.md — los nombres de entidades, las restricciones de campos y las reglas de negocio son específicas de tu empresa.
> >
> > **Criterios de aceptación**: todos los endpoints funcionales bajo `/inventory`, relaciones FK aplicadas a nivel de base de datos, sin mutación directa de stock, ambas conexiones activas y usadas correctamente.

### Cómo Empezar el Proyecto

Este hito extiende el servicio FastAPI de tu monorepo. No crearás un nuevo servicio — añadirás la capa de inventario sobre el existente.

1. Abre tu repositorio existente (forkeado desde `https://github.com/4GeeksAcademy/ai-engineering-company-project-monorepo`).
2. Navega a `services/` — tu aplicación FastAPI con auth TinyDB debería vivir ya aquí. Si no, detente y monta / termina auth primero.
3. Instala las nuevas dependencias:
   ```bash
   uv add sqlmodel psycopg2-binary
   ```
4. Añade tu cadena de conexión de Supabase a `.env`. Deja intacta la configuración TinyDB de auth — no la modifiques.
5. Lee tu **CONTEXT-company.md** antes de definir cualquier modelo — los nombres de entidades y las restricciones de campos están especificados allí.

#### Conexión con Supabase

En el panel de Supabase (**Connect → Direct**), elige **Transaction pooler** como método de conexión y **URI** como tipo — luego copia esa cadena en `DATABASE_URL`.

![Configuración de conexión en Supabase: método Transaction pooler y tipo URI](https://raw.githubusercontent.com/4GeeksAcademy/ai-engineering-syllabus/main/content/projects/ai-eng-milestone-backend-development/.learn/supabase-transaction-pooler-uri.png)

![Cadena de conexión en Supabase: detalles del URI con Transaction pooler](https://raw.githubusercontent.com/4GeeksAcademy/ai-engineering-syllabus/main/content/projects/ai-eng-milestone-backend-development/.learn/supabase-transaction-pooler-connection-string.png)

### Qué Debes Hacer

#### Configuración de bases de datos

- [ ] Añade la cadena de conexión PostgreSQL de Supabase a `.env`. Nunca escribas credenciales directamente en el código.
- [ ] En `database.py` (o equivalente), inicializa **ambas** conexiones de base de datos: el cliente TinyDB existente y el nuevo motor SQLModel apuntando a Supabase.
- [ ] Crea una dependencia `get_db` que produzca una sesión SQLModel por petición mediante `Depends()`. No uses variables de sesión globales.

#### Modelos ORM — `models.py`

- [ ] Define la entidad **equivalente a producto** de tu CONTEXT.md (p. ej. `Ingredient`, `SKU`, `Asset`, `MedicalSupply`) con `SQLModel, table=True`, con al menos: `id`, `name`, `sku` y cualquier campo específico de CONTEXT.md. *(Para Nexova: `TalentAsset`.)*
- [ ] Define el modelo **equivalente a entrada** (p. ej. `IngredientEntry`, `StockEntry`) con: `id`, una FK a la entidad equivalente a producto (`ingredient_id` / `sku_id` / … según CONTEXT.md), `quantity`, `created_at`, `user_uuid` (cadena — referencia al usuario de TinyDB; sin FK, sin replicación de tabla de usuarios), y cualquier otro campo que CONTEXT.md exija. *(Para Nexova: `TalentEntry`.)*
- [ ] Define el modelo **equivalente a salida** (p. ej. `IngredientExit`, `StockExit`) con el mismo patrón de FK, más `quantity`, `created_at`, `user_uuid` y los campos que CONTEXT.md exija. *(Para Nexova: `TalentExit`.)*
- [ ] Llama a `SQLModel.metadata.create_all(engine)` al inicio de la aplicación para inicializar el esquema en Supabase.

  > ⚠️ `create_all()` es aceptable en contextos de desarrollo y aprendizaje. En un sistema en producción, los cambios de esquema se gestionan siempre mediante archivos de migración (p. ej., Alembic) que mantienen un historial versionado de cada cambio. Nunca uses `create_all()` contra una base de datos compartida o de producción.

#### Schemas Pydantic — `schemas.py`

- [ ] Define schemas de request y response para las entidades equivalentes a producto, entrada y salida como modelos Pydantic independientes — separados de los modelos ORM. Usa los nombres de CONTEXT.md.
- [ ] El schema de respuesta de la entidad equivalente a producto debe incluir un campo `current_stock` (calculado, no almacenado).
- [ ] Los modelos ORM y los schemas Pydantic deben estar en **archivos separados**. Son clases distintas, aunque algunos campos coincidan.

#### Router de inventario — `routers/inventory.py`

- [ ] Crea un `APIRouter` dedicado con `prefix="/inventory"` y regístralo en la aplicación FastAPI principal.
- [ ] Implementa los siguientes endpoints dentro de este router:

| Método | Ruta                         | Descripción                                                  |
| ------ | ---------------------------- | ------------------------------------------------------------ |
| `GET`  | `/inventory/products`        | Lista todos los productos con `current_stock` calculado      |
| `POST` | `/inventory/products`        | Crea un producto (requiere autenticación)                    |
| `GET`  | `/inventory/products/{id}`   | Obtiene un producto con su stock actual                      |
| `POST` | `/inventory/orders/inbound`  | Registra una orden de entrada (requiere autenticación)       |
| `POST` | `/inventory/orders/outbound` | Registra una orden de salida (requiere autenticación)        |
| `GET`  | `/inventory/orders`          | Lista todas las órdenes con datos del producto y `user_uuid` |

> **Auth en GET:** las escrituras de producto y órdenes **siempre** requieren autenticación. Si los `GET` son públicos o autenticados lo define tu CONTEXT.md (p. ej. HealthCore exige acceso autenticado en las rutas de inventario).

#### Reglas de negocio

- [ ] `current_stock` se calcula siempre como `SUMA(cantidades de entradas) − SUMA(cantidades de salidas)` para cada entidad equivalente a producto, **acotado por cualquier clave de partición que defina tu CONTEXT.md** (p. ej. warehouse). Nunca se almacena como una columna que pueda modificarse directamente.
- [ ] Una entidad equivalente a producto comienza con stock cero al crearse y solo puede acumular stock a través de registros de entrada.
- [ ] Cada endpoint de creación de órdenes requiere autenticación. El UUID del usuario autenticado (de TinyDB) debe almacenarse en el campo `user_uuid` de la orden.
- [ ] Un registro de salida que resultaría en stock negativo (dentro del alcance que define CONTEXT.md) debe rechazarse **antes de persistir el registro**, devolviendo `HTTP 400` con un mensaje de error descriptivo.

⚠️ **IMPORTANTE:** Los nombres de entidades, nombres de campos y valores específicos del dominio en tu implementación deben coincidir con lo especificado en tu CONTEXT.md. Una implementación genérica que ignore el contexto no será aceptada.

#### Datos semilla

- [ ] Siembra las tablas de inventario con los registros mínimos listados en tu CONTEXT.md (equivalentes a producto, entradas y salidas) antes de la demo. El stock sembrado debe coincidir con neto entradas − salidas. *(Datos semilla de Nexova: ver `CONTEXT.md`.)*

### Qué Vamos a Evaluar

- [ ] Dos conexiones de base de datos están presentes y se usan correctamente: TinyDB para autenticación y consultas de usuario; Supabase (SQLModel) para todas las entidades de inventario.
- [ ] Todos los endpoints de inventario están agrupados bajo `/inventory` mediante un `APIRouter` dedicado.
- [ ] Los modelos ORM SQLModel declaran correctamente las relaciones FK: los modelos de entrada/salida referencian la entidad equivalente a producto nombrada en CONTEXT.md (no un `Product` genérico salvo que CONTEXT.md lo diga).
- [ ] `current_stock` se calcula a partir de órdenes — ningún endpoint permite modificar directamente un campo de stock en la entidad equivalente a producto.
- [ ] El cálculo de stock respeta el alcance de CONTEXT.md (global vs por partición / por warehouse cuando aplique).
- [ ] Un registro de salida que supera el stock disponible (dentro de ese alcance) se rechaza con `HTTP 400` antes de que ocurra cualquier escritura.
- [ ] Cada orden almacena el `user_uuid` del creador autenticado (obtenido de TinyDB).
- [ ] Los modelos ORM (`models.py`) y los schemas Pydantic (`schemas.py`) están en archivos separados y son estructuralmente distintos — ningún endpoint devuelve un objeto SQLModel directamente.
- [ ] La sesión SQLModel se inyecta por petición mediante `Depends()` — no existe ninguna sesión global en el código.
- [ ] Todos los parámetros de conexión están en `.env`; `.env` aparece en `.gitignore`.
- [ ] Los nombres de entidades y campos coinciden con la especificación del CONTEXT.md del estudiante.
- [ ] Los datos semilla de CONTEXT.md están presentes; `GET /inventory/products` refleja el stock neto de esas semillas.

### Cómo Entregar

1. Confirma y sube todos los cambios a tu fork.
2. Verifica que `.env` está en `.gitignore` — nunca subas credenciales.
3. Envía la URL de tu fork a través de la plataforma del estudiante.

---

## 4. Backoffice: Interfaz de Gestión de Inventario

El equipo de backend completó la API de inventario e hizo el **handoff** al equipo de producto: todos los endpoints `/inventory` están activos, autenticados y documentados. Ahora el responsable de operaciones ha enviado un **brief** a la unidad tecnológica: el personal que gestiona el stock a diario necesita una interfaz funcional dentro del backoffice. Mientras no la haya, la API existe pero nadie puede usarla sin un cliente REST.

Tu trabajo es construir la sección de inventario del backoffice: un conjunto de vistas que permitan al personal autenticado consultar el stock disponible, registrar entregas, registrar consumos o salidas y revisar el historial completo de órdenes — todo comunicándose con la API construida en el proyecto de backend.

Esta es una herramienta interna, no una página pública. Las personas que la utilizan son el personal de operaciones, no clientes. Eso condiciona cada decisión: la claridad y la velocidad importan más que el acabado visual de una campaña de marketing. Un responsable de operaciones registrando una entrega a las 7 de la mañana no tiene paciencia para un formulario roto ni para un mensaje de error críptico.

Dos requisitos del brief que es fácil pasar por alto: el formulario de orden de salida debe **mostrar el stock disponible actual** del producto seleccionado antes de que el usuario envíe el formulario, y cualquier respuesta `400` de la API debe mostrar al usuario un **mensaje de error legible** — no un objeto JSON en bruto ni un fallo silencioso.

### Brief del responsable de operaciones

> **De:** Responsable de Operaciones
> **Para:** Unidad Tecnológica
>
> El equipo de backend entregó la API de inventario el sprint pasado — buen trabajo. Ahora necesito la interfaz. Mi equipo no puede usar Postman para registrar entregas.
>
> Esto es lo que necesito en el backoffice:
>
> 1. Una página que muestre todos los productos con su stock actual. Usa código de color — quiero ver de un vistazo qué está bajo.
> 2. Un formulario para registrar una orden de entrada (una entrega recibida).
> 3. Un formulario para registrar una orden de salida (un consumo o salida). Debe mostrar cuánto stock hay disponible antes de que yo envíe, para no registrar más de lo que tenemos.
> 4. Una página de sólo lectura con todas las órdenes — entradas y salidas — con el nombre del producto y quién creó cada una.
>    > Todas estas páginas requieren inicio de sesión. Si un usuario no está autenticado, redirígelo a la página de login.
>    >
>    > **Criterios de aceptación**: las cuatro vistas funcionales, autenticadas, consumiendo datos reales de la API, con gestión correcta de errores en fallos de la API.

### Cómo Empezar el Proyecto

El frontend del backoffice ya existe en tu monorepo. Estás añadiendo la sección de inventario, no creando una nueva aplicación.

1. Abre tu repositorio existente
2. Navega a `uis/backoffice` — aquí vive tu Next.js backoffice.
3. Instala las dependencias si es necesario:
   ```bash
   npm install
   ```
4. Añade la URL base de la API de inventario a tu `.env.local`. Debe apuntar a tu backend en ejecución:
   ```
   NEXT_PUBLIC_INVENTORY_API_URL=http://localhost:8000
   ```
5. Lee tu **company-BRIEFING.md** — los nombres de entidades, etiquetas de campos y vocabulario de dominio deben coincidir con lo que existe en la API y en la interfaz.
6. Asegúrate de que el servicio de backend (`services/`) está ejecutándose localmente antes de probar el frontend.

### Qué Debes Hacer

#### Capa de integración con la API

- [ ] Crea un módulo (p. ej., `lib/inventory.ts`) que centralice todas las llamadas a los endpoints `/inventory`. Ningún componente debe llamar a `fetch` directamente.
- [ ] Todas las peticiones a endpoints protegidos deben incluir la cabecera `Authorization: Bearer <token>`. Lee el token de donde tu sistema de auth existente lo almacena (localStorage, contexto, cookie).
- [ ] Gestiona los errores de la API de forma explícita: si el estado de la respuesta es `4xx` o `5xx`, extrae el mensaje de error del cuerpo de la respuesta y muéstraselo al usuario — nunca ignores los errores en silencio.

#### Página de productos — `/backoffice/inventory/products`

- [ ] Obtén y muestra todos los productos desde `GET /inventory/products`.
- [ ] Muestra el valor de `current_stock` para cada producto junto con los campos específicos de entidad definidos en tu BRIEFING.md.
- [ ] Aplica indicadores visuales de nivel de stock: usa color o iconografía para distinguir el stock saludable del stock bajo. Define tus propios umbrales — documéntalos en un comentario.
- [ ] Incluye un enlace o botón claramente etiquetado en cada fila de producto para crear una orden de entrada o de salida para ese producto.

#### Formulario de orden de entrada — `/backoffice/inventory/orders/inbound`

- [ ] Renderiza un formulario que envíe datos a `POST /inventory/orders/inbound`.
- [ ] El selector de producto debe listar todos los productos disponibles por nombre. No pidas al usuario que escriba un ID en bruto.
- [ ] Tras un envío exitoso, limpia el formulario y muestra un mensaje de confirmación. Ante un `400`/`500`, muestra el mensaje de error de la API en un elemento visible — no solo en la consola.
- [ ] El formulario debe estar protegido: redirige a los usuarios no autenticados a la página de login.

#### Formulario de orden de salida — `/backoffice/inventory/orders/outbound`

- [ ] Renderiza un formulario que envíe datos a `POST /inventory/orders/outbound`.
- [ ] Cuando el usuario selecciona un producto, obtén y muestra su `current_stock` antes de que introduzca una cantidad. Esto debe actualizarse de forma reactiva cuando cambia la selección de producto.
- [ ] Si la cantidad introducida supera el stock mostrado, muestra una advertencia en el cliente antes de que el usuario envíe. Esto es una salvaguarda de UX — la API aplica la regla real.
- [ ] Gestiona el `HTTP 400` de la API (stock insuficiente) mostrando el mensaje de error inline junto al campo de cantidad.

#### Página de historial de órdenes — `/backoffice/inventory/orders`

- [ ] Obtén y muestra todas las órdenes desde `GET /inventory/orders`.
- [ ] Cada fila debe mostrar: nombre del producto, cantidad, tipo de orden (entrada o salida), fecha de creación y el `user_uuid` que la creó.
- [ ] Muestra las órdenes de entrada y de salida con una distinción visual (p. ej., color, icono o etiqueta).
- [ ] Esta página es de sólo lectura. Sin acciones de borrado ni edición.

#### Protección de rutas

- [ ] Las cuatro páginas de inventario deben redirigir a los usuarios no autenticados a la página de login. Usa el mismo patrón de comprobación de auth ya presente en el backoffice.

⚠️ **IMPORTANTE:** Los nombres de entidades, etiquetas de campos y el vocabulario de la interfaz deben coincidir con lo especificado en tu BRIEFING.md — usa el lenguaje de dominio de tu empresa, no los términos genéricos de este README.

### Qué Vamos a Evaluar

- [x] Existe un módulo de integración con la API dedicado — no hay llamadas `fetch` directas dentro de los componentes.
- [x] Todas las peticiones a endpoints protegidos incluyen la cabecera `Authorization` con el token del usuario actual.
- [x] La página de productos carga datos reales de la API y muestra `current_stock` con indicadores visuales de nivel de stock.
- [x] El formulario de orden de entrada envía correctamente y muestra una confirmación o un mensaje de error legible en cada resultado — sin fallos silenciosos.
- [x] El formulario de orden de salida muestra el stock actual del producto seleccionado de forma reactiva, antes de que el usuario envíe.
- [x] El formulario de orden de salida muestra una advertencia en el cliente cuando la cantidad introducida supera el stock disponible.
- [x] Una respuesta `400` del endpoint de salida muestra el mensaje de error de la API de forma visible en la interfaz.
- [x] La página de historial de órdenes muestra todas las órdenes con distinción entrada/salida, nombre de producto, cantidad, fecha y `user_uuid`.
- [x] Las cuatro páginas redirigen a los usuarios no autenticados al login.
- [x] Los nombres de entidades y etiquetas de campos en la interfaz coinciden con la especificación del BRIEFING.md.

### Cómo Entregar

1. Confirma y sube todos los cambios a tu fork.
2. Verifica que `.env.local` está en `.gitignore` — nunca subas URLs de API ni tokens.
3. Envía la URL de tu fork a través de la plataforma del estudiante.

---

## 5. Gestión de Errores Transversal (Auditoría de Error Handling)

Llevas varios hitos construyendo la plataforma de tu empresa: un sitio web corporativo, un frontend en Next.js, un backend en Python/FastAPI y scripts que procesan datos reales. El repositorio crece — y con él, la superficie donde las cosas pueden fallar.

Tu tech lead ha abierto un ticket de revisión de código con un mensaje claro: el sistema no tiene una estrategia coherente de gestión de errores. Las llamadas a la API pueden fallar en silencio, faltan estados de carga, los usuarios ven mensajes técnicos crudos (o simplemente nada), y los scripts de fondo se rompen sin dejar rastro útil. Antes de que el siguiente hito introduzca más complejidad, el equipo necesita corregir esto.

Tu tarea es auditar todo el repositorio existente y aplicar una estrategia de gestión de errores consistente en todas las capas: frontend, backend y scripts.

> El tech lead ha compartido las siguientes notas en el ticket:
>
> #### Lo que necesitamos
>
> - Ningún error debe romper la aplicación ni dejar al usuario en un estado indefinido.
> - Toda operación asíncrona en el frontend debe tener tres estados visibles: cargando, éxito y error.
> - Los mensajes de error que ve el usuario deben ser legibles — nunca un stack trace, un código de estado o un error de parseo de JSON en crudo.
> - Todo estado de error debe ofrecer una salida clara: un botón de reintentar, un enlace a la página principal o instrucciones para contactar soporte.
> - En el backend y los scripts, las excepciones deben capturarse en el ámbito correcto — no con un único try/catch que envuelva toda la función.
> - Nunca debe aparecer información sensible en la salida de errores enviada al cliente.

Esta es una tarea de ingeniería transversal — no una nueva funcionalidad. El entregable es una versión más limpia y robusta del repositorio que ya has construido. Al terminar este proyecto, cualquier usuario que encuentre un problema en tu plataforma sabrá qué ha pasado y qué puede hacer.

### Qué debes hacer

#### Frontend (Next.js / TypeScript)

- [ ] Identifica todas las llamadas `fetch` o a la API en el frontend y verifica que cada una tenga un bloque `try/catch` específico para esa llamada.
- [ ] Para cada operación asíncrona que cargue datos, implementa el **patrón de UI de tres estados**: cargando (spinner o skeleton), éxito (datos visibles), error (mensaje con llamada a la acción).
- [ ] Reemplaza cualquier mensaje de error en crudo (`Error 500`, `Unexpected token`, etc.) por una explicación legible para el usuario.
- [ ] Asegúrate de que todo estado de error incluya una **llamada a la acción** clara: un botón de reintentar, un enlace a la página principal o un prompt para contactar soporte.
- [ ] Usa `optional chaining` (`?.`) al acceder a propiedades anidadas que podrían ser `undefined`.
- [ ] Añade `defaults` o `fallbacks` seguros para valores que podrían ser `null` o `undefined` al renderizar.
- [ ] Usa bloques `finally` para asegurar que los estados de carga siempre se limpien, independientemente del resultado.

#### Backend (Python / FastAPI)

- [ ] Revisa cada handler de ruta y asegúrate de que las excepciones se capturen en el ámbito correcto — evita bloques `try/except` grandes que engullen todos los errores.
- [ ] Devuelve respuestas HTTP de error apropiadas (`400`, `404`, `422`, `500`) con un cuerpo JSON limpio y estructurado — sin tracebacks de Python en crudo.
- [ ] Asegúrate de que las respuestas de error **no** exponen datos sensibles (cadenas de conexión a base de datos, rutas internas, claves secretas).
- [ ] Añade gestión de errores a todas las llamadas a APIs externas que se hagan desde el backend (por ejemplo, llamadas a un LLM o a un servicio de terceros).

#### Scripts (Python)

- [ ] Envuelve las operaciones de lectura/escritura de archivos y el parseo de CSV en bloques `try/except` con mensajes de error informativos impresos en `stderr`.
- [ ] Asegúrate de que los scripts terminan con un código distinto de cero (`sys.exit(1)`) cuando ocurre un error crítico.
- [ ] Añade comprobaciones defensivas para datos de entrada faltantes o malformados antes de que comience el procesamiento.

#### General

- [ ] Revisa el código base en busca de `console.error` o sentencias `print` que expongan información interna sensible y elimínalos o reemplázalos.

⚠️ **IMPORTANTE:** No introduzcas nuevas funcionalidades ni refactorices código que no esté relacionado con la gestión de errores. El alcance de este proyecto es estrictamente la resiliencia y la comunicación de errores del código existente.

### Qué vamos a evaluar

- [ ] Todas las operaciones asíncronas del frontend implementan el patrón de UI de tres estados (cargando / éxito / error).
- [ ] Los mensajes de error mostrados al usuario son legibles e incluyen una llamada a la acción.
- [ ] Los bloques `try/catch` y `try/except` están acotados a operaciones específicas, no envuelven funciones enteras.
- [ ] Los bloques `finally` se usan correctamente para limpiar el estado de carga.
- [ ] El `optional chaining` y los `fallbacks` se aplican donde corresponde para evitar errores de renderizado por valores `undefined`.
- [ ] Las rutas del backend devuelven respuestas de error estructuradas y limpias con los códigos HTTP correctos.
- [ ] Ninguna información sensible aparece en la salida de errores entregada al cliente.
- [ ] Los scripts de Python gestionan errores de I/O y terminan con códigos de salida apropiados en caso de fallo.

> Nota: La evaluación se centra en la corrección y consistencia de los patrones de gestión de errores — no en si se añadieron nuevas funcionalidades.

### Cómo entregar

Sube tu rama `feature/error-handling-audit` a GitHub y comparte la URL del pull request (o del repositorio) con tu instructor según las instrucciones de entrega de tu cohorte.

---

## 6. Auditoría de Rendimiento Frontend

> 📌 Estás construyendo sobre la empresa seleccionada al inicio del curso — no en un repositorio nuevo.

El sitio corporativo y el backoffice de tu empresa están en producción. El equipo está satisfecho con las funcionalidades, pero el CTO acaba de dejar un mensaje en el canal de desarrollo: el equipo debería buscar mejoras de rendimiento — tanto para apoyar un mejor SEO en el sitio corporativo como para asegurar que el backoffice funcione bien para las personas que lo usan a diario. Antes del siguiente hito, necesitas auditar ambos frontends, identificar qué está arrastrando el rendimiento, aplicar las correcciones necesarias y documentar todo con el rigor que se espera en un codebase profesional.

Esto no se trata de hacer las cosas más bonitas. Se trata de hacerlas rápidas, medibles y mantenibles.

Una buena auditoría de rendimiento sigue un ciclo claro: **medir → analizar → corregir → volver a medir**. Ejecutarás Lighthouse antes de tocar una sola línea de código, luego revisarás el codebase para identificar qué puede mejorarse — incluyendo componentes o lógica que aparecen más de una vez y deberían extraerse en unidades reutilizables. Instalarás un conjunto de skills de agente diseñadas específicamente para guiar la corrección de problemas de web vitals, aplicarás las correcciones que recomienden, y cerrarás el ciclo con una segunda ejecución de Lighthouse para validar el trabajo realizado.

> Tu CTO ha dejado la siguiente nota en el gestor de tareas del equipo:
>
> #### Auditoría de rendimiento — ambos frontends
>
> - Ejecuta Lighthouse en el sitio corporativo y en el backoffice. Registra las puntuaciones iniciales (Performance, Accessibility, Best Practices, SEO).
> - Revisa el codebase. Identifica componentes o bloques de lógica que estén duplicados entre archivos y puedan refactorizarse en un componente compartido o un Custom Hook.
> - En caso de necesitarlo, puedes instalar alguna de las siguientes skills de agente para guiar el proceso de corrección:
>   - [core-web-vitals](https://www.skills.sh/addyosmani/web-quality-skills/core-web-vitals)
>   - [performance](https://www.skills.sh/addyosmani/web-quality-skills/performance)
>   - [web-perf (Cloudflare)](https://www.skills.sh/cloudflare/skills/web-perf)
> - Aplica las correcciones que las skills identifiquen como necesarias.
> - Entregables:
>   - Un archivo `AUDIT.md` con el análisis: puntuaciones iniciales, problemas identificados y causa raíz de cada uno.
>   - Un archivo `REPORT.md` con las mejoras aplicadas y su impacto medido sobre las puntuaciones originales.
>   - Capturas de pantalla de Lighthouse antes y después de los cambios, con commit en el repositorio.

El objetivo no es un 100 perfecto. El objetivo es un ciclo de mejora documentado y basado en evidencia — el mismo que repetirás a lo largo de toda tu carrera cada vez que pongas en producción un frontend.

### ¿Qué hace útil una auditoría de Lighthouse?

Lighthouse analiza **una página a la vez** — no recorre toda la aplicación. Una sola ejecución en la página de inicio no dice nada sobre el rendimiento de una vista de dashboard con carga intensiva de datos. Al auditar una aplicación con múltiples vistas, ejecuta Lighthouse en las páginas que más importan: aquellas con mayor complejidad visual, más componentes renderizados a la vez, o mayor tráfico de usuarios. En el sitio corporativo suelen ser la home y cualquier página con mucho contenido; en el backoffice, normalmente el dashboard principal o cualquier vista con tablas, gráficos o datos en tiempo real.

Lighthouse te entrega cuatro puntuaciones: **Performance**, **Accessibility**, **Best Practices** y **SEO**. Para un frontend en producción, los benchmarks que más importan son:

- **Performance ≥ 90** — Por debajo de 50 se considera deficiente y afecta a usuarios reales en redes móviles.
- **LCP (Largest Contentful Paint) < 2.5s** — Tiempo hasta que el contenido principal es visible.
- **CLS (Cumulative Layout Shift) < 0.1** — Movimiento inesperado del layout durante la carga.
- **FID / INP (Interaction to Next Paint) < 200ms** — Capacidad de respuesta a la interacción del usuario.
- **TTFB (Time to First Byte)** — Tiempo hasta que el servidor empieza a enviar la respuesta HTML.

Un informe completo de Lighthouse puede resultar abrumador las primeras veces — decenas de auditorías, oportunidades y diagnósticos en una sola pantalla. **No intentes corregir todo de golpe.** Una forma práctica de recorrerlo:

1. **Empieza por los indicadores principales** — las cuatro puntuaciones Core Web Vitals más las señales de servidor como **TTFB**, **LCP**, **CLS** e **INP**. Te dicen _dónde_ duele (red, render, layout, interactividad) antes de entrar en cada sub-auditoría.
2. **Apóyate en el agente de IA como tutor** — pega o describe una métrica cada vez y pregunta qué mide, qué se considera "bueno" y qué correcciones suelen moverla. Paso a paso: entiende el indicador y luego las acciones recomendadas para _tu_ stack (Next.js, imágenes, fuentes, hidratación, etc.).
3. **Resuelve un caso por commit** — elige el KPI de mayor impacto, aplica un cambio dirigido, haz commit con un mensaje claro, vuelve a ejecutar Lighthouse en la misma URL y anota la diferencia. Repite hasta que los KPI principales estén en rango saludable.
4. **Después aborda lo complementario** — avisos de accesibilidad, best practices, oportunidades de SEO y auditorías de menor prioridad importan, pero _después_ de las métricas que afectan de verdad a usuarios en dispositivos lentos.

Causas habituales que los estudiantes pasan por alto: imágenes sin optimizar, recursos que bloquean el render, layout shifts por atributos `width`/`height` ausentes en imágenes, fuentes cargadas sin `display: swap`, y problemas de hidratación en Next.js.

### Cómo iniciar el proyecto

Este proyecto no utiliza una nueva plantilla de inicio. Trabajas dentro de tu monorepo de empresa existente.

1. Abre tu monorepo en Codespaces o clónalo localmente.
2. Compila y sirve **ambos** frontends en **modo producción** antes de cualquier ejecución de Lighthouse. En cada aplicación (o con los scripts del monorepo), ejecuta el build de producción y arranca el servidor de producción — normalmente `npm run build` y después `npm run start` (o el equivalente del monorepo). **No** audites con `npm run dev` / `next dev`: el modo desarrollo sesga las métricas (sin minify real, Strict Mode, HMR, etc.) y oculta mejoras reales. Next.js indica que los informes precisos requieren una compilación de producción.
3. Abre Chrome o Brave — Lighthouse está disponible de forma nativa en las DevTools (pestaña Lighthouse).
4. Toma tus primeras capturas de pantalla antes de modificar nada.

### Qué debes hacer

#### Medición inicial

⚠️ **IMPORTANTE:** Todas las ejecuciones de Lighthouse (antes y después) deben hacerse contra el servidor de **producción** (`build` + `start`). Un informe tomado con `npm run dev` no es válido para este proyecto.

- [x] Ejecuta Lighthouse en el sitio corporativo en modo **escritorio y móvil** — como mínimo en la página de inicio, más cualquier otra vista que consideres suficientemente compleja para auditar. Registra las cuatro puntuaciones por página y por modo.
- [x] Ejecuta Lighthouse en el backoffice — como mínimo en el dashboard principal o la vista con más elementos. Registra las cuatro puntuaciones por página.
- [x] Toma capturas de pantalla de ambos informes y realiza un commit en la carpeta `/audit/before/` del repositorio.

#### Análisis del código

- [x] Revisa ambos frontends e identifica al menos dos casos en los que un componente o bloque de lógica se repita y pueda extraerse en un componente compartido o un Custom Hook.
- [x] Documenta cada caso en `AUDIT.md`: dónde aparece, por qué es candidato a refactorización y cómo quedaría la abstracción compartida.

#### Instalación de skills de agente

- [x] En caso de necesitarlo, instala una o más de las skills de agente indicadas por el CTO:
  - `https://www.skills.sh/addyosmani/web-quality-skills/core-web-vitals`
  - `https://www.skills.sh/addyosmani/web-quality-skills/performance`
  - `https://www.skills.sh/cloudflare/skills/web-perf`
- [x] Ejecuta el agente sobre ambos frontends y registra las correcciones que identifica.

#### Correcciones

- [x] Prioriza los KPI principales (TTFB, LCP, CLS, INP, puntuación de Performance) antes que auditorías secundarias de Lighthouse; usa el agente para interpretar un indicador cada vez.
- [x] Aplica correcciones de forma incremental — **un problema por commit**, y vuelve a ejecutar Lighthouse en la misma URL tras cada cambio para confirmar el impacto.
- [x] Aplica las correcciones que las skills de agente clasifiquen como correcciones requeridas (no sugerencias).
- [x] Aplica las refactorizaciones identificadas durante el análisis del código — extrae al menos un componente reutilizable o Custom Hook.

#### Medición final

- [x] Vuelve a ejecutar Lighthouse en ambos frontends tras las correcciones.
- [x] Toma nuevas capturas de pantalla y realiza un commit en `/audit/after/`.

#### Entregables

- [x] Escribe `AUDIT.md` con: puntuaciones iniciales de Lighthouse, problemas identificados con explicación de causa raíz para cada uno, y el análisis de refactorización.
- [x] Escribe `REPORT.md` con: descripción de cada corrección aplicada, comparativa de puntuaciones antes/después, y tu valoración de qué tuvo mayor impacto.
- [x] Realiza un commit de ambos archivos markdown y todas las capturas de pantalla en el repositorio.

⚠️ **IMPORTANTE:** No reestructures la arquitectura de ninguno de los frontends para pasar esta auditoría. Aplica correcciones dirigidas. El objetivo es la mejora, no una reescritura.

### Qué vamos a evaluar

- [x] Lighthouse se ejecutó en ambos frontends antes y después **en modo producción** (`build` + `start`, no `dev`), con capturas de pantalla con commit en el repositorio.
- [x] `AUDIT.md` identifica problemas concretos con razonamiento sobre causa raíz — no solo una lista de lo que Lighthouse marcó.
- [x] Al menos un componente reutilizable o Custom Hook fue extraído e integrado en el codebase.
- [x] `REPORT.md` muestra una mejora medible en al menos una puntuación de Lighthouse por frontend.
- [x] Si se instalaron skills de agente, hay evidencia de su uso en el proceso de corrección.
- [x] Las correcciones aplicadas atacan causas reales (optimización de imágenes, layout shift, problemas de hidratación) y no cambios superficiales que inflan las puntuaciones sin resolver el problema subyacente.
- [x] La calidad del código se mantiene tras la refactorización — sin funcionalidades rotas ni regresiones.

> Nota: Obtener una puntuación de 100 no es un criterio de evaluación. La mejora basada en evidencia y la calidad del análisis sí lo son.

### Cómo entregar

Sube tus cambios a tu monorepo de empresa en GitHub y comparte la URL del repositorio según las instrucciones de tu instructor. Asegúrate de que `AUDIT.md`, `REPORT.md` y la carpeta `/audit/` con todas las capturas de pantalla estén incluidos en el commit final.

---

## 7. Contenedorización y Despliegue del Monorepo

El monorepo ya está en marcha: el equipo ha construido los frontends en Next.js, el servicio API en FastAPI y los scripts de soporte. Todo funciona en tu máquina. El problema es que sólo funciona en tu máquina.

El equipo de infraestructura ha elevado una RFP interna al squad: cada vez que un nuevo desarrollador se incorpora, la puesta en marcha tarda horas entre conflictos de versiones de Node y Python, dependencias globales instaladas de formas distintas y pasos de configuración que nadie ha documentado del todo. El objetivo de este proyecto es resolver eso de raíz: **el entorno de desarrollo debe definirse en código, versionarse junto al proyecto y ejecutarse de forma idéntica en cualquier máquina del equipo sin configuración manual**.

Tu tech lead ha asignado el ticket al squad. El brief es directo: dockerizar el monorepo completo para desarrollo. Los dos frontends — el sitio público (`/uis/website`) y el panel interno (`/uis/backoffice`) — deben ejecutarse desde un **único contenedor de interfaces**. El servicio FastAPI va en su propio contenedor. Ambos tienen que arrancar con recarga en caliente, leer su configuración de variables de entorno, y comunicarse entre sí por nombre de servicio dentro de la red Docker — no por `localhost`.

Compose en local no basta. Cuando los contenedores funcionen, también debes **desplegarlos a producción** en el **VPS que ya tienes** de etapas anteriores del programa — el mismo servidor que usas para otra infraestructura de la empresa. El stack del monorepo tiene que estar accesible ahí, no solo en tu portátil.

> **Brief técnico — Ticket #infra-40**
>
> El equipo necesita entornos de desarrollo reproducibles. Cada vez que alguien nuevo clona el repositorio, la puesta en marcha se convierte en una sesión de depuración de dependencias.
>
> **Alcance**: dockerizar `/uis` (website + backoffice en un único contenedor de interfaces con recarga en caliente) y `/services` (FastAPI con `--reload`). La orquestación se gestiona con Docker Compose. Después despliega esos contenedores a **producción en tu VPS existente**.
>
> **Criterio de aceptación**: cualquier miembro del equipo puede ejecutar `docker compose up` desde la raíz del repositorio y tener toda la plataforma operativa sin pasos adicionales; el mismo stack también está **en producción en tu VPS**.
>
> Los servicios se comunican entre sí **por nombre de servicio Docker**, no por `localhost`. Revisa todas las URLs de conexión entre servicios antes del sign-off.

> 🔀 **Una vez aprobado tu PR, haz merge a `main`.** `main` es el código que desplegamos en nuestros servidores, así que una funcionalidad aprobada que se queda en su rama nunca llega a la empresa. Dejarla sin integrar puede parecer inofensivo, pero es contraproducente: tu siguiente funcionalidad parte de código desactualizado y esa diferencia se convierte en conflictos de merge más adelante.

### Cómo empezar

1. Asegúrate de tener Docker Desktop (o Docker Engine + Docker Compose CLI v2) instalado y en ejecución.
3. Revisa la estructura actual del monorepo. Deberás crear archivos `Dockerfile` y `.dockerignore` en `/uis/` y en `/services/`. El archivo `docker-compose.yml` va en la raíz del repositorio.
4. Crea un archivo `.env` en la raíz antes de escribir ningún `docker-compose.yml`. Las variables de entorno concretas de tu proyecto ya las conoces — llevas semanas trabajando con ellas.
5. Confirma acceso SSH al **VPS que ya tienes** — ahí desplegarás los contenedores del monorepo a producción cuando Compose funcione en local.

### Lo que debes hacer

#### Dockerfile de interfaces (`/uis/Dockerfile`)

- [ ] Crea un `Dockerfile` en `/uis/` basado en una imagen oficial de Node (Alpine). Debe instalar las dependencias de `/uis/website` y `/uis/backoffice` por separado.
- [ ] El `CMD` por defecto del Dockerfile debe invocar un script `start.sh` que arranque ambas aplicaciones Next.js en puertos distintos (`website` en el 3000, `backoffice` en el 3001).
- [ ] Crea un `.dockerignore` en `/uis/` que excluya al menos: `node_modules`, `.next`, `.env*` y `*.log`.

#### Dockerfile del backend (`/services/Dockerfile`)

- [ ] Crea un `Dockerfile` en `/services/` basado en una imagen oficial de Python. Debe instalar `uv`, instalar las dependencias desde `requirements.txt` con `uv pip install -r requirements.txt` y arrancar el servidor Uvicorn con `--reload` habilitado.
- [ ] Crea un `.dockerignore` en `/services/` que excluya al menos: `__pycache__`, `*.pyc`, `.env*`, `tests/` y `*.log`.

#### Docker Compose (`docker-compose.yml`)

- [ ] Crea `docker-compose.yml` en la raíz con dos servicios: el servicio de interfaces (build desde `/uis/`, con bind mount sobre el código fuente y comando `next dev` para ambas apps) y el servicio de backend (build desde `/services/`, con bind mount y `--reload`).
- [ ] Expón los puertos correctos en cada servicio para que sean accesibles desde el host.
- [ ] Conecta ambos servicios en una red Docker con nombre definido explícitamente. Verifica que las URLs de conexión entre servicios usan el nombre del servicio como host, no `localhost`.

> 🔐 **Nunca incluyas secretos reales, API keys ni contraseñas en `docker-compose.yml` ni en ningún `Dockerfile`.** Estos archivos se versionan en Git y cualquier persona con acceso al repositorio los podrá leer. Las credenciales van exclusivamente en `.env`, que debe estar en `.gitignore`. Si accidentalmente commiteas un secreto, considera que está comprometido y rótalo inmediatamente.

- [ ] Define todas las variables de entorno de cada servicio mediante un archivo `.env` en la raíz del repositorio (no hardcodeadas en el YAML).
- [ ] Confirma que `.env` está en el `.gitignore` del repositorio.

#### Despliegue a producción (tu VPS)

- [ ] Despliega los contenedores del monorepo a **producción en tu VPS**.
- [ ] En el VPS, los contenedores de interfaces y backend están en marcha y accesibles (misma idea de stack Compose que en local; las variables de producción viven en el VPS, no en Git).

### Lo que evaluaremos

- [ ] `docker compose up` desde la raíz levanta la plataforma completa sin errores y sin pasos adicionales de configuración.
- [ ] Los cambios en el código del host se reflejan en el navegador sin reconstruir la imagen (bind mounts funcionando en ambos servicios).
- [ ] El servicio de interfaces arranca ambas aplicaciones Next.js en puertos distintos (3000 y 3001) desde un único contenedor.
- [ ] Los servicios se comunican internamente por nombre de servicio Docker, no por `localhost` ni por IP hardcodeada.
- [ ] No hay secretos, API keys ni contraseñas hardcodeadas en ningún `Dockerfile` ni en `docker-compose.yml`.
- [ ] El archivo `.env` está en el `.gitignore` y no aparece en el historial de commits.
- [ ] Existen archivos `.dockerignore` en `/uis/` y en `/services/`.
- [ ] Los contenedores del monorepo están **desplegados y en producción en tu VPS existente** (no solo en tu portátil).

### Cómo entregar

1. Sube todos los cambios a tu rama en GitHub.
2. Abre un Pull Request desde tu rama hacia `main`.
3. Incluye en la descripción del PR una captura de pantalla mostrando los contenedores en local (`docker compose ps` o la salida de `docker compose up`).
4. Incluye evidencia de que el mismo stack está **en producción en tu VPS** (p. ej. `docker compose ps` por SSH, o una URL / captura de las apps en vivo).
5. Comparte el enlace del PR con tu tech lead para el sign-off final.

---

## 8. Auditoría de Serialización del Backend

### Cómo iniciar el proyecto

Este proyecto se construye sobre el monorepo existente de tu empresa. No necesitas buscar un repositorio nuevo.

1. Abre tu monorepo en tu entorno de desarrollo (Codespaces o local).
2. Navega a tu aplicación FastAPI — normalmente en `/apps/<nombre-de-tu-app>/` o en la carpeta de backend establecida en hitos anteriores.
3. Asegúrate de que su entorno esté en funcionamiento y sus puntos finales existentes sean accesibles antes de comenzar la auditoría.

Trabaja en una rama dedicada: `git switch -c feature/serialization-audit`.

El backend que lleva semanas construido está a punto de recibir usuarios reales. Antes de eso, tu CTO ha identificado un problema crítico: varios endpoints de la API devuelven objetos de base de datos sin ningún control de forma, sin filtrado de campos y sin protección frente a la exposición de campos internos del modelo. En un entorno de demostración con poco tráfico, esto es invisible. A escala, genera cuellos de botella de rendimiento, riesgos de seguridad y contratos frágiles con el cliente.

Tu tarea es liderar una auditoría de serialización del backend. El objetivo no es reescribir nada desde cero, sino inspeccionar cada endpoint existente con criterio técnico y llevar la API a estándares de producción.

Tu CTO ha compartido la siguiente sesión informativa:

> #### Qué necesitamos
>
> - Una auditoría escrita que identifique cada punto final y su estado de serialización actual.
> - Una clasificación de cada punto final: cuáles exponen campos innecesarios, cuáles carecen de un esquema de respuesta definido y cuáles ya están bien definidos.
> - Para cada punto final que requiera trabajo, una nota sobre *qué tipo* de mejora es necesaria, no solo "necesita serializador", sino *por qué* y *cómo debería ser la carga útil de salida*.
>
> #### Entregable mínimo
>
> Cada endpoint de la API debe tener un serializador de respuesta explícito definido antes de que esta tarea se considere completada. Ningún punto final debe devolver un objeto ORM en crudo.
>
> #### Qué significa hacerlo bien
>
> Más allá del mínimo, espero optimización del payload donde importa: relaciones anidadas aplanadas cuando el cliente no necesita el objeto completo, endpoints de listado que devuelven solo los campos que los consumidores realmente usan, y endpoints de escritura que aceptan únicamente los campos que deben aceptar.

Este es el tipo de revisión que diferencia una API que funciona de una API en la que se puede confiar. Asume la responsabilidad de toda la superficie de tu backend y llévala al nivel que merecen tu frontend — y tus usuarios.

### ¿Qué son los serializadores y por qué importan aquí?

Los serializadores definen el contrato entre tu backend y todo lo que lo consume. En FastAPI, los modelos Pydantic cumplen este rol: validan la entrada, dan forma a la salida y hacen que el comportamiento de la API sea explícito y testeable. Sin ellos, tu API devuelve implícitamente lo que produce el ORM, lo que puede incluir ID internas, contraseñas hasheadas, ruido relacional y nombres de campos inestables. Con alto tráfico, esto también significa serializar más datos de los que el cliente jamás solicitó.

Una capa de serializadores bien diseñada implica:

- Los clientes reciben solo lo que necesitan: cargas útiles más pequeñas, respuestas más rápidas.
- Los cambios internos del modelo no rompen el contrato de la API — el serializador absorbe la diferencia.
- Los campos sensibles nunca se exponen accidentalmente — el esquema es la fuente de verdad.

Al auditar, piensa en tres niveles: *qué recibe este endpoint*, *qué debería devolver* y *qué está devolviendo realmente hoy*.

### Decidir qué debe exponer cada punto final

Antes de elegir un esquema, aclara qué necesita realmente el consumidor de esa ruta — no qué tiene el modelo en base de datos.

Pregunta por cada endpoint:

* ¿Quien lo llama? ¿Un listado, una vista de detalle, otro servicio o una confirmación tras un escrito?
* ¿Qué usa la UI o el cliente? Sigue el frontend (o consumidor de la API) y anota los campos que lee — ignora las columnas del modelo que la pantalla nunca muestra.
* ¿Qué debe quedarse interno? Credenciales, tokens, claves foráneas solo server-side, timestamps de auditoría, flags de borrado lógico, etc.

Luego elige cómo serializar:

General vs explícito: mapear un modelo con `from_attributes=True` es cómodo cuando cada campo listado es intencional. Ante la duda — listados, flujos de autenticación o consumidores distintos — conviene nombrar cada atributo en el esquema para que la auditoría diga exactamente qué expone la API. Registra esa lista objetivo en `docs/serialization-audit.md` por cada punto final que modifique.

🔀 PR aprobado → haz merge a `main`. Si no, la funcionalidad no se despliega y tu siguiente rama parte de código desactualizado, lo que acaba en conflictos de merge.

### Qué debes hacer

#### Fase 1 — Auditoría

Consejo: Un buen punto de partida es la autenticación — rutas como registro, login y restauración/restablecimiento de contraseña suelen ser las de mayor riesgo: un objeto ORM de usuario en crudo puede filtrar `hashed_password`, y los handlers de auth a menudo devuelven más de lo que el cliente necesita.

Al revisar las respuestas de autenticación, estas comprobaciones suelen detectar problemas rápidamente:

* Evita devolver contraseñas — en texto plano o hasheadas — en el cuerpo de cualquier respuesta.
* Valora limitar el correo electrónico en respuestas de autenticación: registro, inicio de sesión y restauración de contraseña suelen funcionar mejor cuando devuelven solo lo que el cliente necesita a continuación (por ejemplo, un token, un mensaje genérico de confirmación o una proyección segura del usuario sin campos de credenciales). El correo electrónico suele ir en el cuerpo de la petición; reenviarlo en la respuesta merece cuestionarse salvo que tu auditoría documente el motivo.

Puedes anotar las rutas de autenticación al inicio de `docs/serialization-audit.md` antes de seguir con el resto de la API.

* Lista todos los puntos finales de tu aplicación FastAPI (ruta, método y propósito).
* Para cada endpoint, documenta su comportamiento de respuesta actual: ¿usa `response_model`? ¿Devuelve un objeto ORM en crudo, un dict o un esquema tipado?
* Clasifica cada endpoint en uno de estos tres estados:
  * ✅ Ya serializado — tiene un `response_model` explícito y el esquema es adecuado.
  * ⚠️ Parcialmente serializado — tiene un modelo de respuesta pero está incompleto, expone campos innecesarios o no coincide con lo que necesita el cliente.
  * ❌ Sin serializar — devuelve un objeto ORM en crudo o un dict sin tipado.
* Registra los resultados de la auditoría en un archivo Markdown en `docs/serialization-audit.md`.

#### Fase 2 — Implementación

* Crea o actualiza los esquemas Pydantic para cada punto final clasificado como ❌ o ⚠️.
* Asegúrate de que cada punto final tenga un `response_model` explícito declarado en su decorador de ruta.
* Para endpoints de listado: define un esquema que devuelva solo los campos que los consumidores necesitan. Evita devolver objetos anidados completos cuando una representación plana es suficiente.
* Para puntos finales de escritura (POST, PUT, PATCH): define un esquema de entrada separado que acepte únicamente los campos que deben poder escribirse. No reutilices el esquema de respuesta como esquema de entrada.
* Asegúrate de que ningún endpoint exponga campos sensibles (por ejemplo, contraseñas hasheadas, tokens internos, claves foráneas en bruto cuando haya un objeto anidado disponible). Las rutas de autenticación (registro, inicio de sesión, olvidé/restablecer contraseña) nunca deben devolver contraseñas ni correo electrónico en el cuerpo de la respuesta. `GET /auth/me` sí puede devolver el email del propio llamante — la vista de perfil depende de ello.
* Cuando una relación sea necesaria en la respuesta, decide explícitamente: devolver el objeto anidado completo, devolver solo el ID relacionado o devolver una proyección plana — y documenta esa decisión en tu archivo de auditoría.

#### Fase 3 — Verificación

* Confirma que todos los endpoints siguen pasando las pruebas existentes tras los cambios de esquema.
* Prueba manualmente al menos tres endpoints usando la documentación interactiva de FastAPI (`/docs`) y verifica que la forma de la respuesta coincida con el esquema definido.
* Actualiza el documento de auditoría para marcar todos los endpoints como ✅ una vez completada la implementación.

### Qué vamos a evaluar

1. Cada punto final de la aplicación tiene un `response_model` explícito declarado.
2. Los esquemas Pydantic están definidos tanto para entrada como para salida donde corresponde — los esquemas de entrada y salida no se confunden entre sí.
3. Los esquemas de endpoints de listado devuelven solo los campos necesarios para el consumidor — sin anidado innecesario ni over-fetching.
4. Ningún endpoint expone contraseñas hasheadas ni tokens internos en su esquema de respuesta. Los flujos de autenticación no autenticados (registro, inicio de sesión, olvido/reinicio) no reenvían el correo electrónico. `GET /auth/me` puede devolver el email del usuario autenticado.
5. El documento de auditoría de serialización (`docs/serialization-audit.md`) existe, lista todos los endpoints, su estado original y los cambios aplicados.
6. La aplicación sigue funcionando correctamente después de todos los cambios de esquema — sin regresiones.

> Nota: La calidad del documento de auditoría se evalúa como un entregable en sí mismo. Una implementación completa sin registro de auditoría no es suficiente.

### Cómo entregar

Una vez finalizado, sube la rama a GitHub y abre un pull request contra `main` con el título `feat: serialization audit and implementation`. Y comparte la URL del PR según las instrucciones para entregarlo.

---

## Notas de implementación relacionadas

- **Containerización (implementación)**: ver [docs/CONTAINERIZATION.es.md](./CONTAINERIZATION.es.md) para detalles ya aplicados del stack Docker de Nexova (`nexova-platform`, healthchecks, despliegue en VPS, verificación con Playwright).
- **Contexto de empresa (dominio Nexova)**: ver [CONTEXT.md](../CONTEXT.md) — entidades de inventario (`TalentAsset`, `TalentEntry`, `TalentExit`), reglas de negocio y datos semilla.
- **Auditoría de serialización (entregable)**: el registro de la auditoría de endpoints asociada al hito 8 se documenta en `docs/serialization-audit.md`.
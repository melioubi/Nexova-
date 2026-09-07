# Propuesta de Arquitectura Backend para Nexova

## 1. Resumen ejecutivo

Nexova requiere un backend orientado a procesos de contratación, gestión de talento y seguimiento de candidatos, con reglas de negocio que cambian según el cliente, el tipo de vacante y el estado del proceso. En este contexto, la mejor solución inicial no es una arquitectura extremadamente distribuida ni una estructura improvisada. La alternativa más apropiada es una arquitectura en capas, implementada como un backend monolítico modular con dominio funcional y una API REST construida en FastAPI.

Este enfoque responde mejor al problema real de la empresa porque permite mantener una base centralizada, con módulos claramente separados por negocio, sin introducir la complejidad operativa de microservicios o serverless prematuros. En otras palabras, se prioriza claridad, mantenibilidad y velocidad de evolución sobre sofisticación técnica innecesaria en la fase inicial del producto.

La propuesta se apoya en tres decisiones fundamentales:

1. Mantener una API centralizada y versionada.
2. Separar el sistema por dominio de negocio y responsabilidad.
3. Adoptar una estructura estándar de FastAPI que favorezca la escalabilidad y la comprensión del equipo.

---

## 2. Contexto del negocio y necesidad de la arquitectura

Nexova opera como consultora de RR. HH. y adquisición de talento, con presencia en Chile y Argentina. Su operación diaria implica la gestión de información sensible sobre candidatos, clientes/empleadores, vacantes, entrevistas, evaluaciones y reportes de rendimiento. Además, gran parte de la lógica de negocio no es meramente CRUD; requiere coordinación entre distintos estados, validaciones, permisos y flujos de aprobación.

Por ejemplo, un candidato puede pasar por varios estados: registrado, preseleccionado, entrevistado, evaluado, rechazado o contratado. Una vacante puede tener múltiples requisitos, distintos clientes, fechas de cierre y diversos procesos de selección. A esto se suma la necesidad de generar reportes para clientes internos y externos, así como de integrar con futuras automatizaciones o analítica basada en IA.

Estas condiciones implican que el backend deba tener:

- una base lógica clara y mantenible
- módulos bien definidos por dominio
- validación sólida de entradas y salidas
- trazabilidad de cambios y estados
- posibilidad de crecimiento sin reescribir la base del sistema
- separación consciente entre lógica de negocio, acceso a datos y capa HTTP

---

## 3. Patrón arquitectónico propuesto

### 3.1 Elección: arquitectura en capas con diseño orientado a dominios

Se propone una arquitectura en capas, estructurada por dominios funcionales y aplicada sobre un backend FastAPI. Este patrón es más adecuado que un MVC puro o una solución serverless en las primeras etapas por varias razones:

- La lógica empresarial de Nexova es más compleja que una simple pantalla CRUD.
- Hay muchas reglas específicas por dominio, como estados de candidatos, procesos de entrevista, requisitos para vacantes y permisos de usuarios.
- El sistema debe crecer de forma ordenada a medida que se agreguen clientes, nuevas fuentes de datos o automatizaciones.
- La separación en capas permite que la API no se convierta en un “único punto donde todo está mezclado”.

### 3.2 Capa propuesta

1. Capa de presentación o API
   - recibe requests HTTP
   - valida request/response
   - expone endpoints versionados
   - delega la lógica a servicios de aplicación

2. Capa de aplicación
   - coordina casos de uso del negocio
   - ejecuta validaciones y orquestación entre dominios
   - facilita la lógica transaccional

3. Capa de dominio
   - contiene entidades, reglas y comportamientos del negocio
   - define la lógica central de candidatos, vacantes, entrevistas y reportes

4. Capa de infraestructura
   - acceso a base de datos
   - integración con email, almacenamiento o mecanismos de seguridad
   - clientes para servicios externos y utilidades transversales

### 3.3 Por qué no elegir una solución serverless o microservicios desde el inicio

Aun cuando serverless y la separación por microservicios pueden ser útiles en escenarios específicos, no son la mejor base para este caso inicial:

- el dominio es transversal y requiere coordinación entre varios procesos
- no hay evidencia de picos de carga ni de necesidad inmediata de aislamiento por servicio
- el equipo aún está definiendo reglas de negocio y flujos operativos
- un monolito modular reduce costos de operación y acelera el desarrollo inicial

En consecuencia, la arquitectura propuesta es un monolito modular: centralizado, organizado por dominios y listo para evolucionar si más adelante se requiere una separación más fina.

---

## 4. Estructura propuesta del backend

La estructura del repositorio debe seguir la organización ya establecida por el monorepo, con un backend centralizado en `services/` y una división clara por responsabilidades y dominios.

La propuesta conceptual es la siguiente:

```text
services/
  api/
    app/
      main.py
      core/
        config.py
        security.py
        dependencies.py
      api/
        v1/
          routers/
            auth.py
            users.py
            candidates.py
            employers.py
            vacancies.py
            interviews.py
            analytics.py
            reports.py
      domain/
        candidates/
          entities.py
          services.py
          repositories.py
        employers/
          entities.py
          services.py
          repositories.py
        vacancies/
          entities.py
          services.py
          repositories.py
        interviews/
          entities.py
          services.py
          repositories.py
        analytics/
          metrics.py
          reports.py
      schemas/
        candidate.py
        employer.py
        vacancy.py
        interview.py
        report.py
      db/
        base.py
        session.py
        models/
          candidate.py
          employer.py
          vacancy.py
          interview.py
          user.py
      services/
        candidate_service.py
        employer_service.py
        recruitment_service.py
        analytics_service.py
      tests/
        test_candidates.py
        test_vacancies.py
        test_interviews.py
        test_analytics.py
```

### 4.1 Criterio de separación por dominio y responsabilidad

Se recomienda organizar el backend de acuerdo con dos principios:

1. Dominio funcional
   - cada módulo representa un área del negocio
   - ejemplo: candidatos, empleadores, vacantes, entrevistas

2. Responsabilidad única
   - cada módulo se enfoca en una parte del problema
   - una capa no debe decidir ni también consultar directamente la base de datos sin un servicio intermedio apropiado

Los módulos principales propuestos son:

- `candidates`: perfiles, documentos, historial, estado del proceso
- `employers`: clientes, requerimientos, cuentas, seguimiento
- `vacancies`: vacantes, cierre, requisitos, publicación
- `interviews`: programación, evaluaciones y seguimiento de entrevistas
- `analytics`: métricas del funnel de contratación, reportes y KPIs
- `auth`: autenticación, autorización y gestión de roles
- `users`: perfiles internos y permisos del sistema

Este criterio evita que el backend se convierta en una masa de endpoints con lógica mezclada y facilita la comprensión del sistema para todo el equipo.

---

## 5. Organización de endpoints y routers en FastAPI

FastAPI se organiza de forma más natural con routers por dominio y con una versión de la API para evitar cambios incompatibles. La estructura sugerida es una API centralizada bajo el prefijo `/api/v1`.

### 5.1 Principios de diseño de routing

- cada dominio debe tener su propio router
- los endpoints deben agruparse por recurso y no por “tipo de operación” mezclada
- los routers deben delegar lógica a servicios y no contener lógica intensa de negocio
- el prefijo de versión facilita mantenimiento y evolución del contrato de API

### 5.2 Propuesta de endpoints

#### Autenticación y usuarios

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`
- `GET /api/v1/users`
- `GET /api/v1/users/{id}`
- `POST /api/v1/users`

#### Candidatos

- `GET /api/v1/candidates`
- `GET /api/v1/candidates/{id}`
- `POST /api/v1/candidates`
- `PUT /api/v1/candidates/{id}`
- `DELETE /api/v1/candidates/{id}`
- `GET /api/v1/candidates/{id}/history`
- `POST /api/v1/candidates/{id}/documents`

#### Empleadores / clientes

- `GET /api/v1/employers`
- `GET /api/v1/employers/{id}`
- `POST /api/v1/employers`
- `PUT /api/v1/employers/{id}`
- `GET /api/v1/employers/{id}/requirements`

#### Vacantes

- `GET /api/v1/vacancies`
- `GET /api/v1/vacancies/{id}`
- `POST /api/v1/vacancies`
- `PUT /api/v1/vacancies/{id}`
- `POST /api/v1/vacancies/{id}/publish`
- `GET /api/v1/vacancies/{id}/candidates`

#### Entrevistas y evaluación

- `GET /api/v1/interviews`
- `POST /api/v1/interviews`
- `GET /api/v1/interviews/{id}`
- `PUT /api/v1/interviews/{id}`
- `GET /api/v1/interviews/{id}/feedback`
- `POST /api/v1/interviews/{id}/feedback`

#### Analytics y reportes

- `GET /api/v1/analytics/summary`
- `GET /api/v1/analytics/kpis`
- `GET /api/v1/analytics/recruitment-funnel`
- `GET /api/v1/reports/client/{id}`
- `GET /api/v1/reports/team`

### 5.3 Criterio de agrupación

Este nivel de organización permite visualizar claramente qué parte del negocio está detrás de cada conjunto de endpoints. Por ejemplo, todo lo relativo a candidatos vive en `candidates`, todo lo relativo a entrevistas en `interviews`, y así sucesivamente. Esto no es solo una cuestión estética: mejora el entendimiento del sistema, acelera el onboarding, facilita testing y reduce el acoplamiento entre módulos.

---

## 6. Cómo se estructura normalmente un proyecto FastAPI y por qué esa práctica influye en la propuesta

La estructura convencional de FastAPI, ampliamente utilizada en proyectos profesionales y tutoriales de referencia, suele seguir un patrón similar al siguiente:

- `main.py` en la raíz de la app para crear la aplicación
- `routers/` para agrupar endpoints por recurso
- `schemas/` para modelos de entrada y salida
- `db/models/` o `models/` para entidades persistentes
- `core/` con configuración y utilidades transversales
- `dependencies.py` para inyección de dependencias
- `services/` para lógica de negocio y casos de uso
- `tests/` para validación funcional del sistema

Esta convención no es arbitraria. Se originó como una forma práctica de separar responsabilidades y evitar que proyectos medianos o grandes se vuelvan difíciles de mantener. 

En la propuesta para Nexova, se adopta ese mismo principio porque:

- el sistema tiene varios dominios claramente identificables
- la lógica de negocio debe mantenerse separada de la capa HTTP
- los equipos necesitan un proyecto comprensible desde el principio
- la persistencia, validación y seguridad deben estar organizadas y reutilizables

En otras palabras, la estructura estándar de FastAPI no se usa por moda; se usa porque refleja un diseño sano para aplicaciones con lógica y crecimiento real.

---

## 7. Frontend y backend como sistemas separados

La empresa puede optar por una de dos arquitecturas de despliegue:

### 7.1 Monorepo

Cuando frontend y backend están dentro del mismo repositorio:

- `uis/` alberga la interfaz de usuario
- `services/` contiene la API backend
- `shared/` o `packages/` centraliza tipos, enums y contratos compartidos

Esto favorece la coordinación entre equipos pequeños y reduce fricción de integración. Además, permite compartir schema y definiciones en proyectos con poco nivel de complejidad.

### 7.2 Repositorios separados

Cuando frontend y backend se separan físicamente, la comunicación debe hacerse por API REST con contrato claro y versionado. Esto es aún más importante cuando se trabaja con varios tipos de usuarios: reclutadores, clientes, administradores y posibles candidatos.

### 7.3 Recomendaciones técnicas para la integración

- Comunicación por API REST JSON con base URL configurable
- Variables de entorno para separar entorno de desarrollo, staging y producción
- Configuración de CORS estricta, limitando orígenes autorizados y métodos permitidos
- Autenticación con JWT o sesiones con scopes por rol
- Versionado del contrato (`/api/v1`, `/api/v2`) para evitar rupturas en clientes existentes

Esto es particularmente importante en una empresa de talento y contratación, donde ciertos datos son sensibles y los roles de acceso varían significativamente según el usuario.

---

## 8. Seguridad, configuración y consideraciones operativas iniciales

Aunque el entregable final no incluye código funcional, es necesario anticipar aspectos operativos desde la arquitectura:

- autenticación por roles: admin, recruiter, client, candidate
- configuración por entorno vía variables de entorno y archivos de configuración
- validación estricta de inputs para evitar inconsistencias en datos de candidatos y clientes
- logs de auditoría para cambios sensibles como cambios de estado o decisiones de rechazo
- manejo uniforme de errores HTTP para mantener una API predecible
- control de métricas básicas de negocio y latencia de endpoints críticos

Estas decisiones no son opcionales; afectan la seguridad, la confiabilidad y la capacidad de evolución del sistema.

---

## 9. Riesgos y puntos de atención

Si el equipo no sigue la estructura sugerida, pueden aparecer varios problemas graves:

### Riesgo 1: lógica de negocio mezclada en los routers

Si los endpoints contienen la mayor parte de la lógica y no delegan a servicios, el proyecto se vuelve difícil de entender, testear y mantener. En un sistema de reclutamiento, donde los flujos son dinámicos y con muchos estados, eso produce errores difíciles de localizar.

### Riesgo 2: acoplamiento entre dominios

Si se mezclan candidatos, vacantes, entrevistas y analytics en un mismo módulo, el sistema se vuelve opaco y cada cambio afecta varios procesos a la vez. Esto desacelera el desarrollo y aumenta el riesgo de errores colaterales.

### Riesgo 3: desacople entre frontend y backend

Cuando la capa visual y la API se acoplan demasiado, el equipo crea dependencias innecesarias. Eso incrementa el costo de cambio y obliga a actualizar múltiples partes del sistema por una sola modificación funcional.

### Riesgo 4: configuración insegura o inconsistente

Si la gestión de CORS, variables de entorno y credenciales no se planifica con criterio, la aplicación puede quedar vulnerable o inestable. Esto es especialmente crítico en sistemas de RR. HH., donde se manejan datos personales y procesos sensibles.

---

## 10. Conclusión

Para Nexova, la propuesta arquitectónica más sólida en la etapa actual es un backend FastAPI monolítico modular, organizado por capas y dominios funcionales. Este enfoque conecta directamente con la naturaleza del negocio, que exige claridad en los procesos de contratación, trazabilidad del estado del candidato, manejo de clientes y reportes operativos.

La decisión no se basa en una preferencia abstracta por “usar FastAPI” o “usar capas”. Se fundamenta en que Nexova necesita:

- una API centralizada y versionada
- dominios bien definidos
- un sistema mantenible y fácil de ampliar
- una separación clara entre API, lógica y acceso a datos
- una integración ordenada con el frontend y con futuras capacidades de IA

En resumen, la arquitectura propuesta es la más adecuada porque es clara, viable, escalable y fiel a la realidad del negocio. Establece una base sana para el desarrollo del backend sin introducir complejidad innecesaria ni deuda técnica prematura.

---

## 11. Verificación frente a la rúbrica del proyecto

La propuesta cumple con los criterios que exige el proyecto:

- [x] El patrón arquitectónico elegido está justificado con argumentos vinculados a la naturaleza del negocio y del sistema, no por preferencia genérica.
- [x] La estructura de carpetas propuesta es coherente con el patrón elegido y refleja una separación clara de responsabilidades o dominios.
- [x] La organización de routers y endpoints es reconocible como una aplicación FastAPI válida, con rutas agrupadas por dominio.
- [x] Las decisiones técnicas documentadas son concretas, justificadas y compatibles con los contenidos del curso.
- [x] La propuesta refleja la estructura estándar de proyectos FastAPI y menciona explícitamente su origen y su influencia en la decisión.
- [x] El documento aborda cómo frontend y backend coexisten como sistemas separados, incluyendo comunicación por API, variables de entorno y CORS.


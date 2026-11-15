"""Single source of truth for the Nexova telemetry event catalog.

Generates, from the definitions below:
  * docs/telemetry/event-schemas.json  (JSON Schema draft-07, validable)
  * the per-event specification section of docs/telemetry/telemetry-plan.md
    (between the BEGIN/END GENERATED markers)

and validates every event's example payload against its schema, plus negative
checks (a property outside the allowlist, office/currency mismatch, bad
event_type format) that MUST be rejected.

Usage (from the repo root):
    uv run --with jsonschema python docs/telemetry/tools/build_schemas.py
    uv run --with jsonschema python docs/telemetry/tools/build_schemas.py --check   # CI: fail if files are stale
"""

from __future__ import annotations

import argparse
import copy
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = ROOT / "event-schemas.json"
PLAN_PATH = ROOT / "telemetry-plan.md"
BEGIN = "<!-- BEGIN GENERATED: event-specs (docs/telemetry/tools/build_schemas.py) -->"
END = "<!-- END GENERATED: event-specs -->"

ENVELOPE_VERSION = "1.0.0"
UUID = r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
SLUG = r"^[a-z0-9]+(-[a-z0-9]+)*$"
HASH16 = r"^[0-9a-f]{16}$"

# --------------------------------------------------------------------------
# Allowlisted value sets (an enum IS an allowlist: new values = schema bump)
# --------------------------------------------------------------------------

OFFICES = ["valencia", "miami"]
CURRENCIES = ["EUR", "USD"]
PRODUCT_CATEGORIES = ["training_kit", "certification", "onboarding_equipment"]
RECIPIENT_TYPES = ["client", "candidate", "consultant", "support_agent"]
ROLES = ["admin", "recruiter", "client", "candidate", "user"]

FRONTEND_ROUTES = [
    "/", "/login", "/register", "/account/profile",
    "/backoffice/inventory/products",
    "/backoffice/inventory/orders",
    "/backoffice/inventory/orders/inbound",
    "/backoffice/inventory/orders/outbound",
    "/backoffice/suppliers",
    "website:/",
]

API_ROUTES = [
    "/", "/health",
    "/auth/login", "/auth/me",
    "/users", "/users/{user_id}",
    "/profiles/me",
    "/inventory/products", "/inventory/products/{product_id}",
    "/inventory/products/{product_id}/stock",
    "/inventory/orders", "/inventory/orders/inbound", "/inventory/orders/outbound",
    "/suppliers", "/suppliers/{supplier_id}",
    "/suppliers/{supplier_id}/rate", "/suppliers/{supplier_id}/status",
    "/candidates", "/clients", "/vacancies", "/interviews", "/evaluations",
]
HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"]

ORDER_FIELDS = ["product_id", "quantity", "notes", "unit_cost", "supplier_id",
                "recipient_type", "currency", "office", "name", "product_category",
                "programme_id", "min_stock", "description"]

# --------------------------------------------------------------------------
# Property helpers
# --------------------------------------------------------------------------


def prop(name, type_, required, desc, **schema):
    s = {"type": type_, "description": desc, **schema}
    return {"name": name, "required": required, "schema": s}


def office(desc="Oficina dueña del stock afectado (no la del usuario ni el idioma de la UI)."):
    return prop("office", "string", True, desc, enum=OFFICES)


def product_id(required=True):
    return prop("product_id", "string", required, "UUID del Product (material).", pattern=UUID)


def category():
    return prop("product_category", "string", True, "Categoría del Product.", enum=PRODUCT_CATEGORIES)


def programme():
    return prop("programme_id", "string", True,
                "Slug del programa al que pertenece el material (ej. `ventas-b2b`).", pattern=SLUG, maxLength=64)


def currency():
    return prop("currency", "string", True,
                "Moneda de la oficina: `EUR` si office=valencia, `USD` si office=miami. Nunca convertida.",
                enum=CURRENCIES)


def quantity(desc, minimum=0):
    return prop("quantity", "integer", True, desc, minimum=minimum)


def inventory_core(quantity_desc, quantity_min=0):
    """The six mandatory inventory fields from the BRIEFING (section 3)."""
    return [office(), product_id(), category(), programme(), quantity(quantity_desc, quantity_min), currency()]


def money(name, desc, required=True):
    return prop(name, "number", required, desc + " En la moneda de `currency`.", minimum=0)


def route(name="route", desc="Plantilla de ruta del frontend (sin IDs ni query string).", required=True):
    return prop(name, "string", required, desc, enum=FRONTEND_ROUTES)


def api_route(name="endpoint", desc="Plantilla de ruta del API (sin IDs reales ni query string).", required=True):
    return prop(name, "string", required, desc, enum=API_ROUTES)


def ms(name, desc, required=True):
    return prop(name, "integer", required, desc + " En milisegundos.", minimum=0)


# --------------------------------------------------------------------------
# Event catalog
# --------------------------------------------------------------------------
# Keys:
#   origin      mandatory (BRIEFING §3) | identified (propuesto en este plan)
#   category    inventory | auth | performance | errors | navigation | suppliers | commercial | observability
#   source      backend_api | backend_job | frontend_backoffice | frontend_website
#   auth        True when userId/sessionId must be non-null
#   delivery    stream | batch ; cadence ; justification (urgency of the decision)
#   pii         description of personal data risk + sanitisation
#   throttle    None or the throttle/debounce rule
# --------------------------------------------------------------------------

E = []


def event(**kw):
    kw.setdefault("throttle", None)
    kw.setdefault("auth", True)
    kw.setdefault("rules", [])
    E.append(kw)


# ---------------- Mandatory (BRIEFING §3) ----------------

event(
    event_type="inbound_order_created", origin="mandatory", category="inventory", source="backend_api",
    description="Se registró (commit OK) una InboundOrder: llegó un lote de material desde un proveedor.",
    trigger="`POST /inventory/orders/inbound` → 201, inmediatamente después del `session.commit()` en el servicio de órdenes de entrada (hoy `create_entry` en `services/api/src/api/inventory/service.py`). Nunca antes del commit ni en un reintento que falle.",
    hypothesis="cuánto material se produce/compra, para qué programa y con qué costo",
    decision="planificar la producción de material según la demanda esperada de matrículas (Elena)",
    delivery=("batch", "diario (02:00 hora de la oficina)", "La decisión que alimenta es de planificación de producción (horizonte semanas). Ver una entrada con horas de retraso no cambia ninguna acción. La parte urgente (costo anómalo) se separa en `kit_cost_variance_detected`, que va por stream."),
    properties=inventory_core("Unidades recibidas en el lote.", 1) + [
        prop("order_id", "string", True, "UUID de la InboundOrder.", pattern=UUID),
        prop("supplier_id", "string", True, "Identificador del proveedor (ID interno, no su nombre comercial).", minLength=1, maxLength=64),
        money("unit_cost", "Costo unitario del lote."),
        money("total_cost", "quantity × unit_cost."),
        prop("stock_after", "integer", True, "Stock del Product en esa oficina tras el commit.", minimum=0),
    ],
    pii="Ninguna. `userId` (UUID interno) va en el envelope. `notes` (texto libre del consultor) **no se emite**: puede contener nombres.",
    example_props={"office": "valencia", "product_id": "4f6c2a8e-1b3d-4c5e-9f70-0a1b2c3d4e5f", "product_category": "certification",
                   "programme_id": "ventas-b2b", "quantity": 40, "currency": "EUR", "order_id": "7d2f1e3a-5b6c-4d7e-8f90-1a2b3c4d5e6f",
                   "supplier_id": "sup-imprenta-levante", "unit_cost": 18.5, "total_cost": 740.0, "stock_after": 52},
)

event(
    event_type="outbound_order_created", origin="mandatory", category="inventory", source="backend_api",
    description="Se registró (commit OK) una OutboundOrder: se entregó un kit o certificado.",
    trigger="`POST /inventory/orders/outbound` → 201, después del commit (hoy `create_exit`). Las salidas rechazadas emiten `outbound_order_rejected`, nunca este evento.",
    hypothesis="qué programas consumen más material y a qué ritmo",
    decision="anticipar necesidades de reposición antes de una ola grande de matrículas (Elena)",
    delivery=("batch", "diario (02:00 hora de la oficina)", "Anticipar reposición es una decisión de días o semanas basada en tendencia (ritmo de consumo), no en una entrega individual. El caso urgente (quedarse bajo el mínimo) lo cubre `stock_threshold_triggered` por stream."),
    properties=inventory_core("Unidades entregadas.", 1) + [
        prop("order_id", "string", True, "UUID de la OutboundOrder.", pattern=UUID),
        prop("recipient_type", "string", True, "Tipo de destinatario (nunca su identidad).", enum=RECIPIENT_TYPES),
        prop("stock_after", "integer", True, "Stock del Product en esa oficina tras el commit.", minimum=0),
    ],
    pii="El destinatario es una persona (cliente, candidato, consultor o agente): **sólo se emite `recipient_type`**, nunca su nombre, email ni ID de persona (BRIEFING §3). `notes` no se emite.",
    example_props={"office": "miami", "product_id": "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d", "product_category": "onboarding_equipment",
                   "programme_id": "soporte-onboarding", "quantity": 1, "currency": "USD", "order_id": "0b1c2d3e-4f5a-4b6c-9d7e-8f9a0b1c2d3e",
                   "recipient_type": "support_agent", "stock_after": 7},
)

event(
    event_type="stock_threshold_triggered", origin="mandatory", category="inventory", source="backend_api",
    description="El stock de un Product en una oficina cruzó hacia abajo su mínimo configurado (`stock_after < min_stock`).",
    trigger="Se evalúa en la misma transacción lógica que una OutboundOrder (tras su commit) y al cambiar `min_stock` de un Product. Se emite **sólo en el cruce** (`stock_before >= min_stock` y `stock_after < min_stock`), no en cada orden mientras siga por debajo (histéresis, ver §5.3).",
    hypothesis="con qué frecuencia un programa se queda sin material disponible",
    decision="ajustar el umbral mínimo o acelerar la reimpresión/reproducción de ese material",
    delivery=("stream", "≤ 1 min, con alerta a L&D (Elena) y a la oficina", "Reimprimir o reproducir material tiene plazo de entrega de días: cada hora que pasa sin enterarse reduce el margen antes de quedarse sin kits para una matrícula. Es la única señal de inventario que exige acción el mismo día."),
    properties=inventory_core("Stock resultante tras el cruce (= `stock_after`). 0 indica agotado.") + [
        prop("min_stock", "integer", True, "Mínimo configurado del Product en esa oficina al momento del cruce.", minimum=0),
        prop("stock_before", "integer", True, "Stock antes de la operación que provocó el cruce.", minimum=0),
        prop("trigger_source", "string", True, "Qué provocó el cruce.", enum=["outbound_order", "min_stock_updated"]),
        prop("triggering_order_id", "string", False, "UUID de la OutboundOrder causante (sólo si trigger_source=outbound_order).", pattern=UUID),
    ],
    pii="Ninguna.",
    throttle="Edge-triggered con histéresis: un solo evento por episodio (producto+oficina) hasta que `stock_threshold_cleared` lo rearme.",
    example_props={"office": "valencia", "product_id": "4f6c2a8e-1b3d-4c5e-9f70-0a1b2c3d4e5f", "product_category": "certification",
                   "programme_id": "ventas-b2b", "quantity": 4, "currency": "EUR", "min_stock": 5, "stock_before": 6,
                   "trigger_source": "outbound_order", "triggering_order_id": "0b1c2d3e-4f5a-4b6c-9d7e-8f9a0b1c2d3e"},
)

event(
    event_type="direct_stock_edit_rejected", origin="mandatory", category="inventory", source="backend_api",
    description="Un usuario autenticado intentó modificar el stock fuera de una orden y el API lo rechazó.",
    trigger="El API rechaza (ver §3.3 del plan): (a) `PUT`/`PATCH`/`DELETE` sobre `/inventory/products/{product_id}/stock` → 405; (b) un body de `POST /inventory/products` o `PUT/PATCH /inventory/products/{product_id}` que incluya una clave de stock (`current_stock`, `stock`, `quantity`) → 422. Sólo se emite si el Product existe (si no, es un 404 normal).",
    hypothesis="si el personal intenta saltarse el control de trazabilidad del material",
    decision="reforzar capacitación o permisos en la oficina donde esto ocurre con más frecuencia (Patricia)",
    delivery=("stream", "≤ 1 min, alerta si ≥ 3 intentos del mismo userId en 10 min", "La decisión de Patricia (capacitación/permisos) se toma con el agregado semanal. Pero un intento de saltarse la trazabilidad también puede ser un script o una cuenta comprometida: eso hay que detectarlo en minutos, no al día siguiente. El agregado semanal se calcula sobre el mismo flujo."),
    properties=inventory_core("Valor de stock que se intentó fijar (o la cantidad del cambio). 0 si no se pudo leer del body.") + [
        prop("attempt_channel", "string", True, "Cómo se intentó.", enum=["stock_endpoint_write", "stock_field_in_product_payload"]),
        api_route(),
        prop("http_method", "string", True, "Método HTTP del intento.", enum=HTTP_METHODS),
        prop("http_status", "integer", True, "Código devuelto por el API.", enum=[405, 422]),
        prop("user_role", "string", True, "Rol del usuario que lo intentó.", enum=ROLES),
    ],
    pii="Ninguna. El userId (UUID interno) va en el envelope para poder agregar por persona sin exponer su identidad.",
    example_props={"office": "miami", "product_id": "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d", "product_category": "onboarding_equipment",
                   "programme_id": "soporte-onboarding", "quantity": 30, "currency": "USD", "attempt_channel": "stock_field_in_product_payload",
                   "endpoint": "/inventory/products/{product_id}", "http_method": "PATCH", "http_status": 422, "user_role": "user"},
)

event(
    event_type="kit_cost_variance_detected", origin="mandatory", category="inventory", source="backend_api",
    description="El costo unitario de una InboundOrder se desvía más que el umbral respecto al histórico del mismo material y proveedor.",
    trigger="Tras el commit de una InboundOrder. Baseline = media de `unit_cost` de las **últimas 5** InboundOrders del mismo `product_id` + `supplier_id` + `currency` en los últimos 365 días, excluyendo la actual. Se emite si `|variance_pct| > threshold_pct` (por defecto 10) **y** el baseline tiene ≥ 3 órdenes. Sin conversión de moneda: sólo se compara contra la misma moneda.",
    hypothesis="cuándo un proveedor de material sube precios de forma anómala",
    decision="alertar a Elena y a Laura para renegociar o buscar un proveedor alternativo",
    delivery=("stream", "≤ 1 min, alerta si direction=increase", "El BRIEFING pide alertar: el valor está en enterarse antes de aprobar el pago o confirmar el siguiente pedido a ese proveedor. Las bajadas (direction=decrease) también se emiten porque suelen ser errores de carga, pero se revisan en el lote diario."),
    properties=inventory_core("Unidades del lote que disparó la desviación.", 1) + [
        prop("inbound_order_id", "string", True, "UUID de la InboundOrder evaluada.", pattern=UUID),
        prop("supplier_id", "string", True, "Identificador interno del proveedor.", minLength=1, maxLength=64),
        money("unit_cost", "Costo unitario de esta orden."),
        money("baseline_unit_cost", "Media del histórico comparable."),
        prop("variance_pct", "number", True, "(unit_cost − baseline) / baseline × 100. Con signo."),
        prop("direction", "string", True, "Sentido de la desviación.", enum=["increase", "decrease"]),
        prop("threshold_pct", "number", True, "Umbral vigente al evaluar (configurable).", exclusiveMinimum=0),
        prop("baseline_sample_size", "integer", True, "Órdenes usadas en el baseline (3–5).", minimum=3, maximum=5),
    ],
    pii="Ninguna.",
    rules=["direction=increase ⇔ variance_pct > 0"],
    example_props={"office": "valencia", "product_id": "4f6c2a8e-1b3d-4c5e-9f70-0a1b2c3d4e5f", "product_category": "certification",
                   "programme_id": "ventas-b2b", "quantity": 40, "currency": "EUR", "inbound_order_id": "7d2f1e3a-5b6c-4d7e-8f90-1a2b3c4d5e6f",
                   "supplier_id": "sup-imprenta-levante", "unit_cost": 21.4, "baseline_unit_cost": 18.6, "variance_pct": 15.05,
                   "direction": "increase", "threshold_pct": 10, "baseline_sample_size": 5},
)

# ---------------- Identified: inventory ----------------

event(
    event_type="outbound_order_rejected", origin="identified", category="inventory", source="backend_api",
    description="Una OutboundOrder fue rechazada por falta de stock (hoy HTTP 400 en `create_exit`).",
    trigger="`POST /inventory/orders/outbound` → 400 por stock insuficiente, en la rama `ValueError` del router.",
    hypothesis="cuánta demanda de material no se pudo entregar (demanda oculta que las salidas exitosas no muestran)",
    decision="subir `min_stock` o adelantar la reposición de los programas con más entregas rechazadas",
    delivery=("batch", "diario", "Lo que se decide es el ajuste de mínimos y reposición, una revisión periódica. La urgencia operativa ya la cubre `stock_threshold_triggered`."),
    properties=inventory_core("Unidades solicitadas que no se pudieron entregar.", 1) + [
        prop("stock_available", "integer", True, "Stock disponible al rechazar.", minimum=0),
        prop("rejection_reason", "string", True, "Motivo.", enum=["insufficient_stock"]),
        prop("recipient_type", "string", True, "Tipo de destinatario previsto.", enum=RECIPIENT_TYPES),
    ],
    pii="Ninguna (sólo `recipient_type`).",
    example_props={"office": "miami", "product_id": "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d", "product_category": "onboarding_equipment",
                   "programme_id": "soporte-onboarding", "quantity": 5, "currency": "USD", "stock_available": 2,
                   "rejection_reason": "insufficient_stock", "recipient_type": "support_agent"},
)

event(
    event_type="order_validation_failed", origin="identified", category="inventory", source="backend_api",
    description="Una orden o alta de Product no pasó la validación, en el cliente (formulario) o en el servidor (422).",
    trigger="Servidor: handler de `RequestValidationError` para `/inventory/*` (422). Cliente: al pulsar *Registrar* en el formulario de órdenes si la validación local bloquea el envío (hoy `handleSubmit` en `talent-order-form.tsx`). **Nunca por pulsación de tecla.**",
    hypothesis="qué productos y qué campos acumulan más errores de validación (pregunta literal del tech lead)",
    decision="corregir el formulario o la ayuda contextual de los campos más fallados, o capacitar en la oficina con más errores",
    delivery=("batch", "diario", "Mejorar UX y capacitar son decisiones de sprint. Un error de validación no causa daño: la orden simplemente no se guarda."),
    properties=[
        prop("validation_layer", "string", True, "Dónde falló.", enum=["client", "server"]),
        prop("order_type", "string", True, "Qué se intentaba registrar.", enum=["inbound", "outbound", "product"]),
        prop("invalid_fields", "array", True, "Nombres de los campos inválidos (nunca sus valores).",
             items={"type": "string", "enum": ORDER_FIELDS}, minItems=1, uniqueItems=True),
        prop("error_codes", "array", True, "Tipos de error de Pydantic o códigos de la validación cliente (ej. `greater_than`, `missing`, `exceeds_stock`).",
             items={"type": "string", "pattern": r"^[a-z_]{2,40}$"}, minItems=1),
        product_id(required=False),
        prop("office", "string", False, "Oficina del Product, si se pudo resolver.", enum=OFFICES),
        prop("programme_id", "string", False, "Programa del Product, si se pudo resolver.", pattern=SLUG, maxLength=64),
    ],
    pii="Riesgo: los mensajes de Pydantic incluyen el **valor** recibido (`input`). Se emiten sólo `loc[-1]` (nombre de campo, contra allowlist) y `type`. Nunca `msg` ni `input`.",
    example_props={"validation_layer": "server", "order_type": "outbound", "invalid_fields": ["quantity"],
                   "error_codes": ["greater_than"], "product_id": "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d", "office": "miami",
                   "programme_id": "soporte-onboarding"},
)

event(
    event_type="product_created", origin="identified", category="inventory", source="backend_api",
    description="Se dio de alta un Product (ítem de material) en una oficina.",
    trigger="`POST /inventory/products` → 201, tras el commit.",
    hypothesis="cómo crece el catálogo por programa y oficina, y si se duplican ítems",
    decision="auditar el catálogo (fusionar duplicados) y validar que cada programa activo tenga su material dado de alta en ambas oficinas",
    delivery=("batch", "diario", "Las altas son poco frecuentes y la auditoría de catálogo es mensual."),
    properties=[office(), product_id(), category(), programme(), currency(),
                prop("min_stock", "integer", True, "Mínimo configurado al crear.", minimum=0)],
    pii="Ninguna. El nombre del Product es descriptivo del material, pero no se emite: basta `product_id` (se resuelve contra la tabla).",
    example_props={"office": "valencia", "product_id": "4f6c2a8e-1b3d-4c5e-9f70-0a1b2c3d4e5f", "product_category": "certification",
                   "programme_id": "ventas-b2b", "currency": "EUR", "min_stock": 5},
)

event(
    event_type="stock_threshold_cleared", origin="identified", category="inventory", source="backend_api",
    description="Un Product que estaba bajo su mínimo volvió a `stock >= min_stock` (cierra el episodio abierto por `stock_threshold_triggered`).",
    trigger="Tras el commit de una InboundOrder (o una bajada de `min_stock`) cuando `stock_before < min_stock` y `stock_after >= min_stock`.",
    hypothesis="cuánto tarda cada programa en reponer material una vez bajo el mínimo (tiempo de reposición real)",
    decision="exigir plazos de entrega a proveedores lentos o subir el mínimo de los programas con episodios largos",
    delivery=("batch", "diario", "Mide duración de episodios ya cerrados: es análisis, no reacción."),
    properties=inventory_core("Stock tras la reposición (= stock_after).") + [
        prop("min_stock", "integer", True, "Mínimo vigente.", minimum=0),
        prop("episode_duration_minutes", "integer", True, "Minutos desde el `stock_threshold_triggered` que abrió el episodio.", minimum=0),
        prop("clear_source", "string", True, "Qué cerró el episodio.", enum=["inbound_order", "min_stock_updated"]),
    ],
    pii="Ninguna.",
    example_props={"office": "valencia", "product_id": "4f6c2a8e-1b3d-4c5e-9f70-0a1b2c3d4e5f", "product_category": "certification",
                   "programme_id": "ventas-b2b", "quantity": 44, "currency": "EUR", "min_stock": 5,
                   "episode_duration_minutes": 4320, "clear_source": "inbound_order"},
)

event(
    event_type="inventory_snapshot_recorded", origin="identified", category="inventory", source="backend_job", auth=False,
    description="Foto diaria del stock por Product y oficina, generada por un job programado.",
    trigger="Job diario a las 23:55 hora de cada oficina: un evento por Product activo de esa oficina. `userId` y `sessionId` = null; `requestId` = id de la ejecución del job.",
    hypothesis="la evolución del stock y su cobertura sin tener que recalcular todo el ledger para cada reporte",
    decision="alimentar el reporte ejecutivo semanal de Laura (cobertura de material por programa y oficina) y detectar material inmovilizado",
    delivery=("batch", "diario", "Es por definición una foto diaria. Nadie decide nada en tiempo real con ella."),
    properties=inventory_core("Stock al cierre del día.") + [
        prop("min_stock", "integer", True, "Mínimo vigente.", minimum=0),
        prop("snapshot_date", "string", True, "Fecha local de la oficina (YYYY-MM-DD).", format="date"),
        money("stock_value", "Valor del stock = stock × último unit_cost conocido. Omitir si no hay costo.", required=False),
    ],
    pii="Ninguna.",
    example_props={"office": "miami", "product_id": "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d", "product_category": "onboarding_equipment",
                   "programme_id": "soporte-onboarding", "quantity": 7, "currency": "USD", "min_stock": 5,
                   "snapshot_date": "2026-11-15", "stock_value": 6230.0},
)

event(
    event_type="order_form_abandoned", origin="identified", category="navigation", source="frontend_backoffice",
    description="El usuario empezó a completar un formulario de orden y salió sin registrarla.",
    trigger="En el formulario de órdenes (hoy `talent-order-form.tsx`): si se llegó al menos a `product_selected` y no hubo envío exitoso, se emite al desmontar el componente (cambio de ruta) o en `pagehide`, con `navigator.sendBeacon`.",
    hypothesis="si hay fricción que hace abandonar las órdenes (por ejemplo, el aviso de stock insuficiente en salidas)",
    decision="rediseñar el paso donde más se abandona (ej. sugerir una oficina con stock o pedir reposición desde el propio formulario)",
    delivery=("batch", "diario", "Lleva a cambios de diseño, que se priorizan por sprint."),
    properties=[
        prop("order_type", "string", True, "Tipo de formulario.", enum=["inbound", "outbound"]),
        prop("step_reached", "string", True, "Último paso alcanzado.", enum=["product_selected", "quantity_entered", "submit_failed"]),
        ms("time_on_form_ms", "Tiempo desde que se mostró el formulario"),
        prop("had_stock_warning", "boolean", True, "Si se mostró el aviso «la cantidad supera el stock disponible»."),
        product_id(required=False),
        prop("office", "string", False, "Oficina del Product seleccionado.", enum=OFFICES),
    ],
    pii="Ninguna. Nunca se emiten los valores de *Notas* ni de *Cantidad*.",
    example_props={"order_type": "outbound", "step_reached": "quantity_entered", "time_on_form_ms": 48200,
                   "had_stock_warning": True, "product_id": "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d", "office": "miami"},
)

# ---------------- Identified: suppliers ----------------

event(
    event_type="supplier_rate_updated", origin="identified", category="suppliers", source="backend_api",
    description="Se cambió la tarifa mensual de un proveedor del directorio.",
    trigger="`PATCH /suppliers/{supplier_id}/rate` → 200 (hoy `update_supplier_rate` en `services/api/routes/suppliers.py`).",
    hypothesis="cómo evolucionan los costos fijos de proveedores (no sólo los de material) por oficina",
    decision="calendarizar renegociaciones y comparar contra `kit_cost_variance_detected` del mismo proveedor",
    delivery=("batch", "diario", "Son contratos mensuales: la decisión de renegociar se toma en semanas."),
    properties=[
        prop("supplier_id", "string", True, "ID interno del proveedor.", minLength=1, maxLength=64),
        prop("office", "string", True, "Oficina del contrato (Spain → valencia, USA → miami).", enum=OFFICES),
        currency(),
        money("previous_monthly_rate", "Tarifa anterior."),
        money("new_monthly_rate", "Tarifa nueva."),
        prop("change_pct", "number", True, "(nueva − anterior) / anterior × 100."),
    ],
    pii="`contact_email` del proveedor **no se emite**.",
    example_props={"supplier_id": "17", "office": "valencia", "currency": "EUR", "previous_monthly_rate": 490.0,
                   "new_monthly_rate": 540.0, "change_pct": 10.2},
)

event(
    event_type="supplier_status_changed", origin="identified", category="suppliers", source="backend_api",
    description="Un proveedor pasó de activo a suspendido o al revés.",
    trigger="`PATCH /suppliers/{supplier_id}/status` → 200, sólo si el estado cambió.",
    hypothesis="si alguna categoría de servicio se queda sin proveedor activo en una oficina",
    decision="buscar un proveedor alternativo antes de que una suspensión deje un programa sin material",
    delivery=("batch", "diario", "Una suspensión es una decisión deliberada del equipo; la revisión de cobertura es semanal."),
    properties=[
        prop("supplier_id", "string", True, "ID interno del proveedor.", minLength=1, maxLength=64),
        prop("office", "string", True, "Oficina del contrato.", enum=OFFICES),
        prop("previous_status", "string", True, "Estado anterior.", enum=["active", "suspended"]),
        prop("new_status", "string", True, "Estado nuevo.", enum=["active", "suspended"]),
        prop("supplier_categories", "array", True, "Categorías de servicio del proveedor.",
             items={"type": "string", "enum": ["job_boards", "ats_software", "assessment_tools", "training_platforms",
                                               "payroll_and_hr_software", "video_interview", "background_check",
                                               "office_and_facilities", "it_and_software_licenses"]}, minItems=1),
    ],
    pii="Ninguna.",
    example_props={"supplier_id": "12", "office": "miami", "previous_status": "active", "new_status": "suspended",
                   "supplier_categories": ["training_platforms"]},
)

# ---------------- Identified: auth ----------------

event(
    event_type="login_succeeded", origin="identified", category="auth", source="backend_api",
    description="Inicio de sesión correcto en el backoffice.",
    trigger="`POST /auth/login` → 200, al emitir el token.",
    hypothesis="cuántas personas usan realmente el backoffice, con qué rol y en qué horario",
    decision="dimensionar capacitación y soporte, y detectar cuentas que nunca entran (candidatas a desactivar)",
    delivery=("batch", "diario", "Son métricas de adopción y su revisión es mensual."),
    properties=[prop("user_role", "string", True, "Rol del usuario.", enum=ROLES),
                prop("auth_method", "string", True, "Método.", enum=["password"])],
    pii="Ninguna. El email **nunca** se emite: el usuario se identifica por `userId` en el envelope.",
    example_props={"user_role": "recruiter", "auth_method": "password"},
)

event(
    event_type="login_failed", origin="identified", category="auth", source="backend_api", auth=False,
    description="Intento de inicio de sesión fallido.",
    trigger="`POST /auth/login` → 401/403/422. `userId` = null aunque la cuenta exista (no se revela qué cuentas existen).",
    hypothesis="cuántos intentos fallidos hay por día y si hay ataques de fuerza bruta contra cuentas concretas (pregunta del tech lead)",
    decision="bloquear temporalmente una cuenta o IP, exigir MFA, o ayudar a usuarios que fallan repetidamente",
    delivery=("stream", "≤ 1 min, alerta si ≥ 10 fallos del mismo account_key_hash o client_ip_hash en 15 min", "Un ataque de fuerza bruta se gana o se pierde en minutos: un lote diario llega tarde para bloquear."),
    properties=[
        prop("failure_reason", "string", True, "Motivo.", enum=["invalid_credentials", "inactive_user", "malformed_request", "rate_limited"]),
        prop("account_key_hash", "string", True, "HMAC-SHA256(email normalizado, pepper secreto) truncado a 16 hex. Permite contar fallos por cuenta sin guardar el email.", pattern=HASH16),
        prop("client_ip_hash", "string", True, "HMAC-SHA256(IP, sal diaria rotada) truncado a 16 hex. Correlaciona dentro del día, no entre días.", pattern=HASH16),
        prop("suppressed_count", "integer", False, "Fallos omitidos por el throttle desde el último evento emitido para este client_ip_hash.", minimum=1),
    ],
    pii="**Contiene PII seudonimizada.** El email y la IP son datos personales (RGPD aplica en Valencia). Nunca se emiten en claro: el email va como HMAC con *pepper* en el gestor de secretos (no reversible sin él) y la IP como HMAC con sal **diaria rotada**, que se destruye a las 48 h. Retención: 90 días.",
    throttle="Máximo 60 eventos/min por `client_ip_hash`; el excedente se cuenta y se informa en `suppressed_count` del siguiente evento.",
    example_props={"failure_reason": "invalid_credentials", "account_key_hash": "a3f1c9e07b2d4e51", "client_ip_hash": "0c9d8e7f6a5b4c3d"},
)

event(
    event_type="session_expired", origin="identified", category="auth", source="frontend_backoffice",
    description="La sesión del usuario caducó (401) mientras usaba el backoffice.",
    trigger="Hoy `expireSession()` en `uis/backoffice/src/lib/auth.ts` (lo llama `request()` ante un 401 o falta de token). Se emite antes de borrar el token, con el userId en memoria.",
    hypothesis="si la caducidad del token (30 min) interrumpe trabajo real, por ejemplo con un formulario a medio completar",
    decision="ajustar `ACCESS_TOKEN_EXPIRE_MINUTES` o implementar refresh token",
    delivery=("batch", "diario", "Calibrar la duración del token es una decisión de configuración que se revisa con datos de semanas."),
    properties=[
        route(),
        prop("trigger", "string", True, "Origen.", enum=["api_401", "token_missing"]),
        prop("session_age_minutes", "integer", True, "Minutos desde el login.", minimum=0),
        prop("had_unsaved_form", "boolean", True, "Si había un formulario con cambios sin enviar."),
    ],
    pii="Ninguna.",
    example_props={"route": "/backoffice/inventory/orders/outbound", "trigger": "api_401", "session_age_minutes": 31,
                   "had_unsaved_form": True},
)

event(
    event_type="user_logged_out", origin="identified", category="auth", source="frontend_backoffice",
    description="El usuario cerró sesión voluntariamente.",
    trigger="Botón *Cerrar sesión* (hoy `handleLogout` en `uis/backoffice/src/app/page.tsx`), antes de `logout()`.",
    hypothesis="cuánto duran las sesiones reales de trabajo (junto con `session_expired`)",
    decision="fijar la duración del token según el uso real y no por defecto",
    delivery=("batch", "diario", "Alimenta la misma decisión de configuración que `session_expired`."),
    properties=[prop("session_duration_minutes", "integer", True, "Minutos desde el login.", minimum=0)],
    pii="Ninguna.",
    example_props={"session_duration_minutes": 142},
)

event(
    event_type="user_registered", origin="identified", category="auth", source="backend_api",
    description="Se creó una cuenta nueva (`POST /users` → 201).",
    trigger="Tras crear el usuario y su perfil. `userId` = UUID de la cuenta nueva y `sessionId` = el de la sesión anónima que la creó.",
    hypothesis="si el registro abierto está creando cuentas que nadie esperaba (hoy cualquiera puede registrarse)",
    decision="cerrar el autoregistro y pasar a invitación o aprobación de RRHH (Patricia)",
    delivery=("batch", "diario", "Las altas son pocas y la decisión es de política."),
    properties=[prop("user_role", "string", True, "Rol asignado al crear.", enum=ROLES),
                prop("email_domain_class", "string", True, "Si el dominio del email es corporativo de Nexova o externo. Nunca el dominio en sí.", enum=["corporate", "external"])],
    pii="El email no se emite. Sólo una clasificación binaria del dominio, que no identifica a nadie.",
    example_props={"user_role": "user", "email_domain_class": "external"},
)

event(
    event_type="access_denied", origin="identified", category="auth", source="backend_api",
    description="Un usuario autenticado pidió un recurso para el que no tiene permiso (403).",
    trigger="Cualquier `HTTPException(403)` (hoy, por ejemplo, `GET /users/{user_id}` de otro usuario sin rol admin).",
    hypothesis="si hay usuarios explorando recursos ajenos o si los permisos están mal definidos para tareas legítimas",
    decision="corregir roles y permisos, o investigar una cuenta concreta",
    delivery=("batch", "diario", "El acceso ya fue bloqueado, así que no hay daño en curso. La revisión es periódica. Lo que no se bloquea (saltarse la trazabilidad) va por stream en `direct_stock_edit_rejected`."),
    properties=[api_route(), prop("http_method", "string", True, "Método.", enum=HTTP_METHODS),
                prop("user_role", "string", True, "Rol del usuario.", enum=ROLES)],
    pii="Ninguna. El ID del recurso pedido no se emite (podría ser el UUID de otra persona); sólo la plantilla de ruta.",
    example_props={"endpoint": "/users/{user_id}", "http_method": "GET", "user_role": "user"},
)

# ---------------- Identified: performance ----------------

event(
    event_type="api_latency_recorded", origin="identified", category="performance", source="backend_api", auth=False,
    description="Agregado de latencia por ruta en una ventana de 60 s (no un evento por petición).",
    trigger="El middleware de timing (hoy `timing_middleware` en `services/api/src/api/main.py`) acumula en memoria por (ruta, método, clase de status) y emite un evento por combinación al cerrar cada ventana de 60 s. Se excluyen `/health` y `/`. `userId`/`sessionId` = null; `requestId` = id de la ventana.",
    hypothesis="qué endpoints se degradan y cuándo, y si la caché mantiene su tasa de aciertos",
    decision="actuar ante una degradación (rollback, escalar, índice) y decidir qué más cachear u optimizar",
    delivery=("stream", "≤ 1 min, alerta si p95 > 500 ms en 3 ventanas seguidas", "Una degradación afecta a todos los usuarios mientras dura: hay que detectarla en minutos. Agregar por minuto mantiene el volumen bajo."),
    properties=[
        api_route(),
        prop("http_method", "string", True, "Método.", enum=HTTP_METHODS),
        prop("status_class", "string", True, "Clase de status.", enum=["2xx", "3xx", "4xx", "5xx"]),
        prop("window_start", "string", True, "Inicio de la ventana (ISO 8601 UTC).", format="date-time"),
        prop("window_seconds", "integer", True, "Duración de la ventana.", enum=[60]),
        prop("request_count", "integer", True, "Peticiones en la ventana.", minimum=1),
        ms("p50_ms", "Percentil 50"), ms("p95_ms", "Percentil 95"), ms("max_ms", "Máximo"),
        prop("cache_hit_count", "integer", False, "Respuestas con `X-Cache: HIT`.", minimum=0),
        prop("cache_miss_count", "integer", False, "Respuestas con `X-Cache: MISS`.", minimum=0),
    ],
    pii="Ninguna (agregado, sin usuario).",
    throttle="Agregación en ventana fija de 60 s: como máximo un evento por (ruta, método, clase) y minuto, sea cual sea el tráfico.",
    example_props={"endpoint": "/inventory/products", "http_method": "GET", "status_class": "2xx",
                   "window_start": "2026-11-15T10:42:00.000Z", "window_seconds": 60, "request_count": 37,
                   "p50_ms": 1, "p95_ms": 98, "max_ms": 121, "cache_hit_count": 34, "cache_miss_count": 3},
)

event(
    event_type="page_load_recorded", origin="identified", category="performance", source="frontend_backoffice", auth=False,
    description="Métricas de carga real (Core Web Vitals) de una vista del backoffice o del website.",
    trigger="Con `useReportWebVitals` de Next.js: un evento por carga completa, emitido en `pagehide` (cuando INP y CLS ya son definitivos). En el website, sólo con consentimiento de analítica.",
    hypothesis="cómo perciben la velocidad los usuarios reales y si un despliegue empeoró la carga",
    decision="priorizar optimizaciones (lazy loading, caché) en las vistas más lentas y bloquear releases que empeoren LCP o INP",
    delivery=("batch", "diario", "Las decisiones de performance se toman por release. Lo urgente (API caída o lenta) ya lo detecta `api_latency_recorded` por stream."),
    properties=[
        route(),
        ms("lcp_ms", "Largest Contentful Paint"), ms("inp_ms", "Interaction to Next Paint", required=False),
        ms("ttfb_ms", "Time To First Byte"),
        prop("cls", "number", True, "Cumulative Layout Shift (sin unidad).", minimum=0),
        prop("device_class", "string", True, "Clase por ancho de viewport.", enum=["mobile", "tablet", "desktop"]),
        prop("navigation_type", "string", True, "Tipo de navegación.", enum=["navigate", "reload", "back_forward", "client_route"]),
    ],
    pii="El user-agent completo **no** se emite (permite *fingerprinting*); sólo `device_class`.",
    throttle="Muestreo: 100 % en el backoffice (pocos usuarios) y 25 % de las sesiones en el website. La decisión de muestreo se toma una vez por sesión.",
    example_props={"route": "/backoffice/inventory/orders", "lcp_ms": 920, "inp_ms": 64, "ttfb_ms": 85, "cls": 0.01,
                   "device_class": "desktop", "navigation_type": "client_route"},
)

event(
    event_type="db_query_slow_detected", origin="identified", category="performance", source="backend_api", auth=False,
    description="Una consulta SQL superó 200 ms.",
    trigger="Listener `after_cursor_execute` de SQLAlchemy sobre el engine de inventario: si la duración supera 200 ms, emite la consulta normalizada (sin parámetros).",
    hypothesis="qué consultas concretas explican la latencia del API (ej. el N+1 de stock detectado en la auditoría de caching)",
    decision="crear índices, reescribir la consulta o cachear el endpoint que la usa",
    delivery=("batch", "horario", "Lo urgente lo dispara `api_latency_recorded`; esto sirve para diagnosticar la causa después."),
    properties=[
        prop("query_fingerprint", "string", True, "SHA-256 (16 hex) de la consulta normalizada (literales sustituidos por `?`).", pattern=HASH16),
        prop("statement_kind", "string", True, "Tipo.", enum=["select", "insert", "update", "delete", "other"]),
        prop("main_table", "string", True, "Tabla principal.", enum=["products", "inbound_orders", "outbound_orders", "other"]),
        ms("duration_ms", "Duración"),
        api_route(required=False),
    ],
    pii="Riesgo: el SQL con parámetros podría contener datos. Sólo se emite la huella de la consulta **normalizada**; el texto normalizado se guarda aparte en un catálogo interno de huellas.",
    throttle="Máximo 1 evento por `query_fingerprint` cada 60 s (el resto se cuenta en logs, no en telemetría).",
    example_props={"query_fingerprint": "5e1f0a9b8c7d6e5f", "statement_kind": "select", "main_table": "outbound_orders",
                   "duration_ms": 412, "endpoint": "/inventory/orders"},
)

# ---------------- Identified: errors ----------------

event(
    event_type="api_error_returned", origin="identified", category="errors", source="backend_api", auth=False,
    description="El API devolvió un 5xx (excepción no controlada).",
    trigger="`global_exception_handler` en `services/api/src/api/main.py` (hoy devuelve 500 genérico). `userId` se incluye si la petición estaba autenticada.",
    hypothesis="qué fallos reales de servidor sufren los usuarios y desde qué despliegue",
    decision="hacer rollback o hotfix y priorizar los fallos más frecuentes",
    delivery=("stream", "≤ 1 min, alerta si un error_fingerprint nuevo aparece o si hay > 5 en 5 min", "Un 5xx es una funcionalidad rota en producción: cada minuto cuenta."),
    properties=[
        api_route(),
        prop("http_method", "string", True, "Método.", enum=HTTP_METHODS),
        prop("http_status", "integer", True, "Status.", minimum=500, maximum=599),
        prop("error_class", "string", True, "Nombre de la clase de excepción (ej. `OperationalError`).", pattern=r"^[A-Za-z_][A-Za-z0-9_.]{0,80}$"),
        prop("error_fingerprint", "string", True, "SHA-256 (16 hex) de clase + primer frame propio del stack.", pattern=HASH16),
        prop("occurrence_count", "integer", True, "Ocurrencias agregadas en la ventana de throttle (1 si no hubo agregación).", minimum=1),
    ],
    pii="Riesgo: el mensaje de la excepción puede incluir datos del request. **No se emite el mensaje ni el stack**, sólo la clase y una huella. El stack completo queda en los logs del servidor, enlazado por `requestId`.",
    throttle="Por `error_fingerprint`: un evento inmediato y luego, como máximo, uno cada 10 s con `occurrence_count`.",
    example_props={"endpoint": "/inventory/orders/outbound", "http_method": "POST", "http_status": 500,
                   "error_class": "OperationalError", "error_fingerprint": "9c8b7a6f5e4d3c2b", "occurrence_count": 1},
)

event(
    event_type="frontend_error_captured", origin="identified", category="errors", source="frontend_backoffice", auth=False,
    description="Error de JavaScript no controlado en el navegador.",
    trigger="`window.onerror`, `unhandledrejection` y un Error Boundary (`error.tsx` del App Router) en backoffice y website.",
    hypothesis="si hay vistas rotas en el navegador que el backend nunca ve",
    decision="hotfix o rollback del frontend y priorizar los errores por número de sesiones afectadas",
    delivery=("stream", "≤ 1 min, alerta si un fingerprint nuevo afecta a ≥ 3 sesiones en 10 min", "Un error que rompe el formulario de órdenes impide registrar entregas, y el backend no lo ve."),
    properties=[
        route(),
        prop("error_source", "string", True, "Captura.", enum=["window_error", "unhandled_rejection", "error_boundary"]),
        prop("error_name", "string", True, "Nombre (ej. `TypeError`).", pattern=r"^[A-Za-z_][A-Za-z0-9_]{0,60}$"),
        prop("message_sanitized", "string", True, "Mensaje truncado a 200 caracteres con emails, UUIDs y números reemplazados por `<email>`, `<uuid>` y `<n>`.", maxLength=200),
        prop("error_fingerprint", "string", True, "SHA-256 (16 hex) de error_name + primer frame de la app.", pattern=HASH16),
        prop("app_area", "string", True, "Aplicación.", enum=["backoffice", "website"]),
    ],
    pii="Riesgo: el mensaje de error puede contener datos de la pantalla. Se sanitiza (regex de email, UUID y números) y se trunca **antes** de salir del navegador. No se envía el stack con URLs completas.",
    throttle="Por sesión: un evento por `error_fingerprint` cada 60 s y un máximo de 20 errores por sesión (protege contra bucles de render).",
    example_props={"route": "/backoffice/inventory/orders/outbound", "error_source": "error_boundary", "error_name": "TypeError",
                   "message_sanitized": "Cannot read properties of null (reading 'current_stock')",
                   "error_fingerprint": "1a2b3c4d5e6f7a8b", "app_area": "backoffice"},
)

event(
    event_type="api_request_failed", origin="identified", category="errors", source="frontend_backoffice",
    description="Una llamada del frontend al API falló desde el punto de vista del usuario (red, timeout o error HTTP inesperado).",
    trigger="`request()` en `uis/backoffice/src/lib/api.ts`: excepción de `fetch` (red), timeout o status ≥ 500. Se excluyen los aborts intencionales (`AbortController`), los 401 (→ `session_expired`) y los 4xx de validación (→ `order_validation_failed`).",
    hypothesis="cuántos fallos ven los usuarios que el backend no registra (proxy, red, CORS, despliegue a medias)",
    decision="investigar infraestructura (proxy de Next, CORS, DNS) cuando la tasa de fallos del cliente diverge de la del servidor",
    delivery=("batch", "horario", "Los 5xx del servidor ya van por stream en `api_error_returned`. Esto es la diferencia entre lo que ve el cliente y lo que ve el servidor, y basta revisarla cada hora."),
    properties=[
        api_route(),
        prop("http_method", "string", True, "Método.", enum=HTTP_METHODS),
        prop("failure_kind", "string", True, "Tipo de fallo.", enum=["network_error", "timeout", "http_5xx"]),
        prop("http_status", "integer", False, "Status (sólo si failure_kind=http_5xx).", minimum=500, maximum=599),
        ms("duration_ms", "Tiempo hasta el fallo"),
        route("page_route", "Vista desde la que se hizo la llamada."),
    ],
    pii="Ninguna (sólo plantillas de ruta).",
    example_props={"endpoint": "/inventory/orders", "http_method": "GET", "failure_kind": "timeout", "duration_ms": 30000,
                   "page_route": "/backoffice/inventory/orders"},
)

# ---------------- Identified: navigation ----------------

event(
    event_type="page_viewed", origin="identified", category="navigation", source="frontend_backoffice", auth=False,
    description="Se mostró una vista del backoffice o del website.",
    trigger="Componente cliente en el layout raíz que observa `usePathname()` y emite en cada cambio de ruta (incluida la carga inicial). La ruta se normaliza a su plantilla y la query string se descarta.",
    hypothesis="qué secciones usan más los operadores y por qué caminos llegan (pregunta del tech lead)",
    decision="priorizar el desarrollo de las secciones más usadas y simplificar o retirar las que nadie visita",
    delivery=("batch", "diario", "Son patrones de uso que se analizan por semana."),
    properties=[
        route(),
        route("referrer_route", "Vista interna anterior (null en la primera vista de la sesión).", required=False),
        prop("app_area", "string", True, "Aplicación.", enum=["backoffice", "website"]),
        prop("ui_locale", "string", True, "Idioma de la interfaz. Independiente de `office` (BRIEFING §6).", enum=["es", "en"]),
        prop("device_class", "string", True, "Clase por ancho de viewport.", enum=["mobile", "tablet", "desktop"]),
    ],
    pii="La query string y los IDs de la URL no se emiten. El referrer externo tampoco (podría incluir parámetros de campañas o de búsqueda). En el website se emite sólo con consentimiento de analítica (RGPD/ePrivacy).",
    throttle="Deduplicación: se ignora una segunda vista de la misma ruta dentro de 2 s (doble render en desarrollo, *replace* de rutas).",
    example_props={"route": "/backoffice/inventory/products", "referrer_route": "/", "app_area": "backoffice", "ui_locale": "es",
                   "device_class": "desktop"},
)

event(
    event_type="list_filter_applied", origin="identified", category="navigation", source="frontend_backoffice",
    description="El usuario aplicó o cambió filtros en un listado.",
    trigger="Cambio de los `<select>` de País o Categoría del directorio de proveedores (y, a futuro, de los filtros de inventario por oficina o programa), con debounce de 1 s.",
    hypothesis="qué filtros necesitan de verdad los operadores y con qué combinaciones",
    decision="decidir qué filtros añadir al inventario (oficina, programa) y qué combinaciones merecen caché o índice",
    delivery=("batch", "diario", "Alimenta decisiones de producto y de caché, que se toman por sprint."),
    properties=[
        prop("view", "string", True, "Listado.", enum=["suppliers_directory", "inventory_products", "inventory_orders"]),
        prop("filter_keys", "array", True, "Filtros activos (nombres, no valores libres).",
             items={"type": "string", "enum": ["country", "category", "office", "programme_id", "product_category", "order_type"]}, uniqueItems=True),
        prop("result_count", "integer", True, "Resultados mostrados.", minimum=0),
    ],
    pii="Ninguna: sólo nombres de filtros, no los valores.",
    throttle="Debounce de 1 s: sólo se emite el estado final tras 1 s sin cambios.",
    example_props={"view": "suppliers_directory", "filter_keys": ["country", "category"], "result_count": 45},
)

event(
    event_type="contact_section_viewed", origin="identified", category="navigation", source="frontend_website", auth=False,
    description="Un visitante del website llegó a la sección de Contacto.",
    trigger="Callback del `IntersectionObserver` que ya existe en `LazyContactForm.tsx` (lazy loading del formulario), una vez por sesión.",
    hypothesis="qué proporción de visitantes llega hasta el formulario de contacto al final de la landing",
    decision="mover o duplicar la llamada a la acción más arriba si muy pocos llegan",
    delivery=("batch", "diario", "Es una decisión de diseño de la landing."),
    properties=[prop("entry_route", "string", True, "Ruta de entrada.", enum=["website:/"]),
                prop("scroll_depth_pct", "integer", True, "Porcentaje de la página recorrido al dispararse.", minimum=0, maximum=100),
                ms("time_to_reach_ms", "Tiempo desde la carga")],
    pii="Ninguna. Sólo con consentimiento de analítica.",
    throttle="Una vez por sesión.",
    example_props={"entry_route": "website:/", "scroll_depth_pct": 88, "time_to_reach_ms": 23400},
)

# ---------------- Identified: commercial ----------------

event(
    event_type="contact_request_submitted", origin="identified", category="commercial", source="frontend_website", auth=False,
    description="Un visitante envió el formulario de contacto del website.",
    trigger="`handleSubmit` de `ContactForm.tsx`, tras el envío correcto (hoy simulado; cuando exista el backend, al recibir su 2xx).",
    hypothesis="qué servicios generan más demanda comercial y desde qué país",
    decision="asignar consultores comerciales y presupuesto de marketing por servicio",
    delivery=("batch", "diario", "La gestión del lead la hace el CRM con los datos del formulario. La telemetría mide la demanda agregada, que se revisa por semana."),
    properties=[
        prop("service_interest", "string", True, "Servicio elegido.", enum=["executive-search", "rpo", "consultoria", "people-analytics", "evaluacion", "nomina", "otro", "none"]),
        prop("form_country", "string", True, "País elegido en el formulario.", enum=["Chile", "Argentina", "Otro"]),
        prop("has_company", "boolean", True, "Si completó el campo Empresa (no su valor)."),
        prop("message_length_bucket", "string", True, "Tramo de longitud del mensaje.", enum=["empty", "short", "medium", "long"]),
    ],
    pii="**El formulario contiene PII** (nombre, email, empresa, mensaje): nada de eso entra en la telemetría. Sólo se emiten las elecciones de los desplegables y señales booleanas o por tramos.",
    example_props={"service_interest": "executive-search", "form_country": "Chile", "has_company": True, "message_length_bucket": "medium"},
)

# ---------------- Identified: observability ----------------

event(
    event_type="telemetry_events_dropped", origin="identified", category="observability", source="backend_api", auth=False,
    description="Eventos de telemetría descartados por un emisor (allowlist, cola llena, transporte o throttle).",
    trigger="Los emisores (SDK del frontend y emisor del backend) cuentan los descartes y emiten un agregado cada 60 s si hubo alguno. El evento original **no** se reenvía.",
    hypothesis="si la instrumentación está perdiendo datos o alguien intenta emitir propiedades fuera del allowlist",
    decision="corregir la instrumentación antes de que los reportes de Elena o Laura se basen en datos incompletos",
    delivery=("batch", "horario", "Hay que detectarlo el mismo día, pero no en el minuto: los datos perdidos ya no vuelven."),
    properties=[
        prop("emitter", "string", True, "Emisor.", enum=["frontend_backoffice", "frontend_website", "backend_api", "backend_job"]),
        prop("reason", "string", True, "Causa.", enum=["schema_violation", "queue_overflow", "transport_error", "throttled"]),
        prop("affected_event_type", "string", True, "event_type afectado.", pattern=r"^[a-z]+(_[a-z]+)+$"),
        prop("dropped_count", "integer", True, "Eventos descartados en la ventana.", minimum=1),
        prop("rejected_keys", "array", False, "Claves fuera del allowlist detectadas (sólo con reason=schema_violation). Nombres, nunca valores.",
             items={"type": "string", "maxLength": 64}, maxItems=20),
    ],
    pii="Ninguna: se informan los nombres de las claves rechazadas, nunca sus valores.",
    throttle="Agregado cada 60 s por (emitter, reason, affected_event_type).",
    example_props={"emitter": "backend_api", "reason": "schema_violation", "affected_event_type": "outbound_order_created",
                   "dropped_count": 3, "rejected_keys": ["recipient_name"]},
)


# --------------------------------------------------------------------------
# Builders
# --------------------------------------------------------------------------

SOURCES = ["frontend_backoffice", "frontend_website", "backend_api", "backend_job"]

ENVELOPE = {
    "type": "object",
    "description": "Event Envelope v1 de Nexova. Todo evento lo cumple; el payload específico va en `properties`.",
    "required": ["eventId", "timestamp", "sessionId", "userId", "event_type", "schemaVersion", "requestId", "context", "properties"],
    "additionalProperties": False,
    "properties": {
        "eventId": {"type": "string", "pattern": UUID, "description": "UUID v4 generado UNA vez por ocurrencia, en el emisor. Clave de deduplicación."},
        "timestamp": {"type": "string", "format": "date-time", "pattern": r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$",
                      "description": "Momento de la ocurrencia, ISO 8601 en UTC con milisegundos y sufijo Z (backend: tras el commit)."},
        "sessionId": {"type": ["string", "null"], "pattern": UUID, "description": "UUID de la sesión del navegador (header X-Session-Id). null en jobs."},
        "userId": {"type": ["string", "null"], "pattern": UUID, "description": "UUID interno del usuario autenticado (users.id). null si es anónimo. Nunca un email."},
        "event_type": {"type": "string", "pattern": r"^[a-z]+(_[a-z]+)+$", "description": "Taxonomía entidad_acción en snake_case; la acción va en participio."},
        "schemaVersion": {"type": "string", "pattern": r"^\d+\.\d+\.\d+$", "description": "SemVer del esquema de este event_type."},
        "requestId": {"type": "string", "pattern": UUID, "description": "UUID de correlación frontend–backend–logs (header X-Request-Id). En jobs: id de la ejecución."},
        "context": {
            "type": "object", "additionalProperties": False, "required": ["source", "environment", "appVersion"],
            "description": "Metadatos técnicos del emisor (no de negocio).",
            "properties": {
                "source": {"type": "string", "enum": SOURCES},
                "environment": {"type": "string", "enum": ["development", "staging", "production"]},
                "appVersion": {"type": "string", "pattern": r"^[0-9a-f]{7,12}$", "description": "SHA corto de git del build."},
            },
        },
        "properties": {"type": "object", "description": "Payload específico; su allowlist la define cada event_type."},
    },
}

OFFICE_CURRENCY_RULE = [
    {"if": {"properties": {"office": {"const": "valencia"}}, "required": ["office", "currency"]},
     "then": {"properties": {"currency": {"const": "EUR"}}}},
    {"if": {"properties": {"office": {"const": "miami"}}, "required": ["office", "currency"]},
     "then": {"properties": {"currency": {"const": "USD"}}}},
]


def properties_schema(ev):
    props = {p["name"]: p["schema"] for p in ev["properties"]}
    schema = {
        "type": "object",
        "additionalProperties": False,
        "required": [p["name"] for p in ev["properties"] if p["required"]],
        "properties": props,
    }
    rules = []
    if "office" in props and "currency" in props:
        rules += copy.deepcopy(OFFICE_CURRENCY_RULE)
    if ev["event_type"] == "kit_cost_variance_detected":
        rules += [{"if": {"properties": {"direction": {"const": "increase"}}}, "then": {"properties": {"variance_pct": {"exclusiveMinimum": 0}}}},
                  {"if": {"properties": {"direction": {"const": "decrease"}}}, "then": {"properties": {"variance_pct": {"exclusiveMaximum": 0}}}}]
    if ev["event_type"] == "stock_threshold_triggered":
        rules += [{"if": {"properties": {"trigger_source": {"const": "outbound_order"}}}, "then": {"required": ["triggering_order_id"]}}]
    if rules:
        schema["allOf"] = rules
    return schema


MULTI_SOURCE = {"page_viewed", "page_load_recorded", "frontend_error_captured"}


def sources_of(ev):
    """Events emitted by both frontends accept either source."""
    if ev["event_type"] in MULTI_SOURCE:
        return ["frontend_backoffice", "frontend_website"]
    return [ev["source"]]


def event_schema(ev):
    envelope_overrides = {
        "event_type": {"const": ev["event_type"]},
        "schemaVersion": {"const": "1.0.0"},
        "context": {"properties": {"source": {"enum": sources_of(ev)}}},
        "properties": properties_schema(ev),
    }
    if ev["auth"]:
        envelope_overrides["userId"] = {"type": "string"}
        envelope_overrides["sessionId"] = {"type": "string"}
    if ev["source"] == "backend_job":
        envelope_overrides["sessionId"] = {"type": "null"}
        envelope_overrides["userId"] = {"type": "null"}
    return {
        "title": ev["event_type"],
        "description": ev["description"],
        "x-origin": ev["origin"],
        "x-category": ev["category"],
        "x-source": sources_of(ev),
        "x-trigger": ev["trigger"],
        "x-rationale": f"Capturamos {ev['event_type']} porque necesitamos saber {ev['hypothesis']}, lo que nos permite {ev['decision']}.",
        "x-delivery": {"mode": ev["delivery"][0], "cadence": ev["delivery"][1], "justification": ev["delivery"][2]},
        "x-pii": ev["pii"],
        "x-throttle": ev["throttle"],
        "x-allowlist": [p["name"] for p in ev["properties"]],
        "allOf": [
            {"$ref": "#/definitions/envelope"},
            {"properties": {k: v for k, v in envelope_overrides.items() if v}},
        ],
        "examples": [example(ev)],
    }


def example(ev):
    source = ev["source"]
    if ev["event_type"] in ("page_viewed", "page_load_recorded", "frontend_error_captured") and ev["example_props"].get("app_area") == "website":
        source = "frontend_website"
    job = source == "backend_job"
    return {
        "eventId": "3b241101-e2bb-4255-8caf-4136c566a962",
        "timestamp": "2026-11-15T10:42:17.123Z",
        "sessionId": None if (job or source == "backend_api" and not ev["auth"]) else "6f1d2c3b-4a5e-4f60-8b7a-9c8d7e6f5a4b",
        "userId": "2c5ea4c0-4067-4a9b-8f3e-1d2c3b4a5f6e" if ev["auth"] else None,
        "event_type": ev["event_type"],
        "schemaVersion": "1.0.0",
        "requestId": "8e7d6c5b-4a39-4b28-9c17-0f1e2d3c4b5a",
        "context": {"source": source, "environment": "production", "appVersion": "e272808"},
        "properties": ev["example_props"],
    }


def build_schema():
    defs = {"envelope": ENVELOPE}
    for ev in E:
        defs[ev["event_type"]] = event_schema(ev)
    return {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "urn:nexova:telemetry:event-schemas:v1",
        "title": "Nexova — catálogo de eventos de telemetría",
        "description": "Generado por docs/telemetry/tools/build_schemas.py. No editar a mano. Un evento es válido si cumple exactamente uno de los esquemas de `definitions` (excepto `envelope`). Las claves `x-*` documentan el plan (origen, categoría, entrega, PII, throttle, allowlist) y los validadores draft-07 las ignoran.",
        "x-envelope-version": ENVELOPE_VERSION,
        "x-event-count": {"total": len(E), "mandatory": sum(e["origin"] == "mandatory" for e in E),
                          "identified": sum(e["origin"] == "identified" for e in E)},
        "oneOf": [{"$ref": f"#/definitions/{ev['event_type']}"} for ev in E],
        "definitions": defs,
    }


# --------------------------------------------------------------------------
# Markdown
# --------------------------------------------------------------------------

def md_type(s):
    t = s["type"]
    if t == "array":
        inner = s["items"]
        return f"array<{inner.get('type')}>" + (f" ∈ {{{', '.join('`'+v+'`' for v in inner['enum'])}}}" if "enum" in inner else "")
    extra = ""
    if "enum" in s:
        extra = " ∈ {" + ", ".join(f"`{v}`" for v in s["enum"]) + "}"
    elif "pattern" in s and s["pattern"] == UUID:
        extra = " (UUID)"
    elif "pattern" in s and s["pattern"] == SLUG:
        extra = " (slug)"
    elif "pattern" in s and s["pattern"] == HASH16:
        extra = " (16 hex)"
    elif "format" in s:
        extra = f" ({s['format']})"
    rng = []
    for k, sym in (("minimum", "≥"), ("exclusiveMinimum", ">"), ("maximum", "≤")):
        if k in s:
            rng.append(f"{sym} {s[k]}")
    return f"{t}{extra}" + (f" ({', '.join(rng)})" if rng else "")


def build_md():
    out = [BEGIN, ""]
    order = [("mandatory", "Obligatorios (BRIEFING §3)"), ("identified", "Oportunidades identificadas")]
    n = 0
    for origin, title in order:
        out.append(f"### {title}\n")
        for ev in [e for e in E if e["origin"] == origin]:
            n += 1
            d = ev["delivery"]
            out.append(f"#### A.{n} `{ev['event_type']}`\n")
            out.append(f"| Campo | Valor |\n|---|---|")
            out.append(f"| Origen | {'**Obligatorio** (BRIEFING)' if origin == 'mandatory' else 'Oportunidad identificada'} |")
            out.append(f"| Categoría | `{ev['category']}` |")
            out.append(f"| Emisor (`context.source`) | {' o '.join('`'+x+'`' for x in sources_of(ev))} |")
            out.append(f"| `userId` / `sessionId` | {'obligatorios (no null)' if ev['auth'] and ev['source'] != 'backend_job' else ('null (job)' if ev['source'] == 'backend_job' else 'pueden ser null (evento anónimo o de sistema)')} |")
            out.append(f"| Descripción | {ev['description']} |")
            out.append(f"| Cuándo se emite | {ev['trigger']} |")
            out.append(f"| Justificación | Capturamos `{ev['event_type']}` porque necesitamos saber **{ev['hypothesis']}**, lo que nos permite **{ev['decision']}**. |")
            out.append(f"| Entrega | **{d[0]}** · {d[1]}. {d[2]} |")
            out.append(f"| PII / sanitización | {ev['pii']} |")
            out.append(f"| Throttle / debounce | {ev['throttle'] or '—'} |")
            out.append(f"| Allowlist | {', '.join('`'+p['name']+'`' for p in ev['properties'])} — **cualquier otra clave se descarta** (§4.3). |")
            out.append("")
            out.append("| Propiedad | Tipo | Oblig. | Descripción |\n|---|---|---|---|")
            for p in ev["properties"]:
                out.append(f"| `{p['name']}` | {md_type(p['schema'])} | {'sí' if p['required'] else 'no'} | {p['schema']['description']} |")
            out.append("")
            out.append("<details><summary>Ejemplo válido</summary>\n")
            out.append("```json\n" + json.dumps(example(ev), ensure_ascii=False, indent=2) + "\n```\n</details>\n")
    out.append(END)
    return "\n".join(out)


# --------------------------------------------------------------------------
# Validation
# --------------------------------------------------------------------------

def validate(schema):
    import jsonschema

    jsonschema.Draft7Validator.check_schema(schema)
    v = jsonschema.Draft7Validator(schema, format_checker=jsonschema.Draft7Validator.FORMAT_CHECKER)
    names = [e["event_type"] for e in E]
    assert len(names) == len(set(names)), "event_type duplicado"
    for ev in E:
        assert re.fullmatch(r"[a-z]+(_[a-z]+)+", ev["event_type"]), ev["event_type"]
        ex = example(ev)
        errs = list(v.iter_errors(ex))
        assert not errs, f"{ev['event_type']}: ejemplo inválido: {[e.message for e in errs][:3]}"
        bad = copy.deepcopy(ex)
        bad["properties"]["candidate_name"] = "Ana Pérez"
        assert list(v.iter_errors(bad)), f"{ev['event_type']}: una clave fuera del allowlist NO fue rechazada"
        if "office" in ex["properties"] and "currency" in ex["properties"]:
            bad = copy.deepcopy(ex)
            bad["properties"]["currency"] = "USD" if ex["properties"]["office"] == "valencia" else "EUR"
            assert list(v.iter_errors(bad)), f"{ev['event_type']}: office/currency incoherentes NO fue rechazado"
        bad = copy.deepcopy(ex)
        bad["timestamp"] = "15/11/2026 10:42"
        assert list(v.iter_errors(bad)), f"{ev['event_type']}: timestamp no ISO NO fue rechazado"
    mandatory = {"inbound_order_created", "outbound_order_created", "stock_threshold_triggered",
                 "direct_stock_edit_rejected", "kit_cost_variance_detected"}
    assert mandatory == {e["event_type"] for e in E if e["origin"] == "mandatory"}
    core = {"office", "product_id", "product_category", "programme_id", "quantity", "currency"}
    for ev in E:
        if ev["event_type"] in mandatory:
            req = {p["name"] for p in ev["properties"] if p["required"]}
            assert core <= req, f"{ev['event_type']} no exige los 6 campos mínimos del BRIEFING"
    return len(E)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="falla si los archivos generados están desactualizados")
    args = ap.parse_args()

    schema = build_schema()
    count = validate(schema)
    schema_text = json.dumps(schema, ensure_ascii=False, indent=2) + "\n"
    plan = PLAN_PATH.read_text(encoding="utf-8")
    if BEGIN not in plan or END not in plan:
        sys.exit(f"Faltan los marcadores {BEGIN!r} / {END!r} en {PLAN_PATH}")
    new_plan = plan[: plan.index(BEGIN)] + build_md() + plan[plan.index(END) + len(END):]

    if args.check:
        stale = []
        if SCHEMA_PATH.read_text(encoding="utf-8") != schema_text:
            stale.append(str(SCHEMA_PATH))
        if plan != new_plan:
            stale.append(str(PLAN_PATH))
        if stale:
            sys.exit("Desactualizado: " + ", ".join(stale))
    else:
        SCHEMA_PATH.write_text(schema_text, encoding="utf-8")
        PLAN_PATH.write_text(new_plan, encoding="utf-8")
    by_cat = {}
    for e in E:
        by_cat[e["category"]] = by_cat.get(e["category"], 0) + 1
    print(f"OK: {count} eventos ({sum(e['origin']=='mandatory' for e in E)} obligatorios, "
          f"{sum(e['origin']=='identified' for e in E)} identificados) · categorías {by_cat} · "
          f"stream={sum(e['delivery'][0]=='stream' for e in E)} batch={sum(e['delivery'][0]=='batch' for e in E)}")


if __name__ == "__main__":
    main()

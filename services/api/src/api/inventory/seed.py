"""Seed the inventory with the data suggested by nexova-BRIEFING.es.md §5.

* 7 material items covering the 3 categories (training_kit, certification,
  onboarding_equipment) and 4 programmes, in Valencia (EUR) and Miami (USD).
* 14 inbound orders (with unit cost and supplier) and 13 outbound orders
  (with recipient type), in chronological order so stock never goes negative.
* Prepared cases for the mandatory telemetry metrics:
  - stock_threshold_triggered ×2: "Kit de certificación en ventas B2B"
    (Valencia, stock 6, min 5) and "Manual de onboarding — soporte" (Miami,
    stock 11, min 10): one more outbound of 2 crosses the minimum.
  - kit_cost_variance_detected ×1: the ventas-b2b kit has 5 inbound orders
    from Imprenta Levante at ~18.60 EUR; an inbound at 21.40 EUR is +15 %.

Usage (from services/api, after seeding suppliers with ``python seed.py``):
    uv run python -m api.inventory.seed
"""

from datetime import UTC, datetime, timedelta

from sqlmodel import Session, select

from api.db import _get_engine, init_db
from api.inventory.models import TalentAsset, TalentEntry, TalentExit

SEED_USER = "seed-system"

# (key, name, category, programme, office, min_stock, description)
PRODUCTS = [
    ("ventas_kit_val", "Kit de certificación en ventas B2B", "certification", "ventas-b2b", "valencia", 5,
     "Material impreso y evaluación del programa de ventas B2B"),
    ("manual_soporte_mia", "Manual de onboarding — soporte", "training_kit", "soporte-onboarding", "miami", 10,
     "Manual para los agentes de soporte outsourced"),
    ("credencial_mia", "Credencial de acceso", "onboarding_equipment", "soporte-onboarding", "miami", 5,
     "Tarjeta de acceso a oficina y herramientas"),
    ("laptop_mia", "Laptop de asignación temporal", "onboarding_equipment", "onboarding-general", "miami", 3,
     "Equipo para las primeras semanas de una incorporación"),
    ("laptop_val", "Laptop de asignación temporal", "onboarding_equipment", "onboarding-general", "valencia", 2,
     "Equipo para las primeras semanas de una incorporación"),
    ("liderazgo_kit_val", "Kit de liderazgo básico", "training_kit", "liderazgo-basico", "valencia", 5,
     "Cuadernillo y casos prácticos del programa de liderazgo"),
    ("liderazgo_cert_val", "Certificado de liderazgo básico", "certification", "liderazgo-basico", "valencia", 4,
     "Certificación digital emitida por la plataforma de e-learning"),
]

# Chronological ledger per product: (days_ago, kind, quantity, unit_cost | recipient_type, supplier name)
LEDGER = {
    "ventas_kit_val": [
        (115, "in", 20, 18.40, "Imprenta Levante"), (100, "in", 15, 18.60, "Imprenta Levante"),
        (95, "out", 20, "client", None), (80, "in", 15, 18.50, "Imprenta Levante"),
        (70, "out", 18, "candidate", None), (55, "in", 10, 18.70, "Imprenta Levante"),
        (45, "out", 14, "client", None), (30, "in", 10, 18.80, "Imprenta Levante"),
        (20, "out", 12, "consultant", None),
    ],  # → stock 6, min 5
    "manual_soporte_mia": [
        (90, "in", 30, 12.00, "Miami Print & Training Supplies"), (75, "out", 15, "support_agent", None),
        (60, "in", 20, 12.20, "Miami Print & Training Supplies"), (40, "out", 14, "support_agent", None),
        (15, "out", 10, "support_agent", None),
    ],  # → stock 11, min 10
    "credencial_mia": [
        (85, "in", 40, 4.50, "TechRent Florida"), (50, "out", 10, "support_agent", None),
        (10, "out", 5, "consultant", None),
    ],  # → 25
    "laptop_mia": [
        (80, "in", 6, 900.00, "TechRent Florida"), (35, "in", 6, 910.00, "TechRent Florida"),
        (25, "out", 4, "support_agent", None),
    ],  # → 8
    "laptop_val": [(70, "in", 6, 850.00, "Equipos Turia"), (12, "out", 2, "consultant", None)],  # → 4
    "liderazgo_kit_val": [
        (65, "in", 15, 22.00, "Imprenta Levante"), (28, "in", 10, 22.30, "Imprenta Levante"),
        (18, "out", 11, "client", None),
    ],  # → 14
    "liderazgo_cert_val": [(50, "in", 12, 35.00, "Udemy Business"), (8, "out", 3, "candidate", None)],  # → 9
}


def _supplier_ids() -> dict[str, str]:
    """Supplier directory ids by name (TinyDB doc_id as string)."""
    try:
        from database import suppliers_table  # top-level module of services/api
    except ImportError:
        return {}
    return {record["name"]: str(record.doc_id) for record in suppliers_table.all()}


def seed_data() -> None:
    init_db()
    supplier_ids = _supplier_ids()
    now = datetime.now(UTC)

    with Session(_get_engine()) as session:
        existing = session.exec(select(TalentAsset)).all()
        if existing:
            print(f"Database already has {len(existing)} products — skipping seed.")
            return

        products: dict[str, TalentAsset] = {}
        for key, name, category, programme, office, min_stock, description in PRODUCTS:
            product = TalentAsset(
                name=name, product_category=category, programme_id=programme, office=office,
                min_stock=min_stock, description=description,
            )
            session.add(product)
            products[key] = product
        session.flush()

        inbound = outbound = 0
        for key, events in LEDGER.items():
            for days_ago, kind, quantity, detail, supplier in events:
                created_at = now - timedelta(days=days_ago)
                if kind == "in":
                    session.add(TalentEntry(
                        talent_asset_id=products[key].id, quantity=quantity, unit_cost=detail,
                        supplier_id=supplier_ids.get(supplier, supplier), created_at=created_at,
                        user_uuid=SEED_USER, notes="Lote inicial (seed)",
                    ))
                    inbound += 1
                else:
                    session.add(TalentExit(
                        talent_asset_id=products[key].id, quantity=quantity, recipient_type=detail,
                        created_at=created_at, user_uuid=SEED_USER, notes="Entrega (seed)",
                    ))
                    outbound += 1
        session.commit()

    missing = sorted({s for events in LEDGER.values() for *_, s in events if s and s not in supplier_ids})
    print(f"Seeded {len(PRODUCTS)} products, {inbound} inbound orders, {outbound} outbound orders.")
    if missing:
        print(f"⚠️ Suppliers not found in the directory (run `python seed.py` first): {missing}")


if __name__ == "__main__":
    seed_data()

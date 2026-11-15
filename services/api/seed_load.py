"""Load seeder — realistic volume for performance / caching measurements.

The base seeds (``api.inventory.seed`` and ``seed.py``) create a handful of
rows: with that volume every endpoint answers in a few milliseconds and the
timing middleware cannot tell us where caching pays off. This script inserts
a *coherent* data set at realistic volume:

* ~270 TalentAssets: 45 real roles × 3 seniorities × 2 countries (Chile /
  Argentina — the partition key from CONTEXT.md).
* ~40k TalentEntries and ~16k TalentExits spread over 24 months. The ledger is
  generated chronologically per asset, so stock never goes negative (the same
  invariant the API enforces on outbound orders).
* ~600 suppliers with the currency rule of the model (Spain → EUR, USA → USD),
  rates in a plausible range per category and renewal dates spread over time.

Deterministic (``random.seed``) so before/after measurements are comparable.

Usage (from ``services/api``, with DATABASE_URL / SUPPLIERS_DB_PATH set):

    uv run python seed_load.py            # inventory + suppliers
    uv run python seed_load.py --reset    # wipe inventory tables first

Never run against a shared / production database: it inserts tens of
thousands of synthetic rows.
"""

from __future__ import annotations

import argparse
import random
import time
from datetime import UTC, date, datetime, timedelta
from uuid import UUID

from sqlmodel import Session, delete, func, select

from api.db import _get_engine, init_db
from api.inventory.models import TalentAsset, TalentEntry, TalentExit

RNG = random.Random(20261115)

ROLES: dict[str, list[str]] = {
    "Engineering": [
        "Full-Stack Developer", "Backend Developer (Python)", "Backend Developer (Java)",
        "Frontend Developer (React)", "Mobile Developer (Flutter)", "DevOps Engineer",
        "Site Reliability Engineer", "QA Automation Engineer", "Tech Lead",
        "Engineering Manager", "Cloud Architect", "Security Engineer",
    ],
    "Data": [
        "Data Scientist", "Data Engineer", "Data Analyst", "ML Engineer",
        "BI Developer", "Analytics Engineer",
    ],
    "Design": ["UX Researcher", "UI Designer", "Product Designer", "UX Writer"],
    "Product": ["Product Manager", "Product Owner", "Scrum Master", "Business Analyst"],
    "Consulting": [
        "Executive Headhunter", "HR Business Partner", "Compensation Analyst",
        "Talent Acquisition Specialist", "Organizational Development Consultant",
    ],
    "Finance": ["Controller", "Financial Analyst", "Payroll Specialist", "Treasury Analyst"],
    "Sales": [
        "Account Executive", "Sales Development Representative",
        "Key Account Manager", "Customer Success Manager",
    ],
    "Operations": [
        "Supply Chain Analyst", "Operations Manager", "Project Manager",
        "Procurement Specialist", "Logistics Coordinator", "Facilities Manager",
    ],
}
SENIORITIES = ["Junior", "Semi-Senior", "Senior"]
COUNTRIES = ["Chile", "Argentina"]
FOCUS = {
    "Chile": ["banca y seguros", "minería", "retail", "telecomunicaciones", "sector público"],
    "Argentina": ["fintech", "agroindustria", "e-commerce", "energía", "servicios profesionales"],
}

ENTRY_SOURCES = [
    "Campaña LinkedIn Recruiter", "Referido por consultor", "Base histórica reactivada",
    "Feria laboral universitaria", "Postulación orgánica web Nexova", "Bootcamp partner",
    "Comunidad tech (meetup)", "Headhunting directo", "Programa de trainees",
]
CLIENTS = {
    "Chile": [
        "Banco Andino", "Retail Austral", "Minera Atacama", "Telco Pacífico",
        "Seguros Cordillera", "Salud Integral CL", "Logística Valparaíso",
    ],
    "Argentina": [
        "Fintech del Plata", "Agro Pampa SA", "Energía Patagonia", "Mercado Sur",
        "Software Rosario", "Consultora Belgrano", "Laboratorios Cuyo",
    ],
}
# 25 internal consultants (stable fake UUIDs; real users live in TinyDB).
CONSULTANTS = [str(UUID(int=RNG.getrandbits(128), version=4)) for _ in range(25)]

PERIOD_DAYS = 730


def _when(day_offset: float) -> datetime:
    start = datetime.now(UTC) - timedelta(days=PERIOD_DAYS)
    return start + timedelta(days=day_offset, minutes=RNG.randint(0, 600))


def build_inventory() -> tuple[list[TalentAsset], list[TalentEntry], list[TalentExit]]:
    assets: list[TalentAsset] = []
    entries: list[TalentEntry] = []
    exits: list[TalentExit] = []

    for category, roles in ROLES.items():
        for role in roles:
            for seniority in SENIORITIES:
                for country in COUNTRIES:
                    asset = TalentAsset(
                        name=f"{role} {seniority}",
                        skill_category=category,
                        country=country,
                        description=f"Perfil {seniority.lower()} con foco en {RNG.choice(FOCUS[country])}",
                    )
                    assets.append(asset)

                    # Demand differs by role: engineering/data move more volume.
                    volume = {"Engineering": 1.6, "Data": 1.3}.get(category, 1.0)
                    n_entries = int(RNG.randint(60, 150) * volume)
                    events = []
                    for _ in range(n_entries):
                        events.append(("in", RNG.uniform(0, PERIOD_DAYS), RNG.randint(1, 6)))
                    # Placements: roughly 35–45% of entries become an exit attempt.
                    for _ in range(int(n_entries * RNG.uniform(0.35, 0.45))):
                        events.append(("out", RNG.uniform(0, PERIOD_DAYS), RNG.randint(1, 4)))
                    events.sort(key=lambda e: e[1])

                    stock = 0
                    for kind, day, qty in events:
                        if kind == "in":
                            stock += qty
                            entries.append(TalentEntry(
                                talent_asset_id=asset.id, quantity=qty,
                                notes=RNG.choice(ENTRY_SOURCES), created_at=_when(day),
                                user_uuid=RNG.choice(CONSULTANTS),
                            ))
                        elif stock > 0:  # same invariant as the API: never below zero
                            qty = min(qty, stock)
                            stock -= qty
                            exits.append(TalentExit(
                                talent_asset_id=asset.id, quantity=qty,
                                notes=f"Colocados en {RNG.choice(CLIENTS[country])}",
                                created_at=_when(day), user_uuid=RNG.choice(CONSULTANTS),
                            ))
    return assets, entries, exits


SUPPLIER_CATEGORIES = {
    "job_boards": (150, 1800), "ats_software": (200, 1500), "assessment_tools": (120, 900),
    "training_platforms": (200, 2500), "payroll_and_hr_software": (180, 1400),
    "video_interview": (150, 900), "background_check": (90, 700),
    "office_and_facilities": (400, 6000), "it_and_software_licenses": (60, 3000),
}
NAME_A = ["Talent", "Hire", "People", "Work", "Skill", "Career", "Staff", "Team", "Nova", "Prime",
          "Smart", "Blue", "Open", "Clear", "Bright", "North", "Iberia", "Atlantic", "Metro", "Core"]
NAME_B = ["Link", "Hub", "Flow", "Desk", "Base", "Works", "Point", "Bridge", "Scope", "Path",
          "Labs", "Suite", "Cloud", "Check", "Match", "Track", "Gate", "Forge", "Pulse", "Line"]
SUFFIX = {"Spain": ["S.L.", "S.A.", "Ibérica", "España"], "USA": ["Inc.", "LLC", "Corp.", "Group"]}


def build_suppliers(count: int) -> list[dict]:
    suppliers = []
    used: set[str] = set()
    while len(suppliers) < count:
        country = RNG.choice(["Spain", "USA"])
        name = f"{RNG.choice(NAME_A)}{RNG.choice(NAME_B)} {RNG.choice(SUFFIX[country])}"
        if name in used:
            continue
        used.add(name)
        cats = RNG.sample(list(SUPPLIER_CATEGORIES), k=RNG.choice([1, 1, 1, 2, 2, 3]))
        low, high = SUPPLIER_CATEGORIES[cats[0]]
        renewal = date.today() + timedelta(days=RNG.randint(-90, 900))
        slug = name.split()[0].lower()
        suppliers.append({
            "name": name,
            "country": country,
            "categories": cats,
            "monthly_rate": round(RNG.uniform(low, high), 2),
            "currency": "EUR" if country == "Spain" else "USD",
            "status": "active" if RNG.random() < 0.85 else "suspended",
            "contract_renewal_date": renewal.isoformat() if RNG.random() < 0.8 else None,
            "contact_email": f"accounts@{slug}.{'es' if country == 'Spain' else 'com'}",
            "notes": RNG.choice([None, "Contrato anual con revisión de tarifa en Q1.",
                                 "Uso compartido entre Valencia y Miami.",
                                 "Pendiente de evaluar alternativa más económica."]),
            "updated_at": datetime.now(UTC).isoformat(),
        })
    return suppliers


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--reset", action="store_true", help="delete inventory rows first")
    parser.add_argument("--suppliers", type=int, default=600)
    args = parser.parse_args()

    init_db()
    engine = _get_engine()
    t0 = time.perf_counter()
    with Session(engine) as session:
        if args.reset:
            for model in (TalentExit, TalentEntry, TalentAsset):
                session.exec(delete(model))
            session.commit()
        before = {
            "assets": session.exec(select(func.count()).select_from(TalentAsset)).one(),
            "entries": session.exec(select(func.count()).select_from(TalentEntry)).one(),
            "exits": session.exec(select(func.count()).select_from(TalentExit)).one(),
        }
        assets, entries, exits = build_inventory()
        session.add_all(assets)
        session.flush()
        session.add_all(entries)
        session.add_all(exits)
        session.commit()

    from database import suppliers_table  # TinyDB, path from SUPPLIERS_DB_PATH

    suppliers_before = len(suppliers_table)
    suppliers_table.insert_multiple(build_suppliers(args.suppliers))

    print(f"Inventory before: {before}")
    print(f"Inserted: {len(assets)} assets, {len(entries)} entries, {len(exits)} exits")
    print(f"Suppliers: {suppliers_before} → {len(suppliers_table)}")
    print(f"Done in {time.perf_counter() - t0:.1f}s")


if __name__ == "__main__":
    main()

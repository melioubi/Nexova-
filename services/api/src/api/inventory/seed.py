"""Seed the inventory tables with the initial data from CONTEXT.md.

Usage:
    uv run python -m api.inventory.seed
"""

from sqlmodel import Session, select

from api.db import _get_engine, init_db
from api.inventory.models import TalentAsset, TalentEntry, TalentExit


SEED_ASSETS = [
    {"name": "Full-Stack Developer", "skill_category": "Engineering", "country": "Chile",
     "description": "Perfiles senior full-stack"},
    {"name": "Data Scientist", "skill_category": "Data", "country": "Chile",
     "description": "Especialistas en datos y ML"},
    {"name": "Executive Headhunter", "skill_category": "Consulting", "country": "Argentina",
     "description": "Headhunters senior"},
    {"name": "UX Researcher", "skill_category": "Design", "country": "Argentina",
     "description": "Investigadores de experiencia de usuario"},
]


def seed_data():
    init_db()
    engine = _get_engine()
    created_count = 0

    with Session(engine) as session:
        # Check if already seeded
        existing = session.exec(select(TalentAsset)).all()
        if existing:
            print(f"Database already has {len(existing)} talent assets — skipping seed.")
            return

        # Create assets
        asset_map: dict[str, TalentAsset] = {}
        for data in SEED_ASSETS:
            asset = TalentAsset(**data)
            session.add(asset)
            asset_map[data["name"]] = asset
            created_count += 1

        session.flush()  # get IDs

        # Create entries (inbound)
        entries_data = [
            ("Full-Stack Developer", 15, "Stock inicial pipeline"),
            ("Data Scientist", 10, "Stock inicial pipeline"),
            ("Executive Headhunter", 8, "Stock inicial pipeline"),
            ("UX Researcher", 5, "Stock inicial pipeline"),
        ]
        for name, qty, notes in entries_data:
            entry = TalentEntry(
                talent_asset_id=asset_map[name].id,
                quantity=qty,
                notes=notes,
                user_uuid="seed-system",
            )
            session.add(entry)

        # Create exits (outbound)
        exits_data = [
            ("Full-Stack Developer", 3, "Colocados en TechCorp Chile"),
            ("Executive Headhunter", 2, "Colocados en Fintech AR"),
        ]
        for name, qty, notes in exits_data:
            exit_ = TalentExit(
                talent_asset_id=asset_map[name].id,
                quantity=qty,
                notes=notes,
                user_uuid="seed-system",
            )
            session.add(exit_)

        session.commit()

        print(f"Seeded {created_count} talent assets, {len(entries_data)} entries, {len(exits_data)} exits.")
        print("\nStock neto resultante:")
        print(f"  Full-Stack Developer (Chile):     15 - 3 = 12")
        print(f"  Data Scientist (Chile):           10 - 0 = 10")
        print(f"  Executive Headhunter (Argentina):  8 - 2 =  6")
        print(f"  UX Researcher (Argentina):         5 - 0 =  5")


if __name__ == "__main__":
    seed_data()
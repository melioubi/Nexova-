"""SQLModel ORM models for Nexova inventory management.

All inventory entities live in Supabase (PostgreSQL).  Authentication data
remains in TinyDB — the *user_uuid* column on Entry/Exit is a plain string
reference (no FK constraint, no user-table replication).
"""

from datetime import UTC, datetime
from uuid import uuid4

from sqlmodel import Field, SQLModel


class TalentAsset(SQLModel, table=True):
    """A category of talent that Nexova manages as inventory.

    Maps to CONTEXT.md ``TalentAsset`` — the "product" entity for this domain.
    Stock is never stored here; it is derived from the entry/exit ledger.
    """

    __tablename__ = "talent_assets"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    name: str = Field(min_length=1, max_length=200)
    skill_category: str = Field(min_length=1, max_length=100)
    country: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)


class TalentEntry(SQLModel, table=True):
    """An inbound order that adds talent units to the pipeline.

    Each entry is traceable to the authenticated user who created it.
    """

    __tablename__ = "talent_entries"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    talent_asset_id: str = Field(foreign_key="talent_assets.id", index=True)
    quantity: int = Field(gt=0)
    notes: str | None = Field(default=None, max_length=500)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    user_uuid: str = Field(min_length=1)


class TalentExit(SQLModel, table=True):
    """An outbound order that removes talent units from the pipeline.

    Each exit is traceable to the authenticated user who created it.
    A negative-stock check must be performed *before* persisting a row.
    """

    __tablename__ = "talent_exits"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    talent_asset_id: str = Field(foreign_key="talent_assets.id", index=True)
    quantity: int = Field(gt=0)
    notes: str | None = Field(default=None, max_length=500)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    user_uuid: str = Field(min_length=1)
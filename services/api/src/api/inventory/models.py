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
    # Legacy fields from the talent-inventory milestone (kept so existing data
    # and endpoints keep working). The BRIEFING dimensions below replace them.
    skill_category: str = Field(default="", max_length=100)
    country: str = Field(default="", max_length=100)
    description: str | None = Field(default=None, max_length=500)
    # nexova-BRIEFING §2: material de formación / kits de incorporación.
    office: str = Field(default="valencia", max_length=20)               # valencia | miami
    product_category: str = Field(default="training_kit", max_length=40)  # training_kit | certification | onboarding_equipment
    programme_id: str = Field(default="general", max_length=64)          # slug, e.g. ventas-b2b
    min_stock: int = Field(default=5, ge=0)                               # stock_threshold_triggered


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
    # nexova-BRIEFING §3 (inbound_order_created, kit_cost_variance_detected).
    # Nullable only for rows created before these fields existed; the API
    # requires them for every new inbound order.
    unit_cost: float | None = Field(default=None, ge=0)
    supplier_id: str | None = Field(default=None, max_length=64)


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
    # nexova-BRIEFING §2: who receives the kit (never their identity).
    recipient_type: str | None = Field(default=None, max_length=20)  # client | candidate | consultant | support_agent

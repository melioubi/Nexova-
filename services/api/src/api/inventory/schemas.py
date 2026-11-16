"""Pydantic schemas for Nexova inventory management.

These are **separate** from the SQLModel ORM classes in ``models.py``.
Endpoints never return ORM objects directly — they return these schemas.

Vocabulary follows nexova-BRIEFING.es.md §2: a "product" is an item of
training/certification material or an onboarding kit, it belongs to an
``office`` (valencia | miami) and a ``programme``; money is always in the
office currency (EUR for Valencia, USD for Miami) and never converted.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Office = Literal["valencia", "miami"]
ProductCategory = Literal["training_kit", "certification", "onboarding_equipment"]
RecipientType = Literal["client", "candidate", "consultant", "support_agent"]
Currency = Literal["EUR", "USD"]

CURRENCY_BY_OFFICE: dict[str, Currency] = {"valencia": "EUR", "miami": "USD"}
PROGRAMME_PATTERN = r"^[a-z0-9]+(-[a-z0-9]+)*$"


def currency_for(office: str) -> Currency:
    return CURRENCY_BY_OFFICE.get(office, "EUR")


# ---------------------------------------------------------------------------
# Product (TalentAsset table)
# ---------------------------------------------------------------------------

class TalentAssetCreate(BaseModel):
    # extra="forbid": a stock value can never be set through the product
    # payload (BRIEFING §6 — stock only changes through orders).
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=200)
    office: Office = "valencia"
    product_category: ProductCategory = "training_kit"
    programme_id: str = Field(default="general", pattern=PROGRAMME_PATTERN, max_length=64)
    min_stock: int = Field(default=5, ge=0)
    description: str | None = Field(default=None, max_length=500)
    # Legacy (talent-inventory milestone), optional.
    skill_category: str = Field(default="", max_length=100)
    country: str = Field(default="", max_length=100)


class TalentAssetUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=200)
    min_stock: int | None = Field(default=None, ge=0)
    description: str | None = Field(default=None, max_length=500)


class TalentAssetPublic(BaseModel):
    """Public representation of a product, including computed stock."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    office: Office
    product_category: ProductCategory
    programme_id: str
    currency: Currency
    min_stock: int
    description: str | None
    current_stock: int = Field(default=0, ge=0)
    skill_category: str
    country: str


# ---------------------------------------------------------------------------
# InboundOrder (TalentEntry table)
# ---------------------------------------------------------------------------

class TalentEntryCreate(BaseModel):
    talent_asset_id: str
    quantity: int = Field(gt=0)
    unit_cost: float = Field(ge=0, allow_inf_nan=False)
    supplier_id: str = Field(min_length=1, max_length=64)
    notes: str | None = Field(default=None, max_length=500)


class CostVariance(BaseModel):
    """Present when the unit cost deviates more than the threshold from the
    history of the same product + supplier (kit_cost_variance_detected)."""

    baseline_unit_cost: float
    variance_pct: float
    direction: Literal["increase", "decrease"]
    threshold_pct: float
    baseline_sample_size: int


class TalentEntryPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    talent_asset_id: str
    quantity: int
    unit_cost: float | None
    supplier_id: str | None
    notes: str | None
    created_at: datetime
    user_uuid: str
    stock_after: int = 0
    cost_variance: CostVariance | None = None


# ---------------------------------------------------------------------------
# OutboundOrder (TalentExit table)
# ---------------------------------------------------------------------------

class TalentExitCreate(BaseModel):
    talent_asset_id: str
    quantity: int = Field(gt=0)
    recipient_type: RecipientType
    notes: str | None = Field(default=None, max_length=500)


class TalentExitPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    talent_asset_id: str
    quantity: int
    recipient_type: str | None
    notes: str | None
    created_at: datetime
    user_uuid: str
    stock_before: int = 0
    stock_after: int = 0
    min_stock: int = 0
    threshold_triggered: bool = False


# ---------------------------------------------------------------------------
# Order list response
# ---------------------------------------------------------------------------

class OrderPublic(BaseModel):
    """Union-like structure for listing orders with product info."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    type: str  # "inbound" | "outbound"
    talent_asset_id: str
    talent_asset_name: str
    office: str
    programme_id: str
    product_category: str
    skill_category: str
    country: str
    quantity: int
    notes: str | None
    created_at: datetime
    user_uuid: str

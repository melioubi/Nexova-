"""Pydantic schemas for Nexova inventory management.

These are **separate** from the SQLModel ORM classes in ``models.py``.
Endpoints never return ORM objects directly — they return these schemas.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# TalentAsset (equivalente a producto)
# ---------------------------------------------------------------------------

class TalentAssetCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    skill_category: str = Field(min_length=1, max_length=100)
    country: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)


class TalentAssetUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    skill_category: str | None = Field(default=None, min_length=1, max_length=100)
    country: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)


class TalentAssetPublic(BaseModel):
    """Public representation of a talent asset, including computed stock."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    skill_category: str
    country: str
    description: str | None
    current_stock: int = Field(default=0, ge=0)


# ---------------------------------------------------------------------------
# TalentEntry (orden de entrada / inbound)
# ---------------------------------------------------------------------------

class TalentEntryCreate(BaseModel):
    talent_asset_id: str
    quantity: int = Field(gt=0)
    notes: str | None = Field(default=None, max_length=500)


class TalentEntryPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    talent_asset_id: str
    quantity: int
    notes: str | None
    created_at: datetime
    user_uuid: str


# ---------------------------------------------------------------------------
# TalentExit (orden de salida / outbound)
# ---------------------------------------------------------------------------

class TalentExitCreate(BaseModel):
    talent_asset_id: str
    quantity: int = Field(gt=0)
    notes: str | None = Field(default=None, max_length=500)


class TalentExitPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    talent_asset_id: str
    quantity: int
    notes: str | None
    created_at: datetime
    user_uuid: str


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
    skill_category: str
    country: str
    quantity: int
    notes: str | None
    created_at: datetime
    user_uuid: str
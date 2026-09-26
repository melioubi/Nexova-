"""Business logic for Nexova inventory management."""

from sqlmodel import Session, func, select

from api.inventory.models import TalentAsset, TalentEntry, TalentExit
from api.inventory.schemas import (
    OrderPublic,
    TalentAssetCreate,
    TalentAssetPublic,
    TalentEntryCreate,
    TalentEntryPublic,
    TalentExitCreate,
    TalentExitPublic,
)


# ---------------------------------------------------------------------------
# TalentAsset helpers
# ---------------------------------------------------------------------------

def _compute_stock(session: Session, asset_id: str, country: str) -> int:
    """Calculate ``current_stock`` as SUM(entries) - SUM(exits) for one asset
    within its country partition.

    Each ``TalentAsset`` belongs to exactly one country, so filtering by
    ``talent_asset_id`` on entry/exit rows already respects the partition.
    """
    total_in = session.exec(
        select(func.coalesce(func.sum(TalentEntry.quantity), 0)).where(
            TalentEntry.talent_asset_id == asset_id,
        )
    ).one()

    total_out = session.exec(
        select(func.coalesce(func.sum(TalentExit.quantity), 0)).where(
            TalentExit.talent_asset_id == asset_id,
        )
    ).one()

    return int(total_in) - int(total_out)


def _asset_to_public(asset: TalentAsset, stock: int) -> TalentAssetPublic:
    return TalentAssetPublic(
        id=asset.id,
        name=asset.name,
        skill_category=asset.skill_category,
        country=asset.country,
        description=asset.description,
        current_stock=stock,
    )


def list_assets(session: Session) -> list[TalentAssetPublic]:
    assets = session.exec(select(TalentAsset)).all()
    return [_asset_to_public(a, _compute_stock(session, a.id, a.country)) for a in assets]


def get_asset(session: Session, asset_id: str) -> TalentAssetPublic | None:
    asset = session.get(TalentAsset, asset_id)
    if asset is None:
        return None
    stock = _compute_stock(session, asset.id, asset.country)
    return _asset_to_public(asset, stock)


def create_asset(session: Session, data: TalentAssetCreate) -> TalentAssetPublic:
    asset = TalentAsset(**data.model_dump())
    session.add(asset)
    session.commit()
    session.refresh(asset)
    return _asset_to_public(asset, 0)


# ---------------------------------------------------------------------------
# TalentEntry (inbound)
# ---------------------------------------------------------------------------

def create_entry(session: Session, data: TalentEntryCreate, user_uuid: str) -> TalentEntryPublic:
    entry = TalentEntry(**data.model_dump(), user_uuid=user_uuid)
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return TalentEntryPublic.model_validate(entry, from_attributes=True)


# ---------------------------------------------------------------------------
# TalentExit (outbound) — with negative-stock guard
# ---------------------------------------------------------------------------

def create_exit(session: Session, data: TalentExitCreate, user_uuid: str) -> TalentExitPublic:
    # Load asset to get the country partition
    asset = session.get(TalentAsset, data.talent_asset_id)
    if asset is None:
        raise ValueError("Talent asset not found")

    current_stock = _compute_stock(session, asset.id, asset.country)
    if data.quantity > current_stock:
        raise ValueError(
            f"Insufficient stock: requested {data.quantity}, available {current_stock} "
            f"for '{asset.name}' in {asset.country}"
        )

    exit_ = TalentExit(**data.model_dump(), user_uuid=user_uuid)
    session.add(exit_)
    session.commit()
    session.refresh(exit_)
    return TalentExitPublic.model_validate(exit_, from_attributes=True)


# ---------------------------------------------------------------------------
# Orders listing (entries + exits combined)
# ---------------------------------------------------------------------------

def list_orders(session: Session) -> list[OrderPublic]:
    entries = session.exec(select(TalentEntry)).all()
    exits = session.exec(select(TalentExit)).all()

    # Preload all referenced assets to avoid N+1 queries
    asset_ids = {e.talent_asset_id for e in entries} | {ex.talent_asset_id for ex in exits}
    assets = session.exec(select(TalentAsset).where(TalentAsset.id.in_(asset_ids))).all()
    asset_map: dict[str, TalentAsset] = {a.id: a for a in assets}

    orders: list[OrderPublic] = []

    def _asset_info(asset_id: str) -> tuple[str, str, str]:
        asset = asset_map.get(asset_id)
        if asset:
            return (asset.name, asset.skill_category, asset.country)
        return ("Unknown", "", "")

    for e in entries:
        name, skill, country = _asset_info(e.talent_asset_id)
        orders.append(OrderPublic(
            id=e.id,
            type="inbound",
            talent_asset_id=e.talent_asset_id,
            talent_asset_name=name,
            skill_category=skill,
            country=country,
            quantity=e.quantity,
            notes=e.notes,
            created_at=e.created_at,
            user_uuid=e.user_uuid,
        ))

    for ex in exits:
        name, skill, country = _asset_info(ex.talent_asset_id)
        orders.append(OrderPublic(
            id=ex.id,
            type="outbound",
            talent_asset_id=ex.talent_asset_id,
            talent_asset_name=name,
            skill_category=skill,
            country=country,
            quantity=ex.quantity,
            notes=ex.notes,
            created_at=ex.created_at,
            user_uuid=ex.user_uuid,
        ))

    return orders
"""Business logic for Nexova inventory management."""

from datetime import UTC, datetime, timedelta

from sqlmodel import Session, col, func, select

from api.core.config import get_settings

from api.inventory.cache import invalidate_products, invalidate_stock_and_orders
from api.inventory.models import TalentAsset, TalentEntry, TalentExit
from api.inventory.schemas import (
    CostVariance,
    OrderPublic,
    TalentAssetCreate,
    TalentAssetPublic,
    TalentEntryCreate,
    TalentEntryPublic,
    TalentExitCreate,
    TalentExitPublic,
    currency_for,
)

# kit_cost_variance_detected (telemetry-plan.md A.5): baseline = mean unit cost
# of the last 5 inbound orders of the same product + supplier in 365 days,
# excluding the current one; at least 3 orders are needed to compare.
COST_BASELINE_MAX = 5
COST_BASELINE_MIN = 3
COST_BASELINE_DAYS = 365


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
        office=asset.office,
        product_category=asset.product_category,
        programme_id=asset.programme_id,
        currency=currency_for(asset.office),
        min_stock=asset.min_stock,
        description=asset.description,
        current_stock=stock,
        skill_category=asset.skill_category or "",
        country=asset.country or "",
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
    invalidate_products()
    return _asset_to_public(asset, 0)


# ---------------------------------------------------------------------------
# TalentEntry (inbound)
# ---------------------------------------------------------------------------

def _cost_variance(session: Session, data: TalentEntryCreate) -> CostVariance | None:
    """Compare the new unit cost with the history of the same product and
    supplier. Same product ⇒ same office ⇒ same currency: no conversion."""
    since = datetime.now(UTC) - timedelta(days=COST_BASELINE_DAYS)
    history = session.exec(
        select(TalentEntry.unit_cost)
        .where(
            TalentEntry.talent_asset_id == data.talent_asset_id,
            TalentEntry.supplier_id == data.supplier_id,
            col(TalentEntry.unit_cost).is_not(None),
            TalentEntry.created_at >= since,
        )
        .order_by(col(TalentEntry.created_at).desc())
        .limit(COST_BASELINE_MAX)
    ).all()
    if len(history) < COST_BASELINE_MIN:
        return None
    baseline = sum(history) / len(history)
    if baseline <= 0:
        return None
    variance = (data.unit_cost - baseline) / baseline * 100
    threshold = get_settings().cost_variance_threshold_pct
    if abs(variance) <= threshold:
        return None
    return CostVariance(
        baseline_unit_cost=round(baseline, 2),
        variance_pct=round(variance, 2),
        direction="increase" if variance > 0 else "decrease",
        threshold_pct=threshold,
        baseline_sample_size=len(history),
    )


def create_entry(session: Session, data: TalentEntryCreate, user_uuid: str) -> TalentEntryPublic:
    asset = session.get(TalentAsset, data.talent_asset_id)
    if asset is None:
        raise LookupError("Talent asset not found")
    variance = _cost_variance(session, data)  # before inserting: excludes this order
    entry = TalentEntry(**data.model_dump(), user_uuid=user_uuid)
    session.add(entry)
    session.commit()
    session.refresh(entry)
    invalidate_stock_and_orders()
    result = TalentEntryPublic.model_validate(entry, from_attributes=True)
    result.stock_after = _compute_stock(session, asset.id, asset.country)
    result.cost_variance = variance
    return result


# ---------------------------------------------------------------------------
# TalentExit (outbound) — with negative-stock guard
# ---------------------------------------------------------------------------

def create_exit(session: Session, data: TalentExitCreate, user_uuid: str) -> TalentExitPublic:
    # Load asset to get the country partition
    asset = session.get(TalentAsset, data.talent_asset_id)
    if asset is None:
        raise ValueError("Talent asset not found")

    # Always computed from the database, never from the cached product list:
    # this check is what prevents negative stock, so it cannot be stale.
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
    invalidate_stock_and_orders()
    result = TalentExitPublic.model_validate(exit_, from_attributes=True)
    result.stock_before = current_stock
    result.stock_after = current_stock - data.quantity
    result.min_stock = asset.min_stock
    # Edge-triggered (telemetry-plan.md §5.3): only when this order crosses
    # the minimum, not on every order while stock stays below it.
    result.threshold_triggered = current_stock >= asset.min_stock > result.stock_after
    return result


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

    def _order(row: TalentEntry | TalentExit, order_type: str) -> OrderPublic:
        asset = asset_map.get(row.talent_asset_id)
        return OrderPublic(
            id=row.id,
            type=order_type,
            talent_asset_id=row.talent_asset_id,
            talent_asset_name=asset.name if asset else "Unknown",
            office=asset.office if asset else "",
            programme_id=asset.programme_id if asset else "",
            product_category=asset.product_category if asset else "",
            skill_category=(asset.skill_category or "") if asset else "",
            country=(asset.country or "") if asset else "",
            quantity=row.quantity,
            notes=row.notes,
            created_at=row.created_at,
            user_uuid=row.user_uuid,
        )

    orders.extend(_order(e, "inbound") for e in entries)
    orders.extend(_order(ex, "outbound") for ex in exits)
    return orders

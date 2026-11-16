"""Inventory router for Nexova — all routes under ``/inventory``.

Product writes and order writes *always* require authentication.
For Nexova, inventory reads also require authentication because talent
pipeline data is commercially sensitive (per CONTEXT.md).
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import TypeAdapter
from sqlmodel import Session

from api.db import get_db
from api.dependencies import get_current_user
from api.inventory import schemas, service
from api.inventory.cache import (
    ORDERS_NS,
    ORDERS_TTL_SECONDS,
    PRODUCTS_NS,
    PRODUCTS_TTL_SECONDS,
    cached_json,
)

router = APIRouter(prefix="/inventory", tags=["inventory"])

CurrentUser = Annotated[dict, Depends(get_current_user)]
DbSession = Annotated[Session, Depends(get_db)]

_assets_adapter = TypeAdapter(list[schemas.TalentAssetPublic])
_orders_adapter = TypeAdapter(list[schemas.OrderPublic])


# ---------------------------------------------------------------------------
# Products / TalentAssets
# ---------------------------------------------------------------------------

@router.get("/products", response_model=list[schemas.TalentAssetPublic])
def list_products(
    session: DbSession,
    current_user: CurrentUser,
) -> Response:
    """List all talent assets with computed ``current_stock``.

    Cached (shared key, TTL 30 s, invalidated by every product/order write).
    The response is the same for every authenticated user.
    """
    return cached_json(
        PRODUCTS_NS, PRODUCTS_TTL_SECONDS, lambda: service.list_assets(session), _assets_adapter
    )


@router.post(
    "/products",
    response_model=schemas.TalentAssetPublic,
    status_code=status.HTTP_201_CREATED,
)
def create_product(
    data: schemas.TalentAssetCreate,
    session: DbSession,
    current_user: CurrentUser,
) -> schemas.TalentAssetPublic:
    """Create a new talent asset (requires authentication)."""
    return service.create_asset(session, data)


@router.get("/products/{asset_id}", response_model=schemas.TalentAssetPublic)
def get_product(
    asset_id: str,
    session: DbSession,
    current_user: CurrentUser,
) -> schemas.TalentAssetPublic:
    """Get a single talent asset with its current stock.

    Deliberately NOT cached: the order forms read it right before registering
    an outbound order, so it must show the real stock (and it is cheap: two
    indexed SUM queries).
    """
    result = service.get_asset(session, asset_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Talent asset not found",
        )
    return result


@router.api_route("/products/{asset_id}/stock", methods=["PUT", "PATCH", "DELETE"])
def reject_direct_stock_edit(
    asset_id: str,
    session: DbSession,
    current_user: CurrentUser,
) -> None:
    """Stock is never modified directly (nexova-BRIEFING §6): every change goes
    through an inbound or outbound order traceable to a user.

    This route exists only to reject such attempts explicitly (405) instead
    of a generic 404, so they can be measured as ``direct_stock_edit_rejected``
    (telemetry-plan.md §3.3).
    """
    if service.get_asset(session, asset_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Talent asset not found")
    raise HTTPException(
        status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
        detail="El stock no se modifica directamente: registra una orden de entrada o de salida.",
        headers={"Allow": ""},
    )


# ---------------------------------------------------------------------------
# Orders — inbound / outbound
# ---------------------------------------------------------------------------

@router.post(
    "/orders/inbound",
    response_model=schemas.TalentEntryPublic,
    status_code=status.HTTP_201_CREATED,
)
def create_inbound_order(
    data: schemas.TalentEntryCreate,
    session: DbSession,
    current_user: CurrentUser,
) -> schemas.TalentEntryPublic:
    """Register an inbound order (adds stock). Requires authentication.

    The response includes ``stock_after`` and, when the unit cost deviates
    from the product+supplier history, ``cost_variance``.
    """
    try:
        return service.create_entry(session, data, current_user["id"])
    except LookupError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Talent asset not found")


@router.post(
    "/orders/outbound",
    response_model=schemas.TalentExitPublic,
    status_code=status.HTTP_201_CREATED,
)
def create_outbound_order(
    data: schemas.TalentExitCreate,
    session: DbSession,
    current_user: CurrentUser,
) -> schemas.TalentExitPublic:
    """Register an outbound order (reduces stock). Requires authentication.

    Rejects with HTTP 400 if the resulting stock would be negative.
    """
    try:
        return service.create_exit(session, data, current_user["id"])
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.get("/orders", response_model=list[schemas.OrderPublic])
def list_orders(
    session: DbSession,
    current_user: CurrentUser,
) -> Response:
    """List all orders (inbound + outbound) with product info.

    Cached (shared key, TTL 300 s, invalidated by every inbound/outbound order).
    """
    return cached_json(
        ORDERS_NS, ORDERS_TTL_SECONDS, lambda: service.list_orders(session), _orders_adapter
    )
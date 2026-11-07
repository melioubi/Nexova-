"""Inventory router for Nexova — all routes under ``/inventory``.

Product writes and order writes *always* require authentication.
For Nexova, inventory reads also require authentication because talent
pipeline data is commercially sensitive (per CONTEXT.md).
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from api.db import get_db
from api.dependencies import get_current_user
from api.inventory import schemas, service

router = APIRouter(prefix="/inventory", tags=["inventory"])

CurrentUser = Annotated[dict, Depends(get_current_user)]
DbSession = Annotated[Session, Depends(get_db)]


# ---------------------------------------------------------------------------
# Products / TalentAssets
# ---------------------------------------------------------------------------

@router.get("/products", response_model=list[schemas.TalentAssetPublic])
def list_products(
    session: DbSession,
    current_user: CurrentUser,
) -> list[schemas.TalentAssetPublic]:
    """List all talent assets with computed ``current_stock``."""
    return service.list_assets(session)


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
    """Get a single talent asset with its current stock."""
    result = service.get_asset(session, asset_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Talent asset not found",
        )
    return result


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
    """Register an inbound order (adds stock). Requires authentication."""
    return service.create_entry(session, data, current_user["id"])


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
) -> list[schemas.OrderPublic]:
    """List all orders (inbound + outbound) with product info."""
    return service.list_orders(session)
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Response, status

from database import suppliers_table
from models import (
    Category,
    Country,
    RateUpdate,
    Supplier,
    SupplierCreate,
    StatusUpdate,
    now_utc,
)


router = APIRouter(prefix="/suppliers", tags=["suppliers"])


def serialize_supplier(record: dict, supplier_id: int) -> Supplier:
    return Supplier.model_validate({**record, "id": supplier_id})


def get_supplier_record(supplier_id: int) -> dict:
    record = suppliers_table.get(doc_id=supplier_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return record


@router.post("", response_model=Supplier, status_code=status.HTTP_201_CREATED)
def create_supplier(payload: SupplierCreate) -> Supplier:
    record = payload.model_dump(mode="json")
    record["updated_at"] = now_utc().isoformat()
    supplier_id = suppliers_table.insert(record)
    return serialize_supplier(record, supplier_id)


@router.get("", response_model=list[Supplier])
def list_suppliers(
    country: Country | None = None,
    category: Category | None = None,
) -> list[Supplier]:
    records = suppliers_table.all()
    matching = []
    for record in records:
        if country is not None and record["country"] != country.value:
            continue
        if category is not None and category.value not in record["categories"]:
            continue
        matching.append(serialize_supplier(record, record.doc_id))
    return matching


@router.get("/{supplier_id}", response_model=Supplier)
def read_supplier(supplier_id: int) -> Supplier:
    return serialize_supplier(get_supplier_record(supplier_id), supplier_id)


@router.patch("/{supplier_id}/rate", response_model=Supplier)
def update_supplier_rate(supplier_id: int, payload: RateUpdate) -> Supplier:
    record = get_supplier_record(supplier_id)
    updated_at = datetime.now(timezone.utc).isoformat()
    suppliers_table.update(
        {"monthly_rate": payload.monthly_rate, "updated_at": updated_at},
        doc_ids=[supplier_id],
    )
    return serialize_supplier(
        {**record, "monthly_rate": payload.monthly_rate, "updated_at": updated_at},
        supplier_id,
    )


@router.patch("/{supplier_id}/status", response_model=Supplier)
def update_supplier_status(supplier_id: int, payload: StatusUpdate) -> Supplier:
    record = get_supplier_record(supplier_id)
    suppliers_table.update({"status": payload.status.value}, doc_ids=[supplier_id])
    return serialize_supplier({**record, "status": payload.status.value}, supplier_id)


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(supplier_id: int) -> Response:
    get_supplier_record(supplier_id)
    suppliers_table.remove(doc_ids=[supplier_id])
    return Response(status_code=status.HTTP_204_NO_CONTENT)
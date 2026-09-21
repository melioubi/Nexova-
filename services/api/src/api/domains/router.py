from typing import Annotated

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field

from api.dependencies import get_current_user
from api.domains.service import create_record, list_records


class DomainRecordCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    details: dict[str, str] = Field(default_factory=dict)


class DomainRecord(DomainRecordCreate):
    id: str
    user_uuid: str


CurrentUser = Annotated[dict, Depends(get_current_user)]


def build_domain_router(domain: str, path: str, label: str) -> APIRouter:
    router = APIRouter(prefix=path, tags=[label])

    @router.get("", response_model=list[DomainRecord])
    def read_records(current_user: CurrentUser) -> list[dict]:
        return list_records(domain, current_user["id"])

    @router.post("", response_model=DomainRecord, status_code=status.HTTP_201_CREATED)
    def add_record(
        record_data: DomainRecordCreate,
        current_user: CurrentUser,
    ) -> dict:
        return create_record(domain, current_user["id"], record_data.model_dump())

    return router
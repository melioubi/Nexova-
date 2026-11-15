from uuid import uuid4

from tinydb import Query

from api.db import get_domain_db


def list_records(domain: str, user_id: str) -> list[dict]:
    with get_domain_db() as db:
        return list(db.search((Query().domain == domain) & (Query().user_uuid == user_id)))


def create_record(domain: str, user_id: str, values: dict) -> dict:
    record = {
        "id": str(uuid4()),
        "domain": domain,
        "user_uuid": user_id,
        **values,
    }
    with get_domain_db() as db:
        db.insert(record)
    return record
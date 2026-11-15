from datetime import datetime, timezone
from uuid import uuid4

from tinydb import Query

from api.db import get_users_db
from api.schemas import Role, UserCreate, UserUpdate
from api.security import hash_password


def create_user(user_data: UserCreate) -> dict:
    user = {
        "id": str(uuid4()),
        "email": str(user_data.email).lower(),
        "hashed_password": hash_password(user_data.password),
        "is_active": True,
        "role": Role.user.value,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    with get_users_db() as db:
        if db.search(Query().email == user["email"]):
            raise ValueError("Email already registered")
        db.insert(user)
    return user


def get_user_by_id(user_id: str) -> dict | None:
    with get_users_db() as db:
        return db.get(Query().id == user_id)


def get_user_by_email(email: str) -> dict | None:
    with get_users_db() as db:
        return db.get(Query().email == email.lower())


def list_users() -> list[dict]:
    with get_users_db() as db:
        return list(db.all())


def update_user(user_id: str, user_data: UserUpdate) -> dict | None:
    updates = user_data.model_dump(exclude_unset=True, exclude_none=True)
    if "email" in updates:
        updates["email"] = str(updates["email"]).lower()
    if "password" in updates:
        updates["hashed_password"] = hash_password(updates.pop("password"))
    if "role" in updates:
        updates["role"] = updates["role"].value

    with get_users_db() as db:
        if "email" in updates:
            duplicate = db.search(
                (Query().email == updates["email"]) & (Query().id != user_id)
            )
            if duplicate:
                raise ValueError("Email already registered")
        db.update(updates, Query().id == user_id)
        return db.get(Query().id == user_id)


def delete_user(user_id: str) -> bool:
    with get_users_db() as db:
        return bool(db.remove(Query().id == user_id))
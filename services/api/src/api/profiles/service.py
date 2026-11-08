from uuid import uuid4

from tinydb import Query

from api.db import get_profiles_db
from api.schemas import ProfileCreate, ProfileUpdate


def create_profile(user_id: str, profile_data: ProfileCreate) -> dict:
    profile = {"id": str(uuid4()), "user_id": user_id, **profile_data.model_dump()}
    with get_profiles_db() as db:
        db.insert(profile)
    return profile


def get_profile_by_user_id(user_id: str) -> dict | None:
    with get_profiles_db() as db:
        return db.get(Query().user_id == user_id)


def update_profile(user_id: str, profile_data: ProfileUpdate) -> dict:
    updates = profile_data.model_dump(exclude_unset=True)
    with get_profiles_db() as db:
        db.update(updates, Query().user_id == user_id)
        profile = db.get(Query().user_id == user_id)
    if profile is None:
        return create_profile(user_id, profile_data)
    return profile


def delete_profile(user_id: str) -> None:
    with get_profiles_db() as db:
        db.remove(Query().user_id == user_id)
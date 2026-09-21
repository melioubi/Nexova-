from pathlib import Path

from tinydb import TinyDB

from api.core.config import get_settings


def _database_path(filename: str) -> Path:
    path = Path(get_settings().tinydb_path)
    path.mkdir(parents=True, exist_ok=True)
    return path / filename


def get_users_db() -> TinyDB:
    return TinyDB(_database_path("users.json"))


def get_profiles_db() -> TinyDB:
    return TinyDB(_database_path("profiles.json"))


def get_domain_db() -> TinyDB:
    return TinyDB(_database_path("domains.json"))


def get_reset_tokens_db() -> TinyDB:
    return TinyDB(_database_path("reset_tokens.json"))
from pathlib import Path

from tinydb import TinyDB

from api.core.config import get_settings


def _database_path(filename: str) -> Path:
    path = Path(get_settings().tinydb_path)
    try:
        path.mkdir(parents=True, exist_ok=True)
    except PermissionError:
        raise RuntimeError(
            f"Cannot create database directory at {path}. Check permissions."
        ) from None
    return path / filename


def get_users_db() -> TinyDB:
    try:
        return TinyDB(_database_path("users.json"))
    except Exception as e:
        raise RuntimeError("Cannot open users database.") from e


def get_profiles_db() -> TinyDB:
    try:
        return TinyDB(_database_path("profiles.json"))
    except Exception as e:
        raise RuntimeError("Cannot open profiles database.") from e


def get_domain_db() -> TinyDB:
    try:
        return TinyDB(_database_path("domains.json"))
    except Exception as e:
        raise RuntimeError("Cannot open domains database.") from e
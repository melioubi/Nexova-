from collections.abc import Generator
from pathlib import Path

from sqlmodel import Session, create_engine
from tinydb import TinyDB

from api.core.config import get_settings


# ---------------------------------------------------------------------------
# TinyDB — authentication / users (existing)
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# SQLModel (Supabase / PostgreSQL) — inventory data
# ---------------------------------------------------------------------------

_engine: object | None = None


def _get_engine():
    """Return a lazily-created SQLModel engine pointing to Supabase.

    Uses SQLite when ``DATABASE_URL`` contains ``sqlite`` (local dev) and
    PostgreSQL / Supabase transaction-pooler URIs in all other cases.
    """
    global _engine
    if _engine is None:
        db_url = get_settings().database_url
        if not db_url:
            raise RuntimeError(
                "DATABASE_URL is not set in .env. Cannot connect to Supabase."
            )
        connect_args: dict = {}
        if db_url.startswith("sqlite"):
            connect_args["check_same_thread"] = False
        _engine = create_engine(db_url, echo=False, connect_args=connect_args)
    return _engine


def init_db() -> None:
    """Create all ORM tables in Supabase (development only)."""
    from sqlmodel import SQLModel  # noqa: F811

    SQLModel.metadata.create_all(_get_engine())


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency — yields a SQLModel session per request."""
    with Session(_get_engine()) as session:
        try:
            yield session
        finally:
            session.close()
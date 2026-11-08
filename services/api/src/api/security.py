from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.hash import bcrypt

from api.core.config import get_settings


ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.verify(password, hashed_password)


def create_access_token(user_id: str) -> str:
    settings = get_settings()
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    payload = {"sub": user_id, "exp": expires_at}
    try:
        return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)
    except Exception as e:
        raise RuntimeError("Failed to generate access token.") from e


def decode_access_token(token: str) -> str:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except Exception as e:
        raise JWTError("Token validation failed") from e
    user_id = payload.get("sub")
    if not isinstance(user_id, str) or not user_id:
        raise JWTError("Token subject is missing")
    return user_id
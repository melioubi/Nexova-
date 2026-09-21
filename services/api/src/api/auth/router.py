from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError, jwt
from tinydb import Query

from api.core.config import get_settings
from api.db import get_reset_tokens_db
from api.dependencies import get_current_user
from api.email_service import send_reset_email
from api.profiles.service import get_profile_by_user_id
from api.schemas import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    MeResponse,
    ResetPasswordRequest,
    Token,
)
from api.security import (
    ALGORITHM,
    create_access_token,
    hash_password,
    verify_password,
)
from api.users.service import get_user_by_email, get_user_by_id, update_user


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends()) -> Token:
    user = get_user_by_email(form_data.username)
    if user is None or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user["is_active"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")
    return Token(access_token=create_access_token(user["id"]))


@router.get("/me", response_model=MeResponse)
def read_current_user(current_user: dict = Depends(get_current_user)) -> MeResponse:
    profile = get_profile_by_user_id(current_user["id"])
    return MeResponse(**current_user, profile=profile)


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
def forgot_password(body: ForgotPasswordRequest) -> dict[str, str]:
    """Solicita un restablecimiento de contraseña. Siempre devuelve 200."""
    settings = get_settings()
    user = get_user_by_email(str(body.email))

    if user is not None:
        # Generate a unique reset token (JWT) with exp and jti
        jti = str(uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=settings.reset_token_expire_minutes
        )
        reset_token = jwt.encode(
            {"sub": user["id"], "exp": expires_at, "jti": jti},
            settings.secret_key,
            algorithm=ALGORITHM,
        )

        # Store the token jti in the DB to prevent reuse
        with get_reset_tokens_db() as db:
            db.insert({
                "jti": jti,
                "user_id": user["id"],
                "used": False,
                "expires_at": expires_at.isoformat(),
            })

        # Build reset link
        reset_link = f"{settings.frontend_url.rstrip('/')}/reset-password?token={reset_token}"

        # Send email
        send_reset_email(str(body.email), reset_link)

    return {"message": "Si esa dirección está registrada, recibirás un enlace en breve."}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(body: ResetPasswordRequest) -> dict[str, str]:
    """Restablece la contraseña usando un token válido."""
    settings = get_settings()

    # Decode and validate the token
    try:
        payload = jwt.decode(
            body.token,
            settings.secret_key,
            algorithms=[ALGORITHM],
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace de restablecimiento es inválido o ha expirado.",
        )

    user_id = payload.get("sub")
    jti = payload.get("jti")

    if not user_id or not jti:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace de restablecimiento es inválido.",
        )

    # Check if token has already been used
    with get_reset_tokens_db() as db:
        token_record = db.get(
            (Query().jti == jti) & (Query().user_id == user_id)
        )
        if token_record is None or token_record.get("used", False):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Este enlace de restablecimiento ya ha sido utilizado. Solicita uno nuevo.",
            )

        # Mark token as used
        db.update({"used": True}, (Query().jti == jti) & (Query().user_id == user_id))

    # Update user password
    try:
        from api.schemas import UserUpdate
        update_user(user_id, UserUpdate(password=body.new_password))
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo restablecer la contraseña.",
        )

    return {"message": "Contraseña restablecida correctamente."}


@router.post("/change-password", status_code=status.HTTP_200_OK)
def change_password(
    body: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
) -> dict[str, str]:
    """Cambia la contraseña del usuario autenticado."""
    if not verify_password(body.current_password, current_user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual es incorrecta.",
        )

    from api.schemas import UserUpdate
    try:
        update_user(current_user["id"], UserUpdate(password=body.new_password))
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo cambiar la contraseña.",
        )

    return {"message": "Contraseña cambiada correctamente."}
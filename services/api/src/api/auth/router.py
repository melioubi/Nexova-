from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm

from api.dependencies import get_current_user
from api.profiles.service import get_profile_by_user_id
from api.schemas import MeResponse, Token, UserPublic
from api.security import create_access_token, verify_password
from api.telemetry.emitter import account_key_hash, client_ip_hash, emit
from api.users.service import get_user_by_email


router = APIRouter(prefix="/auth", tags=["auth"])


def _emit_login_failed(request: Request, email: str, reason: str) -> None:
    """telemetry-plan.md A.15: no userId (do not reveal which accounts exist),
    email and IP only as HMAC hashes."""
    emit(
        "login_failed",
        {
            "failure_reason": reason,
            "account_key_hash": account_key_hash(email),
            "client_ip_hash": client_ip_hash(request.client.host if request.client else None),
        },
        request_id=getattr(request.state, "request_id", None),
        session_id=getattr(request.state, "session_id", None),
    )


@router.post("/login", response_model=Token)
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends()) -> Token:
    try:
        user = get_user_by_email(form_data.username)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service unavailable",
        )
    if user is None or not verify_password(form_data.password, user["hashed_password"]):
        _emit_login_failed(request, form_data.username, "invalid_credentials")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user["is_active"]:
        _emit_login_failed(request, form_data.username, "inactive_user")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")
    try:
        return Token(access_token=create_access_token(user["id"]))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not generate access token. Please try again.",
        )


@router.get("/me", response_model=MeResponse)
def read_current_user(current_user: dict = Depends(get_current_user)) -> MeResponse:
    try:
        profile = get_profile_by_user_id(current_user["id"])
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not retrieve profile. Please try again.",
        )
    return MeResponse(**current_user, profile=profile)
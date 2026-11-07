from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from api.dependencies import get_current_user
from api.profiles.service import get_profile_by_user_id
from api.schemas import MeResponse, Token, UserPublic
from api.security import create_access_token, verify_password
from api.users.service import get_user_by_email


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends()) -> Token:
    try:
        user = get_user_by_email(form_data.username)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service unavailable",
        )
    if user is None or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user["is_active"]:
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
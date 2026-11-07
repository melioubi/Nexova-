from fastapi import APIRouter, Depends, HTTPException, status

from api.dependencies import get_current_user
from api.profiles.service import get_profile_by_user_id, update_profile
from api.schemas import ProfilePublic, ProfileUpdate


router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.get("/me", response_model=ProfilePublic)
def read_my_profile(current_user: dict = Depends(get_current_user)) -> dict:
    try:
        profile = get_profile_by_user_id(current_user["id"])
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not retrieve profile. Please try again.",
        )
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return profile


@router.put("/me", response_model=ProfilePublic)
def edit_my_profile(
    profile_data: ProfileUpdate,
    current_user: dict = Depends(get_current_user),
) -> dict:
    try:
        return update_profile(current_user["id"], profile_data)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not update profile. Please try again.",
        )
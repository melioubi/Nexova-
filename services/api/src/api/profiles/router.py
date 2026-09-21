from fastapi import APIRouter, Depends, HTTPException, status

from api.dependencies import get_current_user
from api.profiles.service import get_profile_by_user_id, update_profile
from api.schemas import ProfilePublic, ProfileUpdate


router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.get("/me", response_model=ProfilePublic)
def read_my_profile(current_user: dict = Depends(get_current_user)) -> dict:
    profile = get_profile_by_user_id(current_user["id"])
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return profile


@router.put("/me", response_model=ProfilePublic)
def edit_my_profile(
    profile_data: ProfileUpdate,
    current_user: dict = Depends(get_current_user),
) -> dict:
    return update_profile(current_user["id"], profile_data)
from fastapi import APIRouter, Depends, HTTPException, status

from api.dependencies import get_current_user
from api.profiles.service import create_profile, delete_profile
from api.schemas import ProfileCreate, UserCreate, UserPublic, UserUpdate
from api.users.service import (
    create_user,
    delete_user,
    get_user_by_id,
    list_users,
    update_user,
)


router = APIRouter(prefix="/users", tags=["users"])


@router.post("", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def register_user(user_data: UserCreate) -> dict:
    try:
        user = create_user(user_data)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error
    create_profile(
        user["id"],
        ProfileCreate(
            name=user_data.name,
            phone=user_data.phone,
            address=user_data.address,
        ),
    )
    return user


@router.get("", response_model=list[UserPublic])
def read_users(current_user: dict = Depends(get_current_user)) -> list[dict]:
    return list_users()


@router.get("/{user_id}", response_model=UserPublic)
def read_user(user_id: str, current_user: dict = Depends(get_current_user)) -> dict:
    if user_id != current_user["id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    user = get_user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.put("/{user_id}", response_model=UserPublic)
def edit_user(
    user_id: str,
    user_data: UserUpdate,
    current_user: dict = Depends(get_current_user),
) -> dict:
    is_admin = current_user["role"] == "admin"
    if user_id != current_user["id"] and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    if user_data.role is not None and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can change roles")
    try:
        user = update_user(user_id, user_data)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_user(user_id: str, current_user: dict = Depends(get_current_user)) -> None:
    if user_id != current_user["id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    if not delete_user(user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    delete_profile(user_id)
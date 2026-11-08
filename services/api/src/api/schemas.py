from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RootResponse(BaseModel):
    """Explicit response contract for ``GET /``."""

    name: str
    status: str
    docs: str


class HealthResponse(BaseModel):
    """Explicit response contract for ``GET /health``."""

    status: str


class Role(str, Enum):
    admin = "admin"
    manager = "manager"
    user = "user"


class ProfileCreate(BaseModel):
    name: str | None = None
    phone: str | None = None
    address: str | None = None


class ProfileUpdate(ProfileCreate):
    pass


class ProfilePublic(ProfileCreate):
    id: str
    user_id: str


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str | None = None
    phone: str | None = None
    address: str | None = None


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=8)
    role: Role | None = None


class UserPublic(BaseModel):
    """Detail view of a user — includes audit fields like ``created_at``."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    is_active: bool
    role: Role
    created_at: datetime


class UserListItem(BaseModel):
    """Lightweight list view of a user for admin tables.

    Separate from ``UserPublic`` (detail): per the serialization guidance,
    the list endpoint returns its own lighter schema instead of reusing the
    detail one. Omits ``created_at`` and any contact data.
    """

    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    is_active: bool
    role: Role


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RegisterResponse(BaseModel):
    """Response for unauthenticated registration (``POST /users``).

    Deliberately does **not** echo the caller's email nor any credentials.
    Per the audit brief, unauthenticated auth flows (register/login/recovery)
    must not return the email in the response body; the caller already sent it
    and authenticates right after via ``/auth/login``. ``UserPublic`` remains
    the detail schema used by the authenticated endpoints.
    """

    id: str
    is_active: bool
    role: Role
    created_at: datetime


class MeResponse(UserPublic):
    profile: ProfilePublic | None
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class UserInfo(BaseModel):
    """Decoded Firebase JWT payload (used as a dependency)."""

    uid: str
    email: str | None = None
    display_name: str | None = None
    photo_url: str | None = None


class UserResponse(BaseModel):
    uid: str
    email: str | None = None
    display_name: str | None = None
    photo_url: str | None = None
    created_at: datetime

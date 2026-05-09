from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class UserInfo(BaseModel):
    """Decoded Firebase JWT payload (used as a dependency).

    ``is_guest`` is ``True`` for the shared demo workspace; routers can use it
    to gate features that should require login.
    """

    uid: str
    email: str | None = None
    display_name: str | None = None
    photo_url: str | None = None
    is_guest: bool = False


class UserResponse(BaseModel):
    uid: str
    email: str | None = None
    display_name: str | None = None
    photo_url: str | None = None
    created_at: datetime

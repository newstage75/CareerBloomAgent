from __future__ import annotations

from fastapi import HTTPException, Request, status

from config import settings
from models.user import UserInfo
from services.firebase_auth import verify_token
from services.quota import current_guest_uid


async def get_current_user(request: Request) -> UserInfo:
    """FastAPI dependency — authenticated user, with optional guest fallback.

    Behavior:
    - Authorization header present → verify the Firebase JWT (401 on failure)
    - Header missing AND ``GUEST_ENABLED`` → return a shared guest user whose
      UID rotates daily at JST 04:00 (see :func:`services.quota.current_guest_uid`)
    - Header missing AND guest disabled → 401
    """
    auth_header = request.headers.get("authorization")

    if auth_header and auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        try:
            decoded = await verify_token(token)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )
        return UserInfo(
            uid=decoded["uid"],
            email=decoded.get("email"),
            display_name=decoded.get("name"),
            photo_url=decoded.get("picture"),
            is_guest=False,
        )

    if settings.guest_enabled:
        return UserInfo(
            uid=current_guest_uid(),
            email=None,
            display_name="ゲスト",
            photo_url=None,
            is_guest=True,
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required",
    )

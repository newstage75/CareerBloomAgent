from __future__ import annotations

from fastapi import Depends, HTTPException, Request, status

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


def _csv_set(raw: str, lower: bool = False) -> set[str]:
    items = (e.strip() for e in raw.split(","))
    return {e.lower() if lower else e for e in items if e}


def is_admin_user(user: UserInfo) -> bool:
    """ADMIN_EMAILS / ADMIN_UIDS 許可リストに含まれるログイン済みユーザーか。

    ゲストは常に False。
    """
    if user.is_guest:
        return False
    if user.uid in _csv_set(settings.admin_uids):
        return True
    if user.email and user.email.lower() in _csv_set(settings.admin_emails, lower=True):
        return True
    return False


async def require_admin(user: UserInfo = Depends(get_current_user)) -> UserInfo:
    """FastAPI dependency — admin-only endpoints. Non-admins get a generic 403."""
    if not is_admin_user(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden",
        )
    return user

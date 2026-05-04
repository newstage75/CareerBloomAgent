from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from models.user import UserInfo
from services.firebase_auth import verify_token

_bearer = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> UserInfo:
    """FastAPI dependency — extracts and verifies the Firebase JWT."""
    try:
        decoded = await verify_token(credentials.credentials)
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
    )

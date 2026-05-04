from __future__ import annotations

from fastapi import APIRouter, Depends

from middleware.auth import get_current_user
from models.user import UserInfo, UserResponse
from services import firestore

router = APIRouter()


@router.post("/verify", response_model=UserResponse)
async def verify_and_sync_user(user: UserInfo = Depends(get_current_user)):
    """Verify the Firebase JWT and upsert the user document in Firestore."""
    result = await firestore.get_or_create_user(
        uid=user.uid,
        email=user.email,
        display_name=user.display_name,
        photo_url=user.photo_url,
    )
    return UserResponse(
        uid=result["uid"],
        email=result.get("email"),
        display_name=result.get("display_name"),
        photo_url=result.get("photo_url"),
        created_at=result["created_at"],
    )

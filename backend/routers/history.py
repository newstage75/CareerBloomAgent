from __future__ import annotations

from fastapi import APIRouter, Depends

from middleware.auth import get_current_user
from models.user import UserInfo
from services.firestore import get_value_history

router = APIRouter()


@router.get("/history")
async def get_history(
    limit: int = 20,
    offset: int = 0,
    user: UserInfo = Depends(get_current_user),
):
    """Get value change history entries."""
    entries, total = await get_value_history(user.uid, limit=limit, offset=offset)
    return {"entries": entries, "total": total}

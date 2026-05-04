from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from middleware.auth import get_current_user
from models.user import UserInfo
from services.firestore import get_insights
from services.insight_engine import generate_insights

router = APIRouter()


@router.get("/insights")
async def get_user_insights(user: UserInfo = Depends(get_current_user)):
    insights = await get_insights(user.uid)
    if not insights:
        return {"status": "empty", "message": "インサイトがまだ生成されていません"}
    return insights


@router.post("/insights/generate")
async def generate_user_insights(user: UserInfo = Depends(get_current_user)):
    try:
        insights = await generate_insights(user.uid)
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return insights

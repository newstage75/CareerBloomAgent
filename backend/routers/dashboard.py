from __future__ import annotations

from fastapi import APIRouter, Depends

from middleware.auth import get_current_user
from models.user import UserInfo
from services import firestore

router = APIRouter()


@router.get("")
async def get_dashboard(user: UserInfo = Depends(get_current_user)):
    """Aggregate dashboard data for the authenticated user."""
    skills = await firestore.get_skills(user.uid)
    matches = await firestore.get_matches(user.uid)
    sessions = await firestore.get_chat_sessions(user.uid)

    top_score = max((m.get("score", 0) for m in matches), default=0)

    return {
        "skills_count": len(skills),
        "top_match_score": top_score,
        "chat_sessions_count": len(sessions),
        "recent_skills": [
            {"id": s["id"], "name": s["name"], "level": s["level"]}
            for s in skills[:5]
        ],
        "top_matches": [
            {
                "id": m["id"],
                "company": m.get("company", ""),
                "position": m.get("position", ""),
                "score": m.get("score", 0),
            }
            for m in matches[:3]
        ],
    }

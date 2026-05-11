from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends

from middleware.auth import get_current_user
from models.user import UserInfo
from services import firestore

router = APIRouter()


@router.get("")
async def get_dashboard(user: UserInfo = Depends(get_current_user)):
    """Aggregate dashboard data for the authenticated user.

    4つのFirestoreコレクションを並列読み込み。Cloud Runのコールドスタート
    時にこの集約API1本だけで全カウントを返せるよう、直列ではなく
    ``asyncio.gather`` でまとめて待つ。
    """
    skills, roadmaps, sessions, sparring_notes = await asyncio.gather(
        firestore.get_skills(user.uid),
        firestore.get_roadmaps(user.uid),
        firestore.get_chat_sessions(user.uid),
        firestore.get_sparring_notes(user.uid),
    )

    return {
        "skills_count": len(skills),
        "roadmaps_count": len(roadmaps),
        "chat_sessions_count": len(sessions),
        "sparring_notes_count": len(sparring_notes),
        "recent_skills": [
            {"id": s["id"], "name": s["name"], "level": s["level"]}
            for s in skills[:5]
        ],
        "recent_roadmaps": [
            {
                "id": r["id"],
                "goal_text": r.get("goal_text", ""),
                "goal_summary": r.get("goal_summary", ""),
                "generated_at": r.get("generated_at"),
            }
            for r in roadmaps[:3]
        ],
    }

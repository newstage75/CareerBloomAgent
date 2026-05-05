from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from middleware.auth import get_current_user
from models.matching import MatchResult
from models.user import UserInfo
from services import firestore, matching_engine, agent_service


class SearchRequest(BaseModel):
    contexts: list[str] = ["values", "skills"]

router = APIRouter()


@router.get("", response_model=list[MatchResult])
async def get_matches(user: UserInfo = Depends(get_current_user)):
    matches = await firestore.get_matches(user.uid)
    return [
        MatchResult(
            id=m["id"],
            company=m.get("company", ""),
            position=m.get("position", ""),
            score=m.get("score", 0),
            tags=m.get("tags", []),
            gap_skills=m.get("gap_skills", []),
            calculated_at=m.get("calculated_at", datetime.now(timezone.utc)),
        )
        for m in matches
    ]


@router.post("/refresh", response_model=list[MatchResult])
async def refresh_matches(
    body: SearchRequest | None = None,
    user: UserInfo = Depends(get_current_user),
):
    """Recompute match scores using ADK matching agent (with fallback)."""
    contexts = body.contexts if body else ["values", "skills"]

    # Try ADK agent first
    try:
        await agent_service.run_matching_refresh(user.uid, contexts=contexts)
    except Exception:
        # Fallback to legacy matching engine
        skills = await firestore.get_skills(user.uid)
        skill_embeddings = [s["embedding"] for s in skills if s.get("embedding")]
        skill_names = [s["name"] for s in skills]

        if not skill_embeddings:
            return []

        jobs = await firestore.get_jobs()
        if not jobs:
            return []

        now = datetime.now(timezone.utc)
        results = matching_engine.calculate_match_scores(
            skill_embeddings, skill_names, jobs
        )

        match_docs = [
            {
                "job_id": r["job_id"],
                "company": r["company"],
                "position": r["position"],
                "score": r["score"],
                "matched_skills": r["matched_skills"],
                "gap_skills": r["gap_skills"],
                "tags": r["tags"],
                "calculated_at": now,
            }
            for r in results[:20]
        ]
        await firestore.save_matches(user.uid, match_docs)

    # Return saved matches regardless of which path was taken
    now = datetime.now(timezone.utc)
    saved = await firestore.get_matches(user.uid)
    return [
        MatchResult(
            id=m["id"],
            company=m.get("company", ""),
            position=m.get("position", ""),
            score=m.get("score", 0),
            tags=m.get("tags", []),
            gap_skills=m.get("gap_skills", []),
            calculated_at=m.get("calculated_at", now),
        )
        for m in saved
    ]

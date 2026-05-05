from __future__ import annotations

import asyncio
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


@router.post("/refresh")
async def refresh_matches(
    body: SearchRequest | None = None,
    user: UserInfo = Depends(get_current_user),
):
    """Kick off async job search. Returns immediately with status."""
    contexts = body.contexts if body else ["values", "skills"]

    # Fire-and-forget: run search in background
    asyncio.create_task(
        _run_search_pipeline(user.uid, contexts)
    )

    return {"status": "searching", "message": "調査を開始しました。結果は少々お待ちください。"}


async def _run_search_pipeline(uid: str, contexts: list[str]) -> None:
    """Background pipeline: collect jobs via web search, then compute matches.
    Total timeout: 60 seconds to prevent runaway costs.
    """
    import logging
    logger = logging.getLogger(__name__)

    try:
        # Step 1: Collect fresh jobs via ADK job_collector (Google Search) - 30s timeout
        insights = await firestore.get_insights(uid)
        keywords = _build_search_keywords(insights, contexts)
        if keywords:
            try:
                await asyncio.wait_for(
                    agent_service.run_job_collection(keywords=keywords),
                    timeout=30.0,
                )
            except asyncio.TimeoutError:
                logger.warning("Job collection timed out for user %s", uid)
            except Exception as e:
                logger.warning("Job collection failed for user %s: %s", uid, e)

        # Step 2: Run matching (ADK agent or fallback) - 30s timeout
        try:
            await asyncio.wait_for(
                agent_service.run_matching_refresh(uid, contexts=contexts),
                timeout=30.0,
            )
        except (asyncio.TimeoutError, Exception):
            # Fallback to legacy matching engine
            skills = await firestore.get_skills(uid)
            skill_embeddings = [s["embedding"] for s in skills if s.get("embedding")]
            skill_names = [s["name"] for s in skills]

            if not skill_embeddings:
                return

            jobs = await firestore.get_jobs()
            if not jobs:
                return

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
            await firestore.save_matches(uid, match_docs, contexts=contexts)

        logger.info("Search pipeline completed for user %s", uid)
    except Exception as e:
        logger.exception("Search pipeline failed for user %s: %s", uid, e)


def _build_search_keywords(insights: dict | None, contexts: list[str]) -> list[str]:
    """Build search keywords from user insights and selected contexts."""
    keywords = []

    if not insights:
        return ["エンジニア 求人", "IT 転職"]

    if "values" in contexts:
        for value in insights.get("values", [])[:3]:
            label = value.get("label", "")
            if label:
                keywords.append(f"{label} 求人")

    if "skills" in contexts:
        # Skills are handled separately by matching_calculator
        keywords.append("IT エンジニア 求人")

    if "bucket_list" in contexts:
        bucket = insights.get("bucket_list", [])
        for item in bucket[:2]:
            text = item.get("text", "") if isinstance(item, dict) else str(item)
            if text:
                keywords.append(f"{text[:20]} キャリア")

    if "never_list" in contexts:
        # Use never_list as negative filter (search for opposites)
        keywords.append("ワークライ��バランス 求人")

    if "vision" in contexts:
        vision = insights.get("vision", {})
        if isinstance(vision, dict):
            long_term = vision.get("long_term", "")
            if long_term:
                keywords.append(f"{long_term[:20]} 求人")

    if not keywords:
        keywords = ["転職 求人"]

    return keywords[:5]


@router.get("/status")
async def get_search_status(user: UserInfo = Depends(get_current_user)):
    """Check if new results are available (for polling)."""
    matches = await firestore.get_matches(user.uid)
    return {
        "has_results": len(matches) > 0,
        "count": len(matches),
        "latest_at": matches[0].get("calculated_at") if matches else None,
    }


@router.get("/history")
async def get_matching_history(
    limit: int = 20,
    user: UserInfo = Depends(get_current_user),
):
    """Get past search history."""
    entries = await firestore.get_search_history(user.uid, limit=limit)
    return {"entries": entries}

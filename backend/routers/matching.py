from __future__ import annotations

import asyncio
import json
import logging
import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from starlette.responses import StreamingResponse

from middleware.auth import get_current_user
from models.matching import MatchResult
from models.user import UserInfo
from services import firestore, matching_engine, agent_service

logger = logging.getLogger(__name__)


class SearchRequest(BaseModel):
    contexts: list[str] = ["values", "skills"]


# Total budget for the search pipeline (job collection + matching combined).
# Frontend displays "(x秒/PIPELINE_TIMEOUT_SEC秒)".
PIPELINE_TIMEOUT_SEC = 90

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


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False, default=str)}\n\n"


@router.post("/refresh")
async def refresh_matches(
    body: SearchRequest | None = None,
    user: UserInfo = Depends(get_current_user),
):
    """SSE endpoint: streams pipeline progress and final results."""
    contexts = body.contexts if body else ["values", "skills"]
    uid = user.uid

    async def event_generator():
        started_at = time.monotonic()

        def elapsed() -> float:
            return round(time.monotonic() - started_at, 1)

        yield _sse(
            "status",
            {
                "phase": "starting",
                "message": "調査を開始します",
                "elapsed": 0,
                "total": PIPELINE_TIMEOUT_SEC,
            },
        )

        try:
            insights = await firestore.get_insights(uid)
            keywords = _build_search_keywords(insights, contexts)

            # ── Step 1: Job collection ─────────────────────────────────
            if keywords:
                yield _sse(
                    "status",
                    {
                        "phase": "collecting_jobs",
                        "message": f"求人を収集中（{len(keywords)}キーワード）",
                        "keywords": keywords,
                        "elapsed": elapsed(),
                        "total": PIPELINE_TIMEOUT_SEC,
                    },
                )
                try:
                    async for evt in agent_service.stream_job_collection(keywords):
                        yield _sse(
                            "agent",
                            {"agent": "job_collector", **evt, "elapsed": elapsed()},
                        )
                except Exception as e:
                    logger.warning("Job collection streaming failed: %s", e)
                    yield _sse(
                        "agent",
                        {
                            "agent": "job_collector",
                            "type": "error",
                            "message": str(e),
                            "elapsed": elapsed(),
                        },
                    )

            # ── Step 2: Matching ───────────────────────────────────────
            yield _sse(
                "status",
                {
                    "phase": "matching",
                    "message": "マッチングを計算中",
                    "elapsed": elapsed(),
                    "total": PIPELINE_TIMEOUT_SEC,
                },
            )

            matching_succeeded = False
            try:
                async for evt in agent_service.stream_matching_refresh(uid, contexts):
                    if evt.get("type") == "final":
                        matching_succeeded = True
                    yield _sse(
                        "agent",
                        {"agent": "matching_calculator", **evt, "elapsed": elapsed()},
                    )
            except Exception as e:
                logger.warning("Matching streaming failed: %s", e)

            # ── Fallback: legacy embedding-based matching if ADK failed ───
            if not matching_succeeded:
                yield _sse(
                    "status",
                    {
                        "phase": "fallback",
                        "message": "フォールバック計算に切り替え中",
                        "elapsed": elapsed(),
                        "total": PIPELINE_TIMEOUT_SEC,
                    },
                )
                await _legacy_matching(uid, contexts)

            # ── Final: load results and send ──────────────────────────
            matches = await firestore.get_matches(uid)
            yield _sse(
                "done",
                {
                    "count": len(matches),
                    "elapsed": elapsed(),
                    "total": PIPELINE_TIMEOUT_SEC,
                },
            )
        except Exception as e:
            logger.exception("Search pipeline failed for user %s", uid)
            yield _sse("error", {"message": str(e), "elapsed": elapsed()})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


async def _legacy_matching(uid: str, contexts: list[str]) -> None:
    """Fallback embedding-based matching when the ADK agent fails."""
    skills = await firestore.get_skills(uid)
    skill_embeddings = [s["embedding"] for s in skills if s.get("embedding")]
    skill_names = [s["name"] for s in skills]
    if not skill_embeddings:
        return
    jobs = await firestore.get_jobs()
    if not jobs:
        return
    now = datetime.now(timezone.utc)
    results = matching_engine.calculate_match_scores(skill_embeddings, skill_names, jobs)
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
        keywords.append("IT エンジニア 求人")

    if "bucket_list" in contexts:
        bucket = insights.get("bucket_list", [])
        for item in bucket[:2]:
            text = item.get("text", "") if isinstance(item, dict) else str(item)
            if text:
                keywords.append(f"{text[:20]} キャリア")

    if "never_list" in contexts:
        keywords.append("ワークライフバランス 求人")

    if "vision" in contexts:
        vision = insights.get("vision", {})
        if isinstance(vision, dict):
            for term_key in ("short_term", "mid_term", "long_term"):
                term = vision.get(term_key, "")
                if term:
                    keywords.append(f"{term[:20]} 求人")

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

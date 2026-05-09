"""深掘りエージェントβ: 目標→ロードマップ・スキル・YouTube候補の生成

URL は ``/api/matching`` を流用しているが、機能は完全に再開発されている
（旧: 求人マッチング → 新: キャリアロードマップ深掘り）。
"""

from __future__ import annotations

import json
import logging
import re
import time
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from starlette.responses import StreamingResponse

from middleware.auth import get_current_user
from models.user import UserInfo
from services import firestore, agent_service
from services.quota import consume_chat_quota, consume_deep_research_quota

logger = logging.getLogger(__name__)

PIPELINE_TIMEOUT_SEC = 180

router = APIRouter()


class GenerateRoadmapRequest(BaseModel):
    goal_text: str
    goal_id: str | None = None  # 既存IDで上書き、未指定なら新規発行


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False, default=str)}\n\n"


_JSON_BLOCK_RE = re.compile(r"\{.*\}", re.DOTALL)


def _extract_json(text: str) -> dict | None:
    """Pull the first {...} JSON object out of a text blob (model output)."""
    if not text:
        return None
    stripped = text.strip()
    # Strip ```json fences if model ignored the no-fence rule
    if stripped.startswith("```"):
        stripped = stripped.strip("`")
        if stripped.startswith("json"):
            stripped = stripped[4:]
    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        m = _JSON_BLOCK_RE.search(stripped)
        if not m:
            return None
        try:
            return json.loads(m.group(0))
        except json.JSONDecodeError:
            return None


@router.get("")
async def list_roadmaps(user: UserInfo = Depends(get_current_user)):
    return await firestore.get_roadmaps(user.uid)


@router.get("/{goal_id}")
async def get_roadmap_detail(
    goal_id: str, user: UserInfo = Depends(get_current_user)
):
    roadmap = await firestore.get_roadmap(user.uid, goal_id)
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    return roadmap


@router.delete("/{goal_id}", status_code=204)
async def delete_roadmap(
    goal_id: str, user: UserInfo = Depends(get_current_user)
):
    deleted = await firestore.delete_roadmap(user.uid, goal_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    return None


@router.post(
    "/generate",
    dependencies=[Depends(consume_chat_quota), Depends(consume_deep_research_quota)],
)
async def generate_roadmap(
    body: GenerateRoadmapRequest,
    user: UserInfo = Depends(get_current_user),
):
    """SSE: 目標を1つ選んで送信 → ロードマップ生成のステップを順次配信。

    最終的にFirestore (`users/{uid}/roadmaps/{goal_id}`) に保存し、
    ``done`` イベントで goal_id を返す。
    """
    uid = user.uid
    goal_text = body.goal_text.strip()
    if not goal_text:
        raise HTTPException(status_code=400, detail="goal_text is required")
    goal_id = (body.goal_id or uuid.uuid4().hex)[:60]

    async def event_generator():
        started_at = time.monotonic()

        def elapsed() -> float:
            return round(time.monotonic() - started_at, 1)

        yield _sse(
            "status",
            {
                "phase": "starting",
                "message": "深掘りを開始します",
                "elapsed": 0,
                "total": PIPELINE_TIMEOUT_SEC,
                "goal_id": goal_id,
            },
        )

        final_text = ""
        try:
            async for evt in agent_service.stream_roadmap_generation(
                uid, goal_text, goal_id
            ):
                if evt.get("type") == "final" and evt.get("text"):
                    final_text = evt["text"]
                yield _sse(
                    "agent",
                    {"agent": "roadmap_advisor", **evt, "elapsed": elapsed()},
                )
        except Exception as e:
            logger.exception("Roadmap generation failed for user %s", uid)
            yield _sse("error", {"message": str(e), "elapsed": elapsed()})
            return

        roadmap = _extract_json(final_text)
        if not roadmap:
            yield _sse(
                "error",
                {
                    "message": "AIの応答がJSONとして解析できませんでした",
                    "elapsed": elapsed(),
                },
            )
            return

        roadmap["goal_id"] = goal_id
        roadmap["goal_text"] = goal_text

        try:
            await firestore.save_roadmap(uid, goal_id, roadmap)
        except Exception as e:
            logger.exception("Failed to save roadmap")
            yield _sse(
                "error",
                {"message": f"保存エラー: {e}", "elapsed": elapsed()},
            )
            return

        yield _sse(
            "done",
            {
                "goal_id": goal_id,
                "elapsed": elapsed(),
                "total": PIPELINE_TIMEOUT_SEC,
            },
        )

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

from __future__ import annotations

import asyncio
import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from starlette.responses import StreamingResponse

from middleware.auth import get_current_user
from models.chat import (
    ChatRequest,
    ChatSession,
    LikeMessageRequest,
    UpdateChatSessionTitleRequest,
)
from models.user import UserInfo
from services import firestore, vertex_ai, agent_service
from services.quota import consume_chat_quota
from services.quota import _consume_quotas
from config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("", dependencies=[Depends(consume_chat_quota)])
async def chat(body: ChatRequest, user: UserInfo = Depends(get_current_user)):
    """Send a message and receive a streaming SSE response from Gemini."""
    session_id, history = await firestore.get_or_create_chat_session(
        user.uid, body.session_id, mode=body.mode
    )

    async def event_generator():
        full_response = ""

        # First event: session metadata
        yield f"event: session\ndata: {json.dumps({'session_id': session_id})}\n\n"

        try:
            async for chunk in vertex_ai.generate_chat_response(
                history, body.message, mode=body.mode
            ):
                full_response += chunk
                yield f"event: message\ndata: {json.dumps({'content': chunk})}\n\n"
        except Exception as exc:
            logger.exception("Gemini streaming error")
            yield f"event: error\ndata: {json.dumps({'error': str(exc)})}\n\n"
            return

        # Persist both messages
        await firestore.append_chat_messages(
            user.uid,
            session_id,
            [
                {"role": "user", "content": body.message},
                {"role": "assistant", "content": full_response},
            ],
        )

        yield f"event: done\ndata: {json.dumps({'session_id': session_id})}\n\n"

        # Fire-and-forget: trigger insight extraction after chat completes
        asyncio.create_task(
            agent_service.run_insight_extraction(user.uid, session_id)
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


@router.get("/sessions", response_model=list[ChatSession])
async def get_sessions(
    mode: str | None = None,
    user: UserInfo = Depends(get_current_user),
):
    sessions = await firestore.get_chat_sessions(user.uid, mode=mode)
    return [
        ChatSession(
            id=s["id"],
            mode=s.get("mode"),
            title=s.get("title"),
            messages=[
                {
                    "role": m["role"],
                    "content": m["content"],
                    "liked": bool(m.get("liked", False)),
                }
                for m in s.get("messages", [])
            ],
            created_at=s["created_at"],
            updated_at=s["updated_at"],
        )
        for s in sessions
    ]


@router.patch("/sessions/{session_id}")
async def update_session_title(
    session_id: str,
    body: UpdateChatSessionTitleRequest,
    user: UserInfo = Depends(get_current_user),
):
    title = body.title.strip()[:80]  # cap at 80 chars to keep storage tidy
    updated = await firestore.update_chat_session_title(
        user.uid, session_id, title
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"id": session_id, "title": title}


@router.patch("/sessions/{session_id}/messages/{message_idx}/like")
async def set_message_liked(
    session_id: str,
    message_idx: int,
    body: LikeMessageRequest,
    user: UserInfo = Depends(get_current_user),
):
    """AI応答にいいね/いいね解除する。message_idx は 0 始まり。

    いいね時: そのQ&Aから即座に知識ノートを1件生成して保存し、メッセージに
    note_id を紐付ける。すでに紐付け済みなら再生成しない。
    いいね解除時: 紐付いていたノートを削除する。
    """
    pair = await firestore.get_message_with_question(
        user.uid, session_id, message_idx
    )
    if pair is None:
        raise HTTPException(
            status_code=404,
            detail="セッション or AI応答メッセージが見つかりません",
        )

    existing_note_id: str | None = pair.get("note_id")

    if body.liked:
        # 1) すでにメッセージに note_id が紐付いていれば再生成しない
        if existing_note_id:
            await firestore.set_message_liked(
                user.uid, session_id, message_idx, True, note_id=existing_note_id
            )
            return {"liked": True, "note_id": existing_note_id}

        # 2) フォールバック: source_session_id + source_message_idx で既存ノートを検索
        #    （旧データや過去の手動生成で紐付いていないケース）
        existing_by_source = await firestore.find_sparring_note_by_source(
            user.uid, session_id, message_idx
        )
        if existing_by_source:
            await firestore.set_message_liked(
                user.uid, session_id, message_idx, True, note_id=existing_by_source
            )
            return {"liked": True, "note_id": existing_by_source}

        # 3) 新規生成 (クォータ消費)
        await _consume_quotas([("total", settings.daily_ai_quota)])
        note = await vertex_ai.generate_single_sparring_note(
            pair.get("question", ""), pair.get("answer", "")
        )
        new_note_id: str | None = None
        if note:
            new_note_id = await firestore.save_sparring_note(
                user.uid,
                {
                    **note,
                    "source_session_id": session_id,
                    "source_message_idx": message_idx,
                    "source_pair_count": 1,
                },
            )
        await firestore.set_message_liked(
            user.uid,
            session_id,
            message_idx,
            True,
            note_id=new_note_id,
        )
        return {"liked": True, "note_id": new_note_id}
    else:
        # Unliked: 紐付いていたノートを削除
        if existing_note_id:
            await firestore.delete_sparring_note(user.uid, existing_note_id)
        await firestore.set_message_liked(
            user.uid, session_id, message_idx, False, note_id=None
        )
        return {"liked": False, "note_id": None}


@router.delete("/sessions/{session_id}", status_code=204)
async def delete_session(
    session_id: str,
    user: UserInfo = Depends(get_current_user),
):
    deleted = await firestore.delete_chat_session(user.uid, session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")
    return None

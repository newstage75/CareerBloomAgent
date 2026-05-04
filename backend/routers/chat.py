from __future__ import annotations

import json
import logging

from fastapi import APIRouter, Depends
from sse_starlette.sse import EventSourceResponse

from middleware.auth import get_current_user
from models.chat import ChatRequest, ChatSession
from models.user import UserInfo
from services import firestore, vertex_ai

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("")
async def chat(body: ChatRequest, user: UserInfo = Depends(get_current_user)):
    """Send a message and receive a streaming SSE response from Gemini."""
    session_id, history = await firestore.get_or_create_chat_session(
        user.uid, body.session_id
    )

    async def event_generator():
        full_response = ""

        # First event: session metadata
        yield {
            "event": "session",
            "data": json.dumps({"session_id": session_id}),
        }

        try:
            async for chunk in vertex_ai.generate_chat_response(
                history, body.message
            ):
                full_response += chunk
                yield {
                    "event": "message",
                    "data": json.dumps({"content": chunk}),
                }
        except Exception as exc:
            logger.exception("Gemini streaming error")
            yield {
                "event": "error",
                "data": json.dumps({"error": str(exc)}),
            }
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

        yield {
            "event": "done",
            "data": json.dumps({"session_id": session_id}),
        }

    return EventSourceResponse(event_generator())


@router.get("/sessions", response_model=list[ChatSession])
async def get_sessions(user: UserInfo = Depends(get_current_user)):
    sessions = await firestore.get_chat_sessions(user.uid)
    return [
        ChatSession(
            id=s["id"],
            messages=[
                {"role": m["role"], "content": m["content"]}
                for m in s.get("messages", [])
            ],
            created_at=s["created_at"],
            updated_at=s["updated_at"],
        )
        for s in sessions
    ]

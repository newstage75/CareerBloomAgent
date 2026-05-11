from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None
    mode: str | None = None  # "discover" | "vision"


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    liked: bool = False


class ChatSession(BaseModel):
    id: str
    mode: str | None = None  # "discover" | "vision"
    title: str | None = None
    messages: list[ChatMessage]
    created_at: datetime
    updated_at: datetime


class UpdateChatSessionTitleRequest(BaseModel):
    title: str


class LikeMessageRequest(BaseModel):
    liked: bool

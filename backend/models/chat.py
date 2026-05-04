from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatSession(BaseModel):
    id: str
    messages: list[ChatMessage]
    created_at: datetime
    updated_at: datetime

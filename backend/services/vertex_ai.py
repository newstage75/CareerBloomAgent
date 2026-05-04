from __future__ import annotations

import asyncio
import logging
from typing import AsyncIterator

import vertexai
from vertexai.generative_models import Content, GenerativeModel, Part
from vertexai.language_models import TextEmbeddingModel

from config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lazy initialisation — only runs once on first call
# ---------------------------------------------------------------------------

_initialised = False
_chat_model: GenerativeModel | None = None
_embedding_model: TextEmbeddingModel | None = None

SYSTEM_INSTRUCTION = (
    "あなたは「CareerBloomAgent」のAIキャリアアドバイザーです。\n"
    "日本の転職市場に精通し、ユーザーのキャリア相談に親身に対応します。\n"
    "- ユーザーのスキルや経験を踏まえたアドバイスを提供\n"
    "- 具体的な業界動向や求人傾向を共有\n"
    "- 回答は簡潔で実用的に、日本語で応答\n"
    "- 転職以外の話題は丁寧にお断りしてキャリア相談に戻す"
)


def _ensure_initialised() -> None:
    global _initialised, _chat_model, _embedding_model
    if _initialised:
        return

    vertexai.init(
        project=settings.gcp_project_id,
        location=settings.vertex_ai_location,
    )

    _chat_model = GenerativeModel(
        "gemini-2.5-flash",
        system_instruction=SYSTEM_INSTRUCTION,
    )
    _embedding_model = TextEmbeddingModel.from_pretrained("text-embedding-005")
    _initialised = True


# ---------------------------------------------------------------------------
# Chat (streaming)
# ---------------------------------------------------------------------------


async def generate_chat_response(
    history: list[dict],
    user_message: str,
) -> AsyncIterator[str]:
    """Yield text chunks from Gemini using streaming."""
    _ensure_initialised()
    assert _chat_model is not None

    contents: list[Content] = []
    for msg in history:
        role = "user" if msg["role"] == "user" else "model"
        contents.append(Content(role=role, parts=[Part.from_text(msg["content"])]))

    chat = _chat_model.start_chat(history=contents)
    response = await chat.send_message_async(user_message, stream=True)

    async for chunk in response:
        if chunk.text:
            yield chunk.text


# ---------------------------------------------------------------------------
# Embeddings
# ---------------------------------------------------------------------------


async def get_embedding(text: str) -> list[float]:
    _ensure_initialised()
    assert _embedding_model is not None
    embeddings = await asyncio.to_thread(_embedding_model.get_embeddings, [text])
    return embeddings[0].values


async def get_embeddings_batch(texts: list[str]) -> list[list[float]]:
    _ensure_initialised()
    assert _embedding_model is not None
    embeddings = await asyncio.to_thread(_embedding_model.get_embeddings, texts)
    return [e.values for e in embeddings]

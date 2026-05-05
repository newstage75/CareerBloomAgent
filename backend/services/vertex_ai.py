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

DISCOVER_SYSTEM_INSTRUCTION = """あなたは共感的なキャリアカウンセラーです。ユーザーの価値観を深く探求することが使命です。

## あなたの役割
- ユーザーの過去の経験やエピソードから、大切にしている価値観を引き出す
- 内省を促す質問を投げかけ、ユーザー自身も気づいていない価値観を発見する
- 「なぜそう感じたのか」「その時何が嬉しかったのか」と深掘りする
- 批判せず、共感的に傾聴する

## 対話スタイル
- 一度に多くの質問をせず、1つずつ丁寧に掘り下げる
- ユーザーの言葉を言い換えて確認する（リフレクション）
- 具体的なエピソードを引き出す
- 価値観のキーワードを適宜まとめて提示する

## 回答ルール
- 1回の回答は150文字以内を目安に簡潔にする
- 質問は1つだけにする
- 箇条書きは最小限にする

日本語で応答してください。"""

VISION_SYSTEM_INSTRUCTION = """あなたはキャリアビジョン設計の専門家です。ユーザーの理想の将来像を一緒に描くことが使命です。

## あなたの役割
- ユーザーの価値観や強みを踏まえて、具体的なキャリアビジョンを設計する
- 短期（1-2年）、中期（3-5年）、長期（10年）の目標を整理する
- 理想と現実のギャップを分析し、具体的なアクションプランを提案する
- 複数のキャリアパスの選択肢を提示する

## 対話スタイル
- ビジョンを具体的にイメージできる質問をする
- 「5年後のある1日を想像してみてください」のような想像力を刺激する問いかけ
- 実現可能性と理想のバランスを取る
- マイルストーンを明確にする

## 回答ルール
- 1回の回答は150文字以内を目安に簡潔にする
- 質問は1つだけにする
- 箇条書きは最小限にする

日本語で応答してください。"""

_MODE_PROMPTS: dict[str, str] = {
    "discover": DISCOVER_SYSTEM_INSTRUCTION,
    "vision": VISION_SYSTEM_INSTRUCTION,
}


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
    mode: str | None = None,
) -> AsyncIterator[str]:
    """Yield text chunks from Gemini using streaming."""
    _ensure_initialised()
    assert _chat_model is not None

    system_prompt = _MODE_PROMPTS.get(mode, SYSTEM_INSTRUCTION) if mode else SYSTEM_INSTRUCTION

    # Use a mode-specific model instance when a non-default prompt is needed
    if system_prompt != SYSTEM_INSTRUCTION:
        model = GenerativeModel(
            "gemini-2.5-flash",
            system_instruction=system_prompt,
        )
    else:
        model = _chat_model

    contents: list[Content] = []
    for msg in history:
        role = "user" if msg["role"] == "user" else "model"
        contents.append(Content(role=role, parts=[Part.from_text(msg["content"])]))

    chat = model.start_chat(history=contents)
    response = await chat.send_message_async(user_message, stream=True)

    async for chunk in response:
        if not chunk.candidates:
            continue
        for part in chunk.candidates[0].content.parts:
            # 思考部分はスキップし、最終レスポンスのみ返す
            if getattr(part, "thought", False):
                continue
            if part.text:
                yield part.text


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

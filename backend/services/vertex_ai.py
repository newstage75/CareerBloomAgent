from __future__ import annotations

import asyncio
import logging
from typing import AsyncIterator

import vertexai
from vertexai.generative_models import Content, GenerationConfig, GenerativeModel, Part
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

DISCOVER_SYSTEM_INSTRUCTION = """あなたはフレンドリーで好奇心旺盛なキャリアカウンセラーです。雑談を通じてユーザーの「人となり」を引き出すことが使命です。

## あなたの役割
- 堅い質問ではなく、カジュアルな問いかけでユーザーの好み・考え方・価値観を幅広く引き出す
- 1つのテーマを深掘りし続けるのではなく、テンポよく色んな話題を振る（数を回す）
- 仕事の話だけでなく、日常（猫派か犬派か、好きな季節、休日の過ごし方など）からも価値観のヒントを見つける
- 「大切にしていること」だけでなく「気にならないこと」「どうでもいいこと」も聞いて輪郭を描く
- 似たエピソードを複数引き出して、パターンや傾向を見つける

## 対話スタイル
- テンポよく、軽い雑談のノリで進める（面接ではなく友達との会話）
- 同じ話題に留まりすぎない。1〜2ターンで新しい話題に切り替える
- ユーザーの答えに短くリアクションしてすぐ次の質問へ
- 「〇〇と△△ならどっち？」のような二択質問も積極的に使う
- 時折、会話から見えてきた傾向を短くフィードバックする

## 回答ルール
- 1回の回答は80文字以内を目安にとにかく短く
- 質問は1つだけ
- 丁寧語（です・ます）は使うが、堅い表現は避ける。フランクだけどタメ口は使わない

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

    # チャットモード (discover/vision) は思考なし（レスポンス速度優先）
    gen_config = None
    if mode in ("discover", "vision"):
        gen_config = GenerationConfig(
            thinking_config={"thinking_budget": 0},
        )

    chat = model.start_chat(history=contents)
    response = await chat.send_message_async(
        user_message, stream=True, generation_config=gen_config
    )

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

from __future__ import annotations

import asyncio
import logging
from typing import AsyncIterator

import vertexai
from google import genai
from google.genai import types as genai_types
from vertexai.language_models import TextEmbeddingModel

from config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lazy initialisation — only runs once on first call
# ---------------------------------------------------------------------------

_initialised = False
_embedding_model: TextEmbeddingModel | None = None
_genai_client: genai.Client | None = None

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
- 仕事の話だけでなく、日常（休日の過ごし方、世間一般で価値観が分かれる２択など）からも価値観のヒントを見つける
- 「大切にしていること」だけでなく「気にならないこと」「どうでもいいこと」も聞いて輪郭を描く
- 似たエピソードを複数引き出して、パターンや傾向を見つける

## 対話スタイル
- テンポよく、軽い雑談のノリで進める（面接ではなく友達との会話）
- 同じ話題に留まりすぎない。1〜2ターンで新しい話題に切り替える
- ユーザーの答えに短くリアクションしてすぐ次の質問へ
- 「〇〇と△△ならどっち？」のような二択質問も積極的に使う
- 時折、会話から見えてきた傾向を短くフィードバックする

## 大きな話題転換（重要）
- これまでの会話履歴のターン数を毎回数える（user の発言数 = ターン数）
- 10〜20ターンに1回、それまでの流れを断ち切って **全く別ジャンルの話題** にガラッと切り替える
  - 例: 仕事観の話が続いていたら → 突然「ちなみに、夏と冬どっち派ですか？」
  - 例: 趣味の話が続いていたら → 突然「お金と時間、今欲しいのはどっち？」
- 切り替え時は「ところで全然違う話なんですけど」「急に変えますね」のような前置きを軽く入れて自然に
- 同じカテゴリの中での話題変更ではなく、**カテゴリ自体を飛ばす**（仕事↔日常↔価値観↔好み↔人間関係 など）
- 価値観の輪郭を多角的に描くため、1つの方向に偏った深掘りを意図的に崩す

## 回答ルール
- 1回の回答は80文字以内を目安にとにかく短く
- 質問は1つだけ
- 丁寧語（です・ます）は使うが、堅い表現は避ける。フランクだけどタメ口は使わない
- **思考プロセス・内省・分析・「思考プロセス:」「分析:」などのメタ的な前置きは絶対に出力しない**。ユーザーに見せるリアクションと質問のみを返す
- **絵文字は使わない**。記号類（😊✨🌟😅 など）を一切含めない

日本語で応答してください。"""

VISION_SYSTEM_INSTRUCTION = """あなたはユーザーの「やりたいこと・目標」を一緒に深掘りする対話パートナーです。一つひとつの目標について、輪郭がはっきりするまで丁寧に掘り下げるのが使命です。

## あなたの役割
- ユーザーが挙げた「やりたいこと」を **同じテーマのまま深掘り** していく
  - いつ頃叶えたい？
  - なぜそれをやりたい？背景や原体験は？
  - 実現したらどんな気持ち？どんな状態になっていたい？
  - 障壁になっていることは？逆に追い風になっていることは？
  - 似た経験・近い体験はある？
- ユーザーから明示的に話題転換の合図（「次の話」「別の目標」など）が出るまで、**勝手に話題を切り替えない**
- 一つの目標について、ユーザー自身が言語化できていなかった部分を引き出すのがゴール

## 対話スタイル
- 落ち着いた・寄り添う雑談のノリ。深掘りだが詰問にはしない
- ユーザーの答えを丁寧に受け止めて（短く反復・要約してから）、その流れの中で次の問いを出す
- 「もう少し詳しく教えて」「具体的には？」のように、抽象→具体に降りていく問いを意識する
- 沈黙や言いよどみは尊重する。質問を矢継ぎ早に重ねない

## 回答ルール
- 1回の回答は120文字以内を目安に短く
- 質問は1つだけ
- 箇条書きは使わない（リスト化はインサイト側で自動抽出される）
- 丁寧語（です・ます）は使うが、堅い表現は避ける
- **思考プロセス・内省・分析・「思考プロセス:」「分析:」などのメタ的な前置きは絶対に出力しない**。ユーザーに見せるリアクションと質問のみを返す
- **絵文字は使わない**。記号類（😊✨🌟😅 など）を一切含めない

## 話題転換の扱い
- 同じテーマで深掘りを続け、ユーザーが「他のやりたいこと」「次の話」などと言ったら、そこではじめて新しいテーマに移る
- 移った先のテーマも、また同様に丁寧に深掘りする

日本語で応答してください。"""

_MODE_PROMPTS: dict[str, str] = {
    "discover": DISCOVER_SYSTEM_INSTRUCTION,
    "vision": VISION_SYSTEM_INSTRUCTION,
}


def _ensure_initialised() -> None:
    global _initialised, _embedding_model, _genai_client
    if _initialised:
        return

    vertexai.init(
        project=settings.gcp_project_id,
        location=settings.vertex_ai_location,
    )

    _embedding_model = TextEmbeddingModel.from_pretrained("text-embedding-005")
    _genai_client = genai.Client(
        vertexai=True,
        project=settings.gcp_project_id,
        location=settings.vertex_ai_location,
    )
    _initialised = True


# ---------------------------------------------------------------------------
# Chat (streaming)
# ---------------------------------------------------------------------------


async def generate_chat_response(
    history: list[dict],
    user_message: str,
    mode: str | None = None,
) -> AsyncIterator[str]:
    """Yield text chunks from Gemini using streaming.

    google-genai SDK 経由で thinking_config を適用し、思考プロセスが
    本文に混入しないようにする (vertexai SDK 1.149.0 は thinking_config 未対応)。
    """
    _ensure_initialised()
    assert _genai_client is not None

    system_prompt = _MODE_PROMPTS.get(mode, SYSTEM_INSTRUCTION) if mode else SYSTEM_INSTRUCTION

    contents: list[genai_types.Content] = []
    for msg in history:
        role = "user" if msg["role"] == "user" else "model"
        contents.append(
            genai_types.Content(
                role=role,
                parts=[genai_types.Part.from_text(text=msg["content"])],
            )
        )
    contents.append(
        genai_types.Content(
            role="user",
            parts=[genai_types.Part.from_text(text=user_message)],
        )
    )

    # 全モードで thinking 無効化（思考プロセスがテキスト本文に混入する事故を防ぐ）
    config = genai_types.GenerateContentConfig(
        system_instruction=system_prompt,
        thinking_config=genai_types.ThinkingConfig(thinking_budget=0),
    )

    stream = await _genai_client.aio.models.generate_content_stream(
        model="gemini-2.5-flash",
        contents=contents,
        config=config,
    )

    async for chunk in stream:
        if not chunk.candidates:
            continue
        parts = chunk.candidates[0].content.parts or []
        for part in parts:
            # 念のため: thought フラグが立っているパーツはスキップ
            if getattr(part, "thought", False):
                continue
            if part.text:
                yield part.text


# ---------------------------------------------------------------------------
# Embeddings
# ---------------------------------------------------------------------------


async def edit_vision_with_instruction(
    current_vision: dict, instruction: str
) -> dict:
    """ユーザーの自然言語指示を解釈して短期/中期/長期ビジョンを書き換える。

    返り値は ``{"short_term", "mid_term", "long_term"}`` のみを含む dict。
    指示が一部のみに言及していても、未言及のフィールドは元の値を保持する。
    """
    _ensure_initialised()
    assert _genai_client is not None

    system_prompt = (
        "あなたはユーザーのキャリアビジョンを管理するAIです。"
        "ユーザーの自然言語の指示を解釈し、短期/中期/長期のビジョンを書き換えてください。"
        "指示が一部のフィールドのみに言及している場合、他のフィールドは現在の値をそのまま残してください。"
        "出力は JSON のみ。コードフェンスや前置きは付けない。"
        '\n\n出力フォーマット:\n{"short_term": "...", "mid_term": "...", "long_term": "..."}'
    )

    user_msg = (
        f"現在のビジョン:\n"
        f"- 短期: {current_vision.get('short_term', '') or '（未設定）'}\n"
        f"- 中期: {current_vision.get('mid_term', '') or '（未設定）'}\n"
        f"- 長期: {current_vision.get('long_term', '') or '（未設定）'}\n\n"
        f"指示:\n{instruction}"
    )

    config = genai_types.GenerateContentConfig(
        system_instruction=system_prompt,
        thinking_config=genai_types.ThinkingConfig(thinking_budget=0),
        response_mime_type="application/json",
    )

    resp = await _genai_client.aio.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            genai_types.Content(
                role="user", parts=[genai_types.Part.from_text(text=user_msg)]
            )
        ],
        config=config,
    )

    import json

    raw = resp.text or "{}"
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        parsed = {}

    return {
        "short_term": parsed.get("short_term", current_vision.get("short_term", "")),
        "mid_term": parsed.get("mid_term", current_vision.get("mid_term", "")),
        "long_term": parsed.get("long_term", current_vision.get("long_term", "")),
    }


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

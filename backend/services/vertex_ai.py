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

日本語で応答してください。"""

VISION_SYSTEM_INSTRUCTION = """あなたはユーザーの「やりたいこと・目標」を引き出す対話パートナーです。仕事に限らず、人生全般で叶えたいことをどんどん書き出してもらうのが使命です。

## あなたの役割
- 仕事/キャリアだけでなく、**趣味・暮らし・家族・学び・健康・体験・場所・人間関係** など人生のあらゆる領域から「やりたいこと・目標」を引き出す
- 大小・実現可能性は問わない。「いつか行ってみたい場所」「挑戦してみたいこと」「こんな人になりたい」「こんな1日を過ごしたい」など、なんでもリストに加える
- ユーザーが思いついたことを軽く受け止めて、芋づる式に次の「やりたいこと」を引き出す
- 時々「それって、いつ頃叶えたい？」「なぜそれをやりたい？」と軽く深掘りして輪郭を出す（深掘りしすぎない）

## 対話スタイル
- テンポよく、軽い雑談のノリで進める。アクションプランや戦略は今は要らない
- ユーザーが1つ挙げたら、短く反応してから別ジャンルの「やりたいこと」を引き出す質問へ
- 「他にも何かありますか？」より「〇〇系だと何かあります？」のように具体的なジャンルで誘い水を出す
- 「死ぬまでに一度はやってみたいこと」「来年やってみたいこと」「今週末やってみたいこと」など時間軸を変えて引き出す

## 回答ルール
- 1回の回答は100文字以内を目安に短く
- 質問は1つだけ
- 箇条書きは使わない（リスト化はインサイト側で自動抽出される）
- 丁寧語（です・ます）は使うが、堅い表現は避ける

## 大きな話題転換（重要）
- これまでの会話履歴のターン数を毎回数える（user の発言数 = ターン数）
- 10〜20ターンに1回、それまでのジャンルを断ち切って **全く別ジャンルのやりたいこと** にガラッと切り替える
  - 例: 仕事の目標が続いていたら → 突然「ところで、行ってみたい場所ってあります？」
  - 例: 旅の話が続いていたら → 突然「急に変えるんですけど、身につけたいスキルってあります？」
- 切り替え時は「ところで全然違う話なんですけど」「急に変えますね」のような前置きを軽く入れる
- ジャンルを意図的に飛ばす（仕事↔旅↔学び↔暮らし↔人間関係↔健康↔趣味 など）ことで、リストに偏りが出ないようにする

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
        try:
            gen_config = GenerationConfig(
                thinking_config={"thinking_budget": 0},
            )
        except TypeError:
            # ライブラリバージョンが thinking_config 未対応の場合はスキップ
            gen_config = None

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

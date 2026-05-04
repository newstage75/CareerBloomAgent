from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

import vertexai
from vertexai.generative_models import GenerativeModel

from config import settings
from services.firestore import get_chat_sessions, save_insights

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lazy initialisation
# ---------------------------------------------------------------------------

_model: GenerativeModel | None = None


def _ensure_model() -> GenerativeModel:
    global _model
    if _model is not None:
        return _model

    vertexai.init(
        project=settings.gcp_project_id,
        location=settings.vertex_ai_location,
    )

    _model = GenerativeModel("gemini-2.5-flash")
    return _model


# ---------------------------------------------------------------------------
# Extraction prompt
# ---------------------------------------------------------------------------

EXTRACTION_PROMPT = """\
あなたはキャリアカウンセリングの専門家です。
以下はユーザーとAIキャリアアドバイザーの対話履歴です。
この対話内容を分析し、ユーザーの価値観・キャリアビジョン・強みなどを抽出してください。

## 対話履歴
{conversation_text}

## 出力フォーマット
以下のJSON構造で出力してください。必ずすべてのフィールドを含めてください。

{{
  "values": [
    {{
      "label": "価値観の名前（例: チームワーク）",
      "description": "この価値観の詳細な説明（対話内容に基づく）",
      "confidence": "high | medium | low（対話中で言及された頻度・強度に基づく）"
    }}
  ],
  "vision": {{
    "short_term": "1-2年の短期キャリア目標",
    "mid_term": "3-5年の中期キャリア目標",
    "long_term": "10年後の長期キャリアビジョン"
  }},
  "strengths": ["強み1", "強み2", "強み3"],
  "themes": ["対話で繰り返し現れたテーマ・キーワード1", "テーマ2"],
  "bucket_list": [
    {{"id": "b1", "text": "ユーザーが成し遂げたいこと"}},
    {{"id": "b2", "text": "..."}}
  ],
  "never_list": [
    {{"id": "n1", "text": "ユーザーが避けたいこと"}},
    {{"id": "n2", "text": "..."}}
  ]
}}

## 注意事項
- confidence は対話中でその価値観が何度も・強く言及されていれば "high"、数回なら "medium"、推測に近いなら "low"
- 対話内容から読み取れない項目は、対話の文脈から合理的に推測して埋めてください
- values は最低3つ、最大6つ抽出してください
- strengths は最低3つ抽出してください
- bucket_list, never_list はそれぞれ最低2つ抽出してください
- 日本語で出力してください
"""


# ---------------------------------------------------------------------------
# Main function
# ---------------------------------------------------------------------------


async def generate_insights(uid: str) -> dict:
    """Analyze all chat sessions and extract user insights using Gemini."""
    model = _ensure_model()

    # 1. Fetch all chat sessions
    sessions = await get_chat_sessions(uid)

    if not sessions:
        return {
            "values": [],
            "vision": {"short_term": "", "mid_term": "", "long_term": ""},
            "strengths": [],
            "themes": [],
            "bucket_list": [],
            "never_list": [],
            "generated_at": datetime.now(timezone.utc),
        }

    # 2. Build conversation text from all messages
    conversation_parts: list[str] = []
    for session in sessions:
        messages = session.get("messages", [])
        for msg in messages:
            role_label = "ユーザー" if msg["role"] == "user" else "AI"
            conversation_parts.append(f"{role_label}: {msg['content']}")

    conversation_text = "\n".join(conversation_parts)

    if not conversation_text.strip():
        return {
            "values": [],
            "vision": {"short_term": "", "mid_term": "", "long_term": ""},
            "strengths": [],
            "themes": [],
            "bucket_list": [],
            "never_list": [],
            "generated_at": datetime.now(timezone.utc),
        }

    # 3. Create the extraction prompt
    prompt = EXTRACTION_PROMPT.format(conversation_text=conversation_text)

    # 4. Call Gemini with JSON response mode
    response = await model.generate_content_async(
        prompt,
        generation_config={
            "response_mime_type": "application/json",
            "temperature": 0.3,
        },
    )

    # 5. Parse the response
    try:
        insights = json.loads(response.text)
    except (json.JSONDecodeError, ValueError) as exc:
        logger.error("Failed to parse Gemini insight response: %s", exc)
        raise ValueError("インサイトの生成に失敗しました。もう一度お試しください。") from exc

    # 6. Add timestamp
    insights["generated_at"] = datetime.now(timezone.utc)

    # 7. Save to Firestore
    await save_insights(uid, insights)

    # 8. Return
    return insights

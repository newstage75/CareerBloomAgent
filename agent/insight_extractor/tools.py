"""Tools for the Insight Extractor agent."""

from __future__ import annotations

import json

from agent.shared.firestore_client import (
    add_value_history_entry,
    get_chat_sessions,
    get_insights,
    save_insights,
)


def get_chat_history(user_id: str, limit: int = 10) -> str:
    """Firestore から対話履歴を取得し、テキスト形式で返す。

    Args:
        user_id: ユーザーID
        limit: 取得するセッション数（デフォルト10）

    Returns:
        対話履歴のテキスト。セッションごとに区切られている。
    """
    sessions = get_chat_sessions(user_id, limit=limit)

    if not sessions:
        return "対話履歴がありません。"

    parts: list[str] = []
    for session in sessions:
        mode = session.get("mode", "general")
        parts.append(f"\n--- セッション（モード: {mode}）---")
        messages = session.get("messages", [])
        for msg in messages:
            role_label = "ユーザー" if msg["role"] == "user" else "AI"
            parts.append(f"{role_label}: {msg['content']}")

    return "\n".join(parts)


def get_current_insights(user_id: str) -> str:
    """既存のインサイトを取得する（差分比較用）。

    Args:
        user_id: ユーザーID

    Returns:
        既存インサイトのJSON文字列。存在しない場合は空メッセージ。
    """
    insights = get_insights(user_id)
    if insights is None:
        return "既存のインサイトはありません（初回抽出）。"
    return json.dumps(insights, ensure_ascii=False, default=str)


def save_extracted_insights(user_id: str, insights_json: str) -> str:
    """抽出したインサイトを Firestore の insights/latest に保存する。

    Args:
        user_id: ユーザーID
        insights_json: インサイトのJSON文字列。以下のフィールドを含む:
            - values: list[{label, description, confidence}]
            - vision: {short_term, mid_term, long_term}
            - strengths: list[str]
            - themes: list[str]
            - bucket_list: list[{id, text}]
            - never_list: list[{id, text}]

    Returns:
        保存結果メッセージ
    """
    try:
        insights = json.loads(insights_json)
    except json.JSONDecodeError as e:
        return f"JSONパースエラー: {e}"

    from datetime import datetime, timezone
    insights["generated_at"] = datetime.now(timezone.utc)
    save_insights(user_id, insights)
    return "インサイトを保存しました。"


def add_value_history(user_id: str, category: str, title: str, description: str, source: str | None = None) -> str:
    """価値観の変化履歴にエントリを追加する。

    Args:
        user_id: ユーザーID
        category: 変化カテゴリ（discovered, strengthened, shifted, vision_updated）
        title: 変化のタイトル
        description: 変化の詳細説明
        source: ソース（discover, vision）。Noneの場合は省略。

    Returns:
        作成されたエントリのID
    """
    entry: dict = {
        "category": category,
        "title": title,
        "description": description,
    }
    if source:
        entry["source"] = source
    entry_id = add_value_history_entry(user_id, entry)
    return f"価値観変化を記録しました（ID: {entry_id}）"

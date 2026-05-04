"""Tools for the Matching Calculator agent."""

from __future__ import annotations

import json

import numpy as np
import vertexai
from vertexai.language_models import TextEmbeddingModel

from agent.config import GCP_PROJECT_ID, VERTEX_AI_LOCATION, EMBEDDING_MODEL_ID
from agent.shared.firestore_client import (
    get_insights,
    get_jobs,
    get_skills,
    save_matches,
)

_embedding_model: TextEmbeddingModel | None = None


def _get_embedding_model() -> TextEmbeddingModel:
    global _embedding_model
    if _embedding_model is None:
        vertexai.init(project=GCP_PROJECT_ID, location=VERTEX_AI_LOCATION)
        _embedding_model = TextEmbeddingModel.from_pretrained(EMBEDDING_MODEL_ID)
    return _embedding_model


def get_user_skills(user_id: str) -> str:
    """ユーザーのスキルとembeddingを取得する。

    Args:
        user_id: ユーザーID

    Returns:
        スキル情報のJSON文字列
    """
    skills = get_skills(user_id)
    if not skills:
        return "スキルが登録されていません。"
    # Remove large embedding arrays from display but keep them for matching
    display = []
    for s in skills:
        display.append({
            "id": s.get("id"),
            "name": s.get("name"),
            "level": s.get("level"),
            "has_embedding": "embedding" in s,
        })
    return json.dumps(display, ensure_ascii=False)


def get_user_insights(user_id: str) -> str:
    """ユーザーの価値観テキストを取得する。

    Args:
        user_id: ユーザーID

    Returns:
        価値観情報のJSON文字列
    """
    insights = get_insights(user_id)
    if insights is None:
        return "インサイトがまだ生成されていません。"
    # Return values and vision for matching
    relevant = {
        "values": insights.get("values", []),
        "vision": insights.get("vision", {}),
        "themes": insights.get("themes", []),
    }
    return json.dumps(relevant, ensure_ascii=False, default=str)


def get_available_jobs() -> str:
    """全求人データを取得する。

    Returns:
        求人情報の要約JSON文字列
    """
    jobs = get_jobs()
    if not jobs:
        return "求人データがありません。"
    display = []
    for j in jobs:
        display.append({
            "id": j.get("id"),
            "company": j.get("company"),
            "position": j.get("position"),
            "requirements": j.get("requirements", [])[:5],
            "tags": j.get("tags", []),
            "has_embedding": "embedding" in j,
        })
    return json.dumps(display, ensure_ascii=False)


def compute_similarity(embedding_a_json: str, embedding_b_json: str) -> str:
    """2つのembedding間のコサイン類似度を計算する。

    Args:
        embedding_a_json: 1つ目のembeddingのJSON配列文字列
        embedding_b_json: 2つ目のembeddingのJSON配列文字列

    Returns:
        類似度スコア（0.0〜1.0）
    """
    try:
        a = np.array(json.loads(embedding_a_json), dtype=np.float32)
        b = np.array(json.loads(embedding_b_json), dtype=np.float32)
    except (json.JSONDecodeError, ValueError) as e:
        return f"エラー: {e}"

    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return "0.0"
    similarity = float(np.dot(a, b) / (norm_a * norm_b))
    return str(round(similarity, 4))


def generate_embeddings(texts_json: str) -> str:
    """テキストリストからembeddingを生成する。

    Args:
        texts_json: テキストリストのJSON配列文字列

    Returns:
        embedding配列のJSON文字列
    """
    try:
        texts = json.loads(texts_json)
    except json.JSONDecodeError as e:
        return f"JSONパースエラー: {e}"

    if not texts:
        return "[]"

    model = _get_embedding_model()
    embeddings_result = model.get_embeddings(texts)
    embeddings = [e.values for e in embeddings_result]
    return json.dumps(embeddings)


def save_match_results(user_id: str, results_json: str) -> str:
    """マッチング結果を Firestore に保存する。

    Args:
        user_id: ユーザーID
        results_json: マッチング結果のJSON文字列。各要素:
            - job_id: str
            - company: str
            - position: str
            - score: float (0-100)
            - matched_skills: list[str]
            - gap_skills: list[str]
            - tags: list[str]
            - value_alignment: {summary: str, score: float}

    Returns:
        保存結果メッセージ
    """
    try:
        results = json.loads(results_json)
    except json.JSONDecodeError as e:
        return f"JSONパースエラー: {e}"

    from datetime import datetime, timezone
    for r in results:
        r["calculated_at"] = datetime.now(timezone.utc)

    save_matches(user_id, results)
    return f"{len(results)}件のマッチング結果を保存しました。"

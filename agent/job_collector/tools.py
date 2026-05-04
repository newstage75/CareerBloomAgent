"""Tools for the Job Collector agent."""

from __future__ import annotations

import json
import logging

import vertexai
from vertexai.generative_models import GenerativeModel
from vertexai.language_models import TextEmbeddingModel

from agent.config import GCP_PROJECT_ID, VERTEX_AI_LOCATION, MODEL_ID, EMBEDDING_MODEL_ID
from agent.shared.firestore_client import store_jobs as _store_jobs

logger = logging.getLogger(__name__)

_parse_model: GenerativeModel | None = None
_embedding_model: TextEmbeddingModel | None = None


def _get_parse_model() -> GenerativeModel:
    global _parse_model
    if _parse_model is None:
        vertexai.init(project=GCP_PROJECT_ID, location=VERTEX_AI_LOCATION)
        _parse_model = GenerativeModel(MODEL_ID)
    return _parse_model


def _get_embedding_model() -> TextEmbeddingModel:
    global _embedding_model
    if _embedding_model is None:
        vertexai.init(project=GCP_PROJECT_ID, location=VERTEX_AI_LOCATION)
        _embedding_model = TextEmbeddingModel.from_pretrained(EMBEDDING_MODEL_ID)
    return _embedding_model


PARSE_PROMPT = """\
以下のテキストから求人情報を構造化して抽出してください。
複数の求人が含まれている場合はすべて抽出してください。

## 入力テキスト
{raw_text}

## 出力フォーマット（JSON配列）
[
  {{
    "company": "企業名",
    "position": "ポジション名",
    "requirements": ["必要スキル1", "必要スキル2"],
    "description": "求人の説明（100文字以内）",
    "source_url": "情報元URL（不明な場合は空文字）",
    "tags": ["タグ1", "タグ2"]
  }}
]

## 注意事項
- 不明な項目は空文字列または空配列
- requirements は技術スキルやツール名を抽出
- tags は業界・職種・特徴を示すキーワード
- 日本語で出力
"""


def parse_job_postings(raw_text: str) -> str:
    """検索結果のテキストから求人情報を構造化抽出する。

    Args:
        raw_text: Web検索から得た生テキスト

    Returns:
        構造化された求人情報のJSON文字列
    """
    model = _get_parse_model()
    prompt = PARSE_PROMPT.format(raw_text=raw_text)

    response = model.generate_content(
        prompt,
        generation_config={
            "response_mime_type": "application/json",
            "temperature": 0.2,
        },
    )

    try:
        jobs = json.loads(response.text)
        if not isinstance(jobs, list):
            return "[]"
        # Validate
        validated = []
        for job in jobs:
            if isinstance(job, dict) and "company" in job and "position" in job:
                validated.append(job)
        return json.dumps(validated, ensure_ascii=False)
    except (json.JSONDecodeError, ValueError) as e:
        logger.error("Failed to parse job postings: %s", e)
        return "[]"


def store_jobs_to_firestore(jobs_json: str) -> str:
    """求人データを Firestore に保存する（重複排除・embedding生成付き）。

    Args:
        jobs_json: 求人データのJSON配列文字列。各要素:
            - company: str
            - position: str
            - requirements: list[str]
            - description: str
            - source_url: str
            - tags: list[str]

    Returns:
        保存結果サマリ
    """
    try:
        jobs = json.loads(jobs_json)
    except json.JSONDecodeError as e:
        return f"JSONパースエラー: {e}"

    if not jobs:
        return "保存する求人がありません。"

    # Generate embeddings for requirements
    embedding_model = _get_embedding_model()
    for job in jobs:
        requirements = job.get("requirements", [])
        if requirements:
            text = " ".join(requirements)
            try:
                result = embedding_model.get_embeddings([text])
                job["embedding"] = result[0].values
            except Exception as e:
                logger.warning("Embedding generation failed for %s: %s", job.get("company"), e)

    result = _store_jobs(jobs)
    return json.dumps(result, ensure_ascii=False)

"""Tests for the Job Collector agent tools."""

from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

import pytest

from agent.job_collector.tools import parse_job_postings, store_jobs_to_firestore


@patch("agent.job_collector.tools._get_parse_model")
def test_parse_job_postings(mock_model_fn):
    mock_model = MagicMock()
    mock_response = MagicMock()
    mock_response.text = json.dumps([
        {
            "company": "テスト株式会社",
            "position": "バックエンドエンジニア",
            "requirements": ["Python", "FastAPI"],
            "description": "バックエンド開発",
            "source_url": "https://example.com/job1",
            "tags": ["エンジニア"],
        }
    ])
    mock_model.generate_content.return_value = mock_response
    mock_model_fn.return_value = mock_model

    result = parse_job_postings("テスト株式会社 バックエンドエンジニア募集 Python FastAPI")
    parsed = json.loads(result)
    assert len(parsed) == 1
    assert parsed[0]["company"] == "テスト株式会社"
    assert "Python" in parsed[0]["requirements"]


@patch("agent.job_collector.tools._get_parse_model")
def test_parse_job_postings_invalid_response(mock_model_fn):
    mock_model = MagicMock()
    mock_response = MagicMock()
    mock_response.text = "not valid json"
    mock_model.generate_content.return_value = mock_response
    mock_model_fn.return_value = mock_model

    result = parse_job_postings("some raw text")
    assert result == "[]"


@patch("agent.job_collector.tools._get_embedding_model")
@patch("agent.job_collector.tools._store_jobs")
def test_store_jobs_to_firestore(mock_store, mock_embed_fn):
    mock_embed_model = MagicMock()
    mock_embedding = MagicMock()
    mock_embedding.values = [0.1] * 256
    mock_embed_model.get_embeddings.return_value = [mock_embedding]
    mock_embed_fn.return_value = mock_embed_model

    mock_store.return_value = {"total": 1, "new": 1, "duplicates": 0}

    jobs = [
        {
            "company": "テスト株式会社",
            "position": "エンジニア",
            "requirements": ["Python", "Docker"],
            "description": "開発",
            "source_url": "https://example.com/job1",
            "tags": ["エンジニア"],
        }
    ]
    result = store_jobs_to_firestore(json.dumps(jobs))
    parsed = json.loads(result)
    assert parsed["new"] == 1
    mock_store.assert_called_once()
    stored = mock_store.call_args[0][0]
    assert "embedding" in stored[0]


def test_store_jobs_to_firestore_empty():
    result = store_jobs_to_firestore("[]")
    assert "ありません" in result


def test_store_jobs_to_firestore_invalid_json():
    result = store_jobs_to_firestore("not json")
    assert "エラー" in result

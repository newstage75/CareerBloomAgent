"""Tests for the Matching Calculator agent tools."""

from __future__ import annotations

import json
from unittest.mock import patch

import pytest

from agent.matching_calculator.tools import (
    compute_similarity,
    get_available_jobs,
    get_user_insights,
    get_user_skills,
    save_match_results,
)


@patch("agent.matching_calculator.tools.get_skills")
def test_get_user_skills(mock_get):
    mock_get.return_value = [
        {"id": "s1", "name": "Python", "level": "advanced", "embedding": [0.1] * 256},
        {"id": "s2", "name": "React", "level": "intermediate"},
    ]
    result = get_user_skills("user123")
    parsed = json.loads(result)
    assert len(parsed) == 2
    assert parsed[0]["name"] == "Python"
    assert parsed[0]["has_embedding"] is True
    assert parsed[1]["has_embedding"] is False


@patch("agent.matching_calculator.tools.get_skills")
def test_get_user_skills_empty(mock_get):
    mock_get.return_value = []
    result = get_user_skills("user123")
    assert "登録されていません" in result


@patch("agent.matching_calculator.tools.get_insights")
def test_get_user_insights(mock_get):
    mock_get.return_value = {
        "values": [{"label": "成長", "description": "学び続けたい", "confidence": "high"}],
        "vision": {"short_term": "転職", "mid_term": "リーダー", "long_term": "CTO"},
        "themes": ["成長", "リーダーシップ"],
        "strengths": ["コミュニケーション"],
    }
    result = get_user_insights("user123")
    parsed = json.loads(result)
    assert "values" in parsed
    assert "vision" in parsed
    assert "themes" in parsed
    # strengths should not be included (not relevant for matching)
    assert "strengths" not in parsed


@patch("agent.matching_calculator.tools.get_insights")
def test_get_user_insights_empty(mock_get):
    mock_get.return_value = None
    result = get_user_insights("user123")
    assert "生成されていません" in result


@patch("agent.matching_calculator.tools.get_jobs")
def test_get_available_jobs(mock_get):
    mock_get.return_value = [
        {
            "id": "j1",
            "company": "テスト株式会社",
            "position": "Pythonエンジニア",
            "requirements": ["Python", "FastAPI", "Docker"],
            "tags": ["エンジニア", "バックエンド"],
            "embedding": [0.1] * 256,
        }
    ]
    result = get_available_jobs()
    parsed = json.loads(result)
    assert len(parsed) == 1
    assert parsed[0]["company"] == "テスト株式会社"
    assert parsed[0]["has_embedding"] is True
    assert len(parsed[0]["requirements"]) <= 5


@patch("agent.matching_calculator.tools.get_jobs")
def test_get_available_jobs_empty(mock_get):
    mock_get.return_value = []
    result = get_available_jobs()
    assert "ありません" in result


def test_compute_similarity_identical():
    vec = [1.0, 0.0, 0.0]
    result = compute_similarity(json.dumps(vec), json.dumps(vec))
    assert float(result) == 1.0


def test_compute_similarity_orthogonal():
    a = [1.0, 0.0, 0.0]
    b = [0.0, 1.0, 0.0]
    result = compute_similarity(json.dumps(a), json.dumps(b))
    assert float(result) == 0.0


def test_compute_similarity_invalid():
    result = compute_similarity("invalid", "[1,2,3]")
    assert "エラー" in result


@patch("agent.matching_calculator.tools.save_matches")
def test_save_match_results(mock_save):
    results = [
        {
            "job_id": "j1",
            "company": "テスト株式会社",
            "position": "エンジニア",
            "score": 85.0,
            "matched_skills": ["Python"],
            "gap_skills": ["Go"],
            "tags": ["エンジニア"],
            "value_alignment": {"summary": "成長環境が合致", "score": 90.0},
        }
    ]
    result = save_match_results("user123", json.dumps(results))
    assert "1件" in result
    mock_save.assert_called_once()
    saved = mock_save.call_args[0][1]
    assert saved[0]["company"] == "テスト株式会社"
    assert "calculated_at" in saved[0]


def test_save_match_results_invalid_json():
    result = save_match_results("user123", "not json")
    assert "エラー" in result

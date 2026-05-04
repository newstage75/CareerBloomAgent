"""Tests for the Insight Extractor agent."""

from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

import pytest

from agent.insight_extractor.tools import (
    add_value_history,
    get_chat_history,
    get_current_insights,
    save_extracted_insights,
)


@pytest.fixture
def mock_sessions():
    return [
        {
            "id": "session1",
            "mode": "discover",
            "messages": [
                {"role": "user", "content": "チームで働くのが好きです"},
                {"role": "assistant", "content": "チームワークを大切にされているのですね"},
                {"role": "user", "content": "はい、一人で黙々とやるより協力して成果を出したい"},
            ],
        },
        {
            "id": "session2",
            "mode": "vision",
            "messages": [
                {"role": "user", "content": "3年後にはリーダーになりたい"},
                {"role": "assistant", "content": "リーダーシップを発揮したいのですね"},
            ],
        },
    ]


@patch("agent.insight_extractor.tools.get_chat_sessions")
def test_get_chat_history(mock_get_sessions, mock_sessions):
    mock_get_sessions.return_value = mock_sessions
    result = get_chat_history("user123", limit=10)
    assert "チームで働くのが好きです" in result
    assert "セッション（モード: discover）" in result
    assert "セッション（モード: vision）" in result
    mock_get_sessions.assert_called_once_with("user123", limit=10)


@patch("agent.insight_extractor.tools.get_chat_sessions")
def test_get_chat_history_empty(mock_get_sessions):
    mock_get_sessions.return_value = []
    result = get_chat_history("user123")
    assert "対話履歴がありません" in result


@patch("agent.insight_extractor.tools.get_insights")
def test_get_current_insights_none(mock_get):
    mock_get.return_value = None
    result = get_current_insights("user123")
    assert "初回抽出" in result


@patch("agent.insight_extractor.tools.get_insights")
def test_get_current_insights_existing(mock_get):
    mock_get.return_value = {"values": [{"label": "チームワーク"}]}
    result = get_current_insights("user123")
    parsed = json.loads(result)
    assert parsed["values"][0]["label"] == "チームワーク"


@patch("agent.insight_extractor.tools.save_insights")
def test_save_extracted_insights(mock_save):
    insights = {
        "values": [{"label": "成長", "description": "常に学び続けたい", "confidence": "high"}],
        "vision": {"short_term": "転職", "mid_term": "リーダー", "long_term": "CTO"},
        "strengths": ["コミュニケーション"],
        "themes": ["成長"],
        "bucket_list": [{"id": "b1", "text": "起業"}],
        "never_list": [{"id": "n1", "text": "単純作業"}],
    }
    result = save_extracted_insights("user123", json.dumps(insights))
    assert "保存しました" in result
    mock_save.assert_called_once()
    saved_data = mock_save.call_args[0][1]
    assert saved_data["values"][0]["label"] == "成長"
    assert "generated_at" in saved_data


def test_save_extracted_insights_invalid_json():
    result = save_extracted_insights("user123", "invalid json{{{")
    assert "エラー" in result


@patch("agent.insight_extractor.tools.add_value_history_entry")
def test_add_value_history(mock_add):
    mock_add.return_value = "entry123"
    result = add_value_history(
        "user123",
        category="discovered",
        title="チームワーク",
        description="協働を大切にする価値観が発見された",
        source="discover",
    )
    assert "entry123" in result
    mock_add.assert_called_once()
    entry = mock_add.call_args[0][1]
    assert entry["category"] == "discovered"
    assert entry["source"] == "discover"

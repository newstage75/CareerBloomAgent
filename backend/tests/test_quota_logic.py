"""クォータの論理日付・ゲストUID生成のテスト。

JST 04:00 (settings.guest_reset_hour_jst) が日の分界点。
"""

from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace

import services.quota as quota


def _freeze(monkeypatch, frozen: datetime) -> None:
    monkeypatch.setattr(quota, "datetime", SimpleNamespace(now=lambda tz=None: frozen))


class TestCurrentLogicalDate:
    def test_before_reset_hour_belongs_to_previous_day(self, monkeypatch):
        _freeze(monkeypatch, datetime(2026, 6, 12, 3, 59, tzinfo=quota.JST))
        assert quota.current_logical_date() == "20260611"

    def test_at_reset_hour_belongs_to_today(self, monkeypatch):
        _freeze(monkeypatch, datetime(2026, 6, 12, 4, 0, tzinfo=quota.JST))
        assert quota.current_logical_date() == "20260612"

    def test_midnight_rolls_back_across_month(self, monkeypatch):
        _freeze(monkeypatch, datetime(2026, 6, 1, 0, 30, tzinfo=quota.JST))
        assert quota.current_logical_date() == "20260531"


class TestCurrentGuestUid:
    def test_format(self, monkeypatch):
        _freeze(monkeypatch, datetime(2026, 6, 12, 12, 0, tzinfo=quota.JST))
        uid = quota.current_guest_uid()
        assert uid == "guest_20260612"
        # Firestore は "__" で始まり "__" で終わるIDを予約している
        assert not (uid.startswith("__") and uid.endswith("__"))

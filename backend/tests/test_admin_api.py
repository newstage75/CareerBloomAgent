"""管理者APIエンドポイントのテスト (Firestoreはフェイクに差し替え)。"""

from __future__ import annotations

from datetime import datetime, timezone

import pytest

from config import settings
from routers import admin as admin_module
from tests.conftest import login_as, make_user
from tests.fakes import (
    FakeCollection,
    FakeDB,
    FakeDocument,
    FakeStreamDoc,
)


@pytest.fixture
def as_admin(app, monkeypatch):
    monkeypatch.setattr(settings, "admin_uids", "admin-uid-001")
    login_as(app, make_user(uid="admin-uid-001"))


class TestStats:
    def test_returns_summary(self, client, as_admin, monkeypatch):
        async def fake_count(ref):
            return 42

        async def fake_usage():
            return {"total": 5, "deep_research": 1}

        monkeypatch.setattr(admin_module, "_count", fake_count)
        monkeypatch.setattr(admin_module, "get_usage_snapshot", fake_usage)
        monkeypatch.setattr(admin_module, "current_logical_date", lambda: "20260612")
        monkeypatch.setattr(admin_module, "_get_db", lambda: FakeDB({}))

        res = client.get("/api/admin/stats")
        assert res.status_code == 200
        body = res.json()
        assert body["users_total"] == 42
        assert body["logical_date"] == "20260612"
        assert body["usage"] == {"total": 5, "deep_research": 1}
        assert body["quotas"] == {
            "ai_total": settings.daily_ai_quota,
            "deep_research": settings.daily_deep_research_quota,
        }


class TestUsageDaily:
    def _fake_db(self, daily_docs: dict[str, dict]) -> FakeDB:
        daily = FakeCollection(
            documents={d: FakeDocument(data) for d, data in daily_docs.items()}
        )
        return FakeDB(
            {
                "system": FakeCollection(
                    documents={"usage": FakeDocument(subcollections={"daily": daily})}
                )
            }
        )

    def test_zero_fill_and_ascending_order(self, client, as_admin, monkeypatch):
        monkeypatch.setattr(admin_module, "current_logical_date", lambda: "20260612")
        monkeypatch.setattr(
            admin_module,
            "_get_db",
            lambda: self._fake_db(
                {
                    "20260612": {"total": 10, "deep_research": 2},
                    "20260610": {"total": 3},
                }
            ),
        )

        res = client.get("/api/admin/usage/daily?days=4")
        assert res.status_code == 200
        days = res.json()["days"]
        assert [d["date"] for d in days] == [
            "20260609",
            "20260610",
            "20260611",
            "20260612",
        ]
        assert days[0] == {"date": "20260609", "total": 0, "deep_research": 0}
        assert days[1] == {"date": "20260610", "total": 3, "deep_research": 0}
        assert days[3] == {"date": "20260612", "total": 10, "deep_research": 2}

    def test_crosses_month_boundary(self, client, as_admin, monkeypatch):
        monkeypatch.setattr(admin_module, "current_logical_date", lambda: "20260601")
        monkeypatch.setattr(admin_module, "_get_db", lambda: self._fake_db({}))

        res = client.get("/api/admin/usage/daily?days=3")
        assert [d["date"] for d in res.json()["days"]] == [
            "20260530",
            "20260531",
            "20260601",
        ]

    @pytest.mark.parametrize("days", [0, -1, 61])
    def test_days_out_of_range_rejected(self, client, as_admin, days):
        res = client.get(f"/api/admin/usage/daily?days={days}")
        assert res.status_code == 422


class TestUsers:
    def test_list_with_counts(self, client, as_admin, monkeypatch):
        created = datetime(2026, 6, 1, tzinfo=timezone.utc)
        users_col = FakeCollection(
            docs=[
                FakeStreamDoc(
                    "uid-1",
                    {
                        "email": "a@example.com",
                        "display_name": "Aさん",
                        "created_at": created,
                        "updated_at": created,
                    },
                ),
                FakeStreamDoc("uid-2", {"email": "b@example.com"}),
            ]
        )

        async def fake_count(ref):
            return 7

        monkeypatch.setattr(admin_module, "_count", fake_count)
        monkeypatch.setattr(admin_module, "_get_db", lambda: FakeDB({"users": users_col}))

        res = client.get("/api/admin/users")
        assert res.status_code == 200
        body = res.json()
        assert body["limit"] == admin_module.USERS_LIMIT
        assert len(body["users"]) == 2

        first = body["users"][0]
        assert first["uid"] == "uid-1"
        assert first["email"] == "a@example.com"
        assert first["counts"] == {
            "chat_sessions": 7,
            "skills": 7,
            "roadmaps": 7,
            "sparring_notes": 7,
        }
        # フィールド欠損ユーザーでも落ちない
        assert body["users"][1]["display_name"] is None

    def test_requires_admin(self, app, client):
        login_as(app, make_user())
        assert client.get("/api/admin/users").status_code == 403
        assert client.get("/api/admin/usage/daily").status_code == 403

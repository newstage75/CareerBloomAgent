"""管理者判定 (is_admin_user) と require_admin の権限制御テスト。"""

from __future__ import annotations

from config import settings
from middleware.auth import is_admin_user
from tests.conftest import login_as, make_user


class TestIsAdminUser:
    def test_uid_match(self, monkeypatch):
        monkeypatch.setattr(settings, "admin_uids", "admin-uid-001")
        assert is_admin_user(make_user(uid="admin-uid-001")) is True

    def test_uid_no_match(self, monkeypatch):
        monkeypatch.setattr(settings, "admin_uids", "admin-uid-001")
        assert is_admin_user(make_user(uid="other-uid")) is False

    def test_email_match_case_insensitive(self, monkeypatch):
        monkeypatch.setattr(settings, "admin_emails", "Admin@Example.com")
        assert is_admin_user(make_user(email="admin@example.COM")) is True

    def test_email_none(self, monkeypatch):
        monkeypatch.setattr(settings, "admin_emails", "admin@example.com")
        assert is_admin_user(make_user(email=None)) is False

    def test_guest_never_admin_even_if_uid_listed(self, monkeypatch):
        monkeypatch.setattr(settings, "admin_uids", "guest-uid")
        assert is_admin_user(make_user(uid="guest-uid", is_guest=True)) is False

    def test_empty_allowlists(self):
        # autouse フィクスチャで両方とも空 — 誰も管理者にならない
        assert is_admin_user(make_user()) is False

    def test_csv_with_spaces_and_empty_entries(self, monkeypatch):
        monkeypatch.setattr(settings, "admin_uids", " uid-a , , uid-b ,")
        assert is_admin_user(make_user(uid="uid-a")) is True
        assert is_admin_user(make_user(uid="uid-b")) is True
        assert is_admin_user(make_user(uid="")) is False

    def test_uid_is_case_sensitive(self, monkeypatch):
        # Firebase UID は大文字小文字を区別する
        monkeypatch.setattr(settings, "admin_uids", "AbCdEf")
        assert is_admin_user(make_user(uid="abcdef")) is False


class TestRequireAdmin:
    def test_non_admin_gets_generic_403(self, app, client):
        login_as(app, make_user())
        res = client.get("/api/admin/stats")
        assert res.status_code == 403
        # 内部情報を漏らさないジェネリックなメッセージであること
        assert res.json() == {"detail": "Forbidden"}

    def test_guest_gets_403(self, app, client):
        login_as(app, make_user(uid="guest_20260612", email=None, is_guest=True))
        res = client.get("/api/admin/stats")
        assert res.status_code == 403

    def test_me_does_not_require_admin(self, app, client):
        login_as(app, make_user())
        res = client.get("/api/admin/me")
        assert res.status_code == 200
        assert res.json() == {"is_admin": False}

    def test_me_returns_true_for_admin(self, app, client, monkeypatch):
        monkeypatch.setattr(settings, "admin_uids", "admin-uid-001")
        login_as(app, make_user(uid="admin-uid-001"))
        res = client.get("/api/admin/me")
        assert res.json() == {"is_admin": True}

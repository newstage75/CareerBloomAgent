"""get_current_user の認証フローテスト (Firebase検証はモック)。"""

from __future__ import annotations

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

import middleware.auth as auth_module
from config import settings
from models.user import UserInfo


@pytest.fixture
def client() -> TestClient:
    app = FastAPI()

    @app.get("/whoami")
    async def whoami(user: UserInfo = Depends(auth_module.get_current_user)):
        return user

    return TestClient(app)


class TestGuestFallback:
    def test_no_header_with_guest_enabled(self, client, monkeypatch):
        monkeypatch.setattr(settings, "guest_enabled", True)
        res = client.get("/whoami")
        assert res.status_code == 200
        body = res.json()
        assert body["is_guest"] is True
        assert body["uid"].startswith(settings.guest_uid_prefix)

    def test_no_header_with_guest_disabled(self, client, monkeypatch):
        monkeypatch.setattr(settings, "guest_enabled", False)
        assert client.get("/whoami").status_code == 401


class TestJwtVerification:
    def test_valid_token(self, client, monkeypatch):
        async def fake_verify(token):
            assert token == "valid-token"
            return {
                "uid": "uid-123",
                "email": "user@example.com",
                "name": "テスト太郎",
                "picture": "https://example.com/p.png",
            }

        monkeypatch.setattr(auth_module, "verify_token", fake_verify)
        res = client.get("/whoami", headers={"Authorization": "Bearer valid-token"})
        assert res.status_code == 200
        body = res.json()
        assert body["uid"] == "uid-123"
        assert body["is_guest"] is False

    def test_invalid_token_returns_401(self, client, monkeypatch):
        async def fake_verify(token):
            raise ValueError("bad token")

        monkeypatch.setattr(auth_module, "verify_token", fake_verify)
        res = client.get("/whoami", headers={"Authorization": "Bearer broken"})
        assert res.status_code == 401

    def test_invalid_token_ignores_guest_mode(self, client, monkeypatch):
        """壊れたトークンはゲストにフォールバックさせず401にする。"""
        monkeypatch.setattr(settings, "guest_enabled", True)

        async def fake_verify(token):
            raise ValueError("bad token")

        monkeypatch.setattr(auth_module, "verify_token", fake_verify)
        res = client.get("/whoami", headers={"Authorization": "Bearer broken"})
        assert res.status_code == 401

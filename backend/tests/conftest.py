"""共通フィクスチャ — 実Firestore/Firebaseには一切接続しない。

テスト対象アプリは main.py を import しない(chat router が google-adk に
依存しており、ローカル venv に無いため)。代わりに必要なルーターだけを
組み込んだ FastAPI アプリを作る。
"""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from config import settings
from middleware.auth import get_current_user
from models.user import UserInfo
from routers import admin

ADMIN_UID = "admin-uid-001"
ADMIN_EMAIL = "admin@example.com"


@pytest.fixture(autouse=True)
def clean_admin_settings(monkeypatch):
    """backend/.env の値に依存しないよう、許可リストを毎テスト空にリセット。"""
    monkeypatch.setattr(settings, "admin_emails", "")
    monkeypatch.setattr(settings, "admin_uids", "")


@pytest.fixture
def app() -> FastAPI:
    app = FastAPI()
    app.include_router(admin.router, prefix="/api/admin")
    return app


@pytest.fixture
def client(app) -> TestClient:
    return TestClient(app)


def login_as(app: FastAPI, user: UserInfo) -> None:
    """get_current_user を差し替えて任意のユーザーとしてアクセスさせる。"""
    app.dependency_overrides[get_current_user] = lambda: user


def make_user(
    uid: str = "user-001",
    email: str | None = "user@example.com",
    is_guest: bool = False,
) -> UserInfo:
    return UserInfo(uid=uid, email=email, display_name="テスト", is_guest=is_guest)

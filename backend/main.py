from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers import (
    auth,
    chat,
    dashboard,
    health,
    history,
    insights,
    matching,
    public_config,
    skills,
    sparring,
)

app = FastAPI(
    title="CareerBloomAgent API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS: 明示的に origin を固定し、credentials=True と '*' の組合せを禁止する。
# 起動時に wildcard が混入していたら起動を失敗させて運用ミスを防ぐ。
_allowed_origins = [o.strip() for o in settings.allowed_origins.split(",") if o.strip()]
assert _allowed_origins, "ALLOWED_ORIGINS must not be empty"
assert "*" not in _allowed_origins, (
    "ALLOWED_ORIGINS must not contain '*' because allow_credentials=True"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    # 実際に使うHTTPメソッド/ヘッダのみに絞る（誤って攻撃面を広げないため）
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(health.router)
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(skills.router, prefix="/api/skills", tags=["skills"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(matching.router, prefix="/api/matching", tags=["matching"])
app.include_router(insights.router, prefix="/api", tags=["insights"])
app.include_router(history.router, prefix="/api", tags=["history"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(sparring.router, prefix="/api/sparring", tags=["sparring"])
app.include_router(public_config.router, prefix="/api", tags=["public"])

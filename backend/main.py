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
)

app = FastAPI(
    title="CareerBloomAgent API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.allowed_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(skills.router, prefix="/api/skills", tags=["skills"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(matching.router, prefix="/api/matching", tags=["matching"])
app.include_router(insights.router, prefix="/api", tags=["insights"])
app.include_router(history.router, prefix="/api", tags=["history"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(public_config.router, prefix="/api", tags=["public"])

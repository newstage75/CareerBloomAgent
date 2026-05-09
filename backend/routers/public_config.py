from __future__ import annotations

from fastapi import APIRouter

from config import settings
from services.quota import current_logical_date, get_usage_snapshot

router = APIRouter()


@router.get("/config")
async def get_public_config():
    """Public, unauthenticated config for the frontend.

    Returns demo-mode flags and daily usage so the UI can render the
    "guest" banner and "{used}/{limit}" gauges with copy that always
    matches the running environment.
    """
    usage = await get_usage_snapshot()
    return {
        "guest_enabled": settings.guest_enabled,
        "reset_hour_jst": settings.guest_reset_hour_jst,
        "logical_date": current_logical_date(),
        "quotas": {
            "ai_total": settings.daily_ai_quota,
            "deep_research": settings.daily_deep_research_quota,
        },
        "usage": usage,
    }

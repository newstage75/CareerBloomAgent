"""Site-wide daily AI usage quota + guest UID rotation.

The single source of truth for "what JST date is it right now" is
:func:`current_logical_date`. The cutover happens at
``settings.guest_reset_hour_jst`` (default 04:00 JST), so a request that
arrives at 03:59 still belongs to *yesterday*'s logical day.

Every AI-consuming request increments counters on
``system/usage/daily/{YYYYMMDD}``. When a counter would exceed its limit,
we raise ``HTTPException(429)`` *before* the AI call is made.

Guests share a single Firestore workspace per logical day:
``users/{settings.guest_uid_prefix}{YYYYMMDD}__``. No deletion job is
needed — yesterday's guest data simply becomes orphaned and a fresh
empty workspace is used today.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from google.cloud import firestore as firestore_module

from config import settings
from services.firestore import _get_db

JST = timezone(timedelta(hours=9))

QUOTA_EXCEEDED_MESSAGE = (
    "本日の利用枠を使い切りました。明朝{hour}時にリセットされます"
)


def current_logical_date() -> str:
    """Return ``YYYYMMDD`` for the current logical day in JST.

    A logical day starts at ``settings.guest_reset_hour_jst``. Times before
    that hour belong to the previous calendar date.
    """
    now = datetime.now(JST)
    if now.hour < settings.guest_reset_hour_jst:
        now -= timedelta(days=1)
    return now.strftime("%Y%m%d")


def current_guest_uid() -> str:
    """Deterministic guest UID for the current logical day.

    The result must NOT start or end with ``__`` because Firestore reserves
    those document IDs.
    """
    return f"{settings.guest_uid_prefix}{current_logical_date()}"


def _quota_message() -> str:
    return QUOTA_EXCEEDED_MESSAGE.format(hour=settings.guest_reset_hour_jst)


def _usage_doc():
    db = _get_db()
    return (
        db.collection("system")
        .document("usage")
        .collection("daily")
        .document(current_logical_date())
    )


async def _consume_quotas(checks: list[tuple[str, int]]) -> dict[str, int]:
    """Consume one unit from each named counter, atomically check all limits.

    The check-then-write pattern is racy under burst contention but is fine
    for hackathon-scale traffic. Returns a dict of new counter values.
    """
    doc_ref = _usage_doc()
    snap = await doc_ref.get()
    current = snap.to_dict() if snap.exists else {}

    for field, limit in checks:
        if int(current.get(field, 0)) >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=_quota_message(),
            )

    update: dict = {"updated_at": datetime.now(timezone.utc)}
    new_counts: dict[str, int] = {}
    for field, _ in checks:
        update[field] = firestore_module.Increment(1)
        new_counts[field] = int(current.get(field, 0)) + 1
    await doc_ref.set(update, merge=True)
    return new_counts


async def consume_chat_quota() -> None:
    """FastAPI dependency for non-job AI calls (chat, insights, matching agent)."""
    await _consume_quotas([("total", settings.daily_ai_quota)])


async def consume_deep_research_quota() -> None:
    """FastAPI dependency for Web-search-grounded heavy AI calls.

    Counts against both ``total`` and ``deep_research`` so the heavier
    operations still eat into the global daily budget.
    """
    await _consume_quotas(
        [
            ("total", settings.daily_ai_quota),
            ("deep_research", settings.daily_deep_research_quota),
        ]
    )


async def get_usage_snapshot() -> dict[str, int]:
    """Return today's counters (zero-defaulted) for telemetry/UI."""
    snap = await _usage_doc().get()
    data = snap.to_dict() if snap.exists else {}
    return {
        "total": int(data.get("total", 0)),
        "deep_research": int(data.get("deep_research", 0)),
    }

"""Admin-only endpoints — site-wide stats, user list, daily usage history.

Access is gated by ``require_admin`` (ADMIN_EMAILS allowlist). All endpoints
are read-only.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from google.cloud import firestore as firestore_module

from config import settings
from middleware.auth import get_current_user, is_admin_user, require_admin
from models.user import UserInfo
from services.firestore import _get_db
from services.quota import current_logical_date, get_usage_snapshot

router = APIRouter()

# ユーザー一覧の上限。ユーザーごとに count 集計クエリを発行するため、
# 無制限にすると一覧APIが重くなる。
USERS_LIMIT = 50

COUNTED_SUBCOLLECTIONS = ("chat_sessions", "skills", "roadmaps", "sparring_notes")


async def _count(ref) -> int:
    result = await ref.count(alias="c").get()
    return int(result[0][0].value)


@router.get("/me")
async def admin_me(user: UserInfo = Depends(get_current_user)):
    """現在のユーザーが管理者かどうか（Sidebarのリンク表示制御用）。"""
    return {"is_admin": is_admin_user(user)}


@router.get("/stats")
async def admin_stats(_: UserInfo = Depends(require_admin)):
    """サイト全体の統計サマリー。"""
    db = _get_db()
    users_total, usage = await asyncio.gather(
        _count(db.collection("users")),
        get_usage_snapshot(),
    )
    return {
        "users_total": users_total,
        "logical_date": current_logical_date(),
        "guest_enabled": settings.guest_enabled,
        "quotas": {
            "ai_total": settings.daily_ai_quota,
            "deep_research": settings.daily_deep_research_quota,
        },
        "usage": usage,
    }


@router.get("/users")
async def admin_users(_: UserInfo = Depends(require_admin)):
    """登録ユーザー一覧（新しい順、上限あり）+ サブコレクション件数。

    ゲストワークスペース (users/{guest_uid}) は親ドキュメントを持たないため
    このクエリには現れない。
    """
    db = _get_db()
    query = (
        db.collection("users")
        .order_by("created_at", direction=firestore_module.Query.DESCENDING)
        .limit(USERS_LIMIT)
    )
    users: list[dict] = []
    async for doc in query.stream():
        data = doc.to_dict()
        users.append(
            {
                "uid": doc.id,
                "email": data.get("email"),
                "display_name": data.get("display_name"),
                "photo_url": data.get("photo_url"),
                "created_at": data.get("created_at"),
                "updated_at": data.get("updated_at"),
            }
        )

    async def _with_counts(user: dict) -> dict:
        user_ref = db.collection("users").document(user["uid"])
        counts = await asyncio.gather(
            *[_count(user_ref.collection(name)) for name in COUNTED_SUBCOLLECTIONS]
        )
        return {**user, "counts": dict(zip(COUNTED_SUBCOLLECTIONS, counts))}

    enriched = await asyncio.gather(*[_with_counts(u) for u in users])
    return {"users": list(enriched), "limit": USERS_LIMIT}


@router.get("/usage/daily")
async def admin_usage_daily(
    days: int = Query(default=14, ge=1, le=60),
    _: UserInfo = Depends(require_admin),
):
    """過去N論理日分のクォータ消費推移（古い→新しい順、欠損日は0埋め）。"""
    db = _get_db()
    base = datetime.strptime(current_logical_date(), "%Y%m%d")
    dates = [(base - timedelta(days=i)).strftime("%Y%m%d") for i in range(days - 1, -1, -1)]

    daily_col = db.collection("system").document("usage").collection("daily")
    snaps = await asyncio.gather(*[daily_col.document(d).get() for d in dates])

    entries = []
    for date_str, snap in zip(dates, snaps):
        data = snap.to_dict() if snap.exists else {}
        entries.append(
            {
                "date": date_str,
                "total": int(data.get("total", 0)),
                "deep_research": int(data.get("deep_research", 0)),
            }
        )
    return {"days": entries}

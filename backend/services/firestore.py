from __future__ import annotations

from datetime import datetime, timezone

from google.cloud.firestore_v1 import AsyncClient
from google.cloud import firestore as firestore_module

from config import settings

_db: AsyncClient | None = None


def _get_db() -> AsyncClient:
    global _db
    if _db is None:
        _db = AsyncClient(
            project=settings.gcp_project_id,
            database=settings.firestore_database,
        )
    return _db

# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------


async def get_or_create_user(
    uid: str,
    email: str | None,
    display_name: str | None,
    photo_url: str | None,
) -> dict:
    db = _get_db()
    doc_ref = db.collection("users").document(uid)
    doc = await doc_ref.get()
    now = datetime.now(timezone.utc)

    if doc.exists:
        await doc_ref.update(
            {
                "email": email,
                "display_name": display_name,
                "photo_url": photo_url,
                "updated_at": now,
            }
        )
        data = doc.to_dict()
        data["uid"] = uid
        return data

    user_data = {
        "email": email,
        "display_name": display_name,
        "photo_url": photo_url,
        "created_at": now,
        "updated_at": now,
    }
    await doc_ref.set(user_data)
    return {**user_data, "uid": uid}


# ---------------------------------------------------------------------------
# Skills
# ---------------------------------------------------------------------------


async def get_skills(uid: str) -> list[dict]:
    db = _get_db()
    ref = db.collection("users").document(uid).collection("skills")
    skills: list[dict] = []
    async for doc in ref.stream():
        skill = doc.to_dict()
        skill["id"] = doc.id
        skills.append(skill)
    return skills


async def add_skill(
    uid: str,
    name: str,
    level: str,
    embedding: list[float] | None = None,
) -> dict:
    now = datetime.now(timezone.utc)
    skill_data: dict = {
        "name": name,
        "level": level,
        "created_at": now,
    }
    if embedding is not None:
        skill_data["embedding"] = embedding

    db = _get_db()
    doc_ref = db.collection("users").document(uid).collection("skills").document()
    await doc_ref.set(skill_data)
    return {"id": doc_ref.id, **skill_data}


async def delete_skill(uid: str, skill_id: str) -> bool:
    db = _get_db()
    doc_ref = (
        db.collection("users").document(uid).collection("skills").document(skill_id)
    )
    doc = await doc_ref.get()
    if not doc.exists:
        return False
    await doc_ref.delete()
    return True


# ---------------------------------------------------------------------------
# Chat sessions
# ---------------------------------------------------------------------------


async def get_chat_sessions(uid: str, mode: str | None = None) -> list[dict]:
    db = _get_db()
    ref = db.collection("users").document(uid).collection("chat_sessions")
    if mode:
        query = ref.where("mode", "==", mode).order_by(
            "updated_at", direction=firestore_module.Query.DESCENDING
        ).limit(20)
    else:
        query = ref.order_by(
            "updated_at", direction=firestore_module.Query.DESCENDING
        ).limit(20)
    sessions: list[dict] = []
    async for doc in query.stream():
        session = doc.to_dict()
        session["id"] = doc.id
        sessions.append(session)
    return sessions


async def get_or_create_chat_session(
    uid: str, session_id: str | None = None, mode: str | None = None
) -> tuple[str, list[dict]]:
    """Return ``(session_id, messages)``."""
    db = _get_db()
    if session_id:
        doc_ref = (
            db.collection("users")
            .document(uid)
            .collection("chat_sessions")
            .document(session_id)
        )
        doc = await doc_ref.get()
        if doc.exists:
            data = doc.to_dict()
            return session_id, data.get("messages", [])

    now = datetime.now(timezone.utc)
    doc_ref = (
        db.collection("users").document(uid).collection("chat_sessions").document()
    )
    session_data: dict = {"messages": [], "created_at": now, "updated_at": now}
    if mode:
        session_data["mode"] = mode
    await doc_ref.set(session_data)
    return doc_ref.id, []


async def append_chat_messages(
    uid: str, session_id: str, messages: list[dict]
) -> None:
    db = _get_db()
    doc_ref = (
        db.collection("users")
        .document(uid)
        .collection("chat_sessions")
        .document(session_id)
    )
    now = datetime.now(timezone.utc)
    await doc_ref.update(
        {
            "messages": firestore_module.ArrayUnion(messages),
            "updated_at": now,
        }
    )


async def delete_chat_session(uid: str, session_id: str) -> bool:
    db = _get_db()
    doc_ref = (
        db.collection("users")
        .document(uid)
        .collection("chat_sessions")
        .document(session_id)
    )
    doc = await doc_ref.get()
    if not doc.exists:
        return False
    await doc_ref.delete()
    return True


# ---------------------------------------------------------------------------
# Matches
# ---------------------------------------------------------------------------


async def get_matches(uid: str) -> list[dict]:
    db = _get_db()
    ref = db.collection("users").document(uid).collection("matches")
    query = ref.order_by("score", direction=firestore_module.Query.DESCENDING).limit(20)
    matches: list[dict] = []
    async for doc in query.stream():
        m = doc.to_dict()
        m["id"] = doc.id
        matches.append(m)
    return matches


async def save_matches(uid: str, matches: list[dict], contexts: list[str] | None = None) -> None:
    """Replace latest matches AND append to search history."""
    db = _get_db()
    now = datetime.now(timezone.utc)
    ref = db.collection("users").document(uid).collection("matches")

    # Delete existing latest matches
    async for doc in ref.stream():
        await doc.reference.delete()

    # Write new latest
    for match in matches:
        await ref.document().set(match)

    # Append to search history (accumulative)
    history_ref = db.collection("users").document(uid).collection("search_history")
    await history_ref.document().set({
        "contexts": contexts or [],
        "results": matches,
        "results_count": len(matches),
        "searched_at": now,
    })


async def get_search_history(uid: str, limit: int = 20) -> list[dict]:
    """Get past search history entries (newest first)."""
    db = _get_db()
    ref = db.collection("users").document(uid).collection("search_history")
    query = ref.order_by("searched_at", direction=firestore_module.Query.DESCENDING).limit(limit)
    entries: list[dict] = []
    async for doc in query.stream():
        entry = doc.to_dict()
        entry["id"] = doc.id
        entries.append(entry)
    return entries


# ---------------------------------------------------------------------------
# Insights
# ---------------------------------------------------------------------------


async def get_insights(uid: str) -> dict | None:
    db = _get_db()
    doc = await db.collection("users").document(uid).collection("insights").document("latest").get()
    return doc.to_dict() if doc.exists else None


async def get_insights_history(uid: str, limit: int = 20) -> list[dict]:
    """Get historical insight snapshots (newest first)."""
    db = _get_db()
    ref = db.collection("users").document(uid).collection("insights_history")
    query = ref.order_by("generated_at", direction=firestore_module.Query.DESCENDING).limit(limit)
    entries: list[dict] = []
    async for doc in query.stream():
        entry = doc.to_dict()
        entry["id"] = doc.id
        entries.append(entry)
    return entries


async def save_insights(uid: str, insights: dict) -> None:
    """Save insights to latest AND append to history."""
    db = _get_db()
    # Overwrite latest
    await db.collection("users").document(uid).collection("insights").document("latest").set(insights)
    # Append to history (accumulative)
    history_ref = db.collection("users").document(uid).collection("insights_history")
    await history_ref.document().set(insights)


# ---------------------------------------------------------------------------
# Bucket List / Never List
# ---------------------------------------------------------------------------


async def get_list_items(uid: str, list_name: str) -> list[dict]:
    """Get all items from bucket_list or never_list."""
    db = _get_db()
    ref = db.collection("users").document(uid).collection(list_name)
    items: list[dict] = []
    async for doc in ref.stream():
        item = doc.to_dict()
        item["id"] = doc.id
        items.append(item)
    return items


async def set_list_items(uid: str, list_name: str, items: list[dict]) -> list[dict]:
    """Replace all items in bucket_list or never_list."""
    db = _get_db()
    ref = db.collection("users").document(uid).collection(list_name)

    # Delete existing
    async for doc in ref.stream():
        await doc.reference.delete()

    # Write new
    result: list[dict] = []
    for item in items:
        doc_ref = ref.document(item["id"])
        data = {"text": item["text"], "created_at": datetime.now(timezone.utc)}
        await doc_ref.set(data)
        result.append({"id": item["id"], "text": item["text"]})
    return result


async def add_list_item(uid: str, list_name: str, text: str) -> dict:
    """Add one item to bucket_list or never_list."""
    db = _get_db()
    ref = db.collection("users").document(uid).collection(list_name)
    doc_ref = ref.document()
    data = {"text": text, "created_at": datetime.now(timezone.utc)}
    await doc_ref.set(data)
    return {"id": doc_ref.id, "text": text}


async def delete_list_item(uid: str, list_name: str, item_id: str) -> bool:
    """Delete one item from bucket_list or never_list."""
    db = _get_db()
    doc_ref = (
        db.collection("users").document(uid).collection(list_name).document(item_id)
    )
    doc = await doc_ref.get()
    if not doc.exists:
        return False
    await doc_ref.delete()
    return True


# ---------------------------------------------------------------------------
# Value History
# ---------------------------------------------------------------------------


async def get_value_history(
    uid: str, limit: int = 20, offset: int = 0
) -> tuple[list[dict], int]:
    """Return (entries, total_count) for value_history."""
    db = _get_db()
    ref = db.collection("users").document(uid).collection("value_history")

    # Get total count
    total = 0
    async for _ in ref.stream():
        total += 1

    # Get paginated entries
    query = ref.order_by("date", direction=firestore_module.Query.DESCENDING)
    if offset > 0:
        query = query.offset(offset)
    query = query.limit(limit)

    entries: list[dict] = []
    async for doc in query.stream():
        entry = doc.to_dict()
        entry["id"] = doc.id
        entries.append(entry)
    return entries, total


async def add_value_history_entry(uid: str, entry: dict) -> str:
    """Add a value_history entry (called by insight_engine)."""
    db = _get_db()
    ref = db.collection("users").document(uid).collection("value_history")
    doc_ref = ref.document()
    entry["date"] = datetime.now(timezone.utc)
    await doc_ref.set(entry)
    return doc_ref.id


# ---------------------------------------------------------------------------
# Jobs
# ---------------------------------------------------------------------------


async def get_jobs() -> list[dict]:
    db = _get_db()
    jobs: list[dict] = []
    async for doc in db.collection("jobs").stream():
        job = doc.to_dict()
        job["id"] = doc.id
        jobs.append(job)
    return jobs

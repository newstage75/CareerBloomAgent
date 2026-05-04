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


async def get_chat_sessions(uid: str) -> list[dict]:
    db = _get_db()
    ref = db.collection("users").document(uid).collection("chat_sessions")
    query = ref.order_by("updated_at", direction=firestore_module.Query.DESCENDING).limit(20)
    sessions: list[dict] = []
    async for doc in query.stream():
        session = doc.to_dict()
        session["id"] = doc.id
        sessions.append(session)
    return sessions


async def get_or_create_chat_session(
    uid: str, session_id: str | None = None
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
    await doc_ref.set({"messages": [], "created_at": now, "updated_at": now})
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


async def save_matches(uid: str, matches: list[dict]) -> None:
    """Replace all match documents for a user."""
    db = _get_db()
    ref = db.collection("users").document(uid).collection("matches")

    # Delete existing matches
    async for doc in ref.stream():
        await doc.reference.delete()

    # Write new ones
    for match in matches:
        await ref.document().set(match)


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

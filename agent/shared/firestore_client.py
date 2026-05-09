"""Shared Firestore client for ADK agents.

Provides synchronous Firestore access since ADK tool functions are sync by default.
"""

from __future__ import annotations

from datetime import datetime, timezone

from google.cloud.firestore_v1 import Client

from agent.config import GCP_PROJECT_ID, FIRESTORE_DATABASE

_db: Client | None = None


def _get_db() -> Client:
    global _db
    if _db is None:
        _db = Client(project=GCP_PROJECT_ID, database=FIRESTORE_DATABASE)
    return _db


# ---------------------------------------------------------------------------
# Chat sessions
# ---------------------------------------------------------------------------


def get_chat_sessions(user_id: str, limit: int = 10) -> list[dict]:
    """Get recent chat sessions for a user."""
    db = _get_db()
    ref = (
        db.collection("users")
        .document(user_id)
        .collection("chat_sessions")
    )
    query = ref.order_by("updated_at", direction="DESCENDING").limit(limit)
    sessions: list[dict] = []
    for doc in query.stream():
        session = doc.to_dict()
        session["id"] = doc.id
        sessions.append(session)
    return sessions


# ---------------------------------------------------------------------------
# Insights
# ---------------------------------------------------------------------------


def get_insights(user_id: str) -> dict | None:
    """Get latest insights for a user."""
    db = _get_db()
    doc = (
        db.collection("users")
        .document(user_id)
        .collection("insights")
        .document("latest")
        .get()
    )
    return doc.to_dict() if doc.exists else None


def save_insights(user_id: str, insights: dict) -> None:
    """Save insights to latest AND append to history."""
    db = _get_db()
    user_ref = db.collection("users").document(user_id)
    user_ref.collection("insights").document("latest").set(insights)
    user_ref.collection("insights_history").document().set(insights)


# ---------------------------------------------------------------------------
# Value History
# ---------------------------------------------------------------------------


def add_value_history_entry(user_id: str, entry: dict) -> str:
    """Add a value history entry."""
    db = _get_db()
    ref = (
        db.collection("users")
        .document(user_id)
        .collection("value_history")
    )
    doc_ref = ref.document()
    entry["date"] = datetime.now(timezone.utc)
    doc_ref.set(entry)
    return doc_ref.id


# ---------------------------------------------------------------------------
# Skills
# ---------------------------------------------------------------------------


def get_skills(user_id: str) -> list[dict]:
    """Get all skills for a user."""
    db = _get_db()
    ref = db.collection("users").document(user_id).collection("skills")
    skills: list[dict] = []
    for doc in ref.stream():
        skill = doc.to_dict()
        skill["id"] = doc.id
        skills.append(skill)
    return skills


# ---------------------------------------------------------------------------
# Roadmaps (深掘りエージェント)
# ---------------------------------------------------------------------------


def save_roadmap(user_id: str, goal_id: str, roadmap: dict) -> None:
    """Persist a generated roadmap under users/{uid}/roadmaps/{goal_id}."""
    db = _get_db()
    roadmap = {**roadmap}
    roadmap.setdefault("generated_at", datetime.now(timezone.utc))
    db.collection("users").document(user_id).collection("roadmaps").document(
        goal_id
    ).set(roadmap)

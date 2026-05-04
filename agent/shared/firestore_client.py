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
    """Save insights to Firestore."""
    db = _get_db()
    (
        db.collection("users")
        .document(user_id)
        .collection("insights")
        .document("latest")
        .set(insights)
    )


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
# Jobs
# ---------------------------------------------------------------------------


def get_jobs() -> list[dict]:
    """Get all jobs from the global jobs collection."""
    db = _get_db()
    jobs: list[dict] = []
    for doc in db.collection("jobs").stream():
        job = doc.to_dict()
        job["id"] = doc.id
        jobs.append(job)
    return jobs


def store_jobs(jobs: list[dict]) -> dict:
    """Store jobs with deduplication by source_url. Returns summary."""
    db = _get_db()
    ref = db.collection("jobs")

    # Get existing source_urls
    existing_urls: set[str] = set()
    for doc in ref.stream():
        data = doc.to_dict()
        if url := data.get("source_url"):
            existing_urls.add(url)

    new_count = 0
    for job in jobs:
        if job.get("source_url") in existing_urls:
            continue
        job["collected_at"] = datetime.now(timezone.utc)
        ref.document().set(job)
        new_count += 1

    return {
        "total": len(jobs),
        "new": new_count,
        "duplicates": len(jobs) - new_count,
    }


# ---------------------------------------------------------------------------
# Matches
# ---------------------------------------------------------------------------


def save_matches(user_id: str, matches: list[dict]) -> None:
    """Replace all match documents for a user."""
    db = _get_db()
    ref = db.collection("users").document(user_id).collection("matches")

    # Delete existing
    for doc in ref.stream():
        doc.reference.delete()

    # Write new
    for match in matches:
        ref.document().set(match)

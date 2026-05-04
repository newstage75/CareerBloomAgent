from __future__ import annotations

import asyncio

import firebase_admin
from firebase_admin import auth, credentials

_initialized = False


def _ensure_initialized() -> None:
    global _initialized
    if _initialized:
        return
    if not firebase_admin._apps:
        firebase_admin.initialize_app()
    _initialized = True


async def verify_token(id_token: str) -> dict:
    """Verify a Firebase ID token and return the decoded claims.

    Runs the synchronous ``auth.verify_id_token`` call in a thread so
    the event loop is not blocked.
    """
    _ensure_initialized()
    decoded = await asyncio.to_thread(auth.verify_id_token, id_token)
    return decoded

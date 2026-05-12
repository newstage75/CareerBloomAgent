"""知識の壁打ちノート API.

ユーザーが「いいね」した AI 応答群を Gemini で構造化ノートに編纂し、
``users/{uid}/sparring_notes/{note_id}`` に保存する。
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from middleware.auth import get_current_user
from middleware.path_validation import safe_path_id
from models.user import UserInfo
from services import firestore

router = APIRouter()


# ノート生成は「知識として残す」(💡) ボタン押下時に
# `PATCH /api/chat/sessions/{sid}/messages/{idx}/like` 経由で
# 自動実行されます（routers/chat.py を参照）。
# 一括バッチ生成エンドポイントは廃止しました。


@router.get("/notes")
async def list_notes(user: UserInfo = Depends(get_current_user)):
    return await firestore.get_sparring_notes(user.uid)


@router.get("/notes/{note_id}")
async def get_note(
    note_id: str = safe_path_id(),
    user: UserInfo = Depends(get_current_user),
):
    note = await firestore.get_sparring_note(user.uid, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@router.delete("/notes/{note_id}", status_code=204)
async def delete_note(
    note_id: str = safe_path_id(),
    user: UserInfo = Depends(get_current_user),
):
    deleted = await firestore.delete_sparring_note(user.uid, note_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Note not found")
    return None

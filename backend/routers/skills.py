from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException

from middleware.auth import get_current_user
from models.skill import SkillCreate, SkillResponse
from models.user import UserInfo
from services import firestore, vertex_ai

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("", response_model=list[SkillResponse])
async def get_skills(user: UserInfo = Depends(get_current_user)):
    skills = await firestore.get_skills(user.uid)
    return [
        SkillResponse(
            id=s["id"],
            name=s["name"],
            level=s["level"],
            created_at=s["created_at"],
        )
        for s in skills
    ]


@router.post("", response_model=SkillResponse, status_code=201)
async def add_skill(body: SkillCreate, user: UserInfo = Depends(get_current_user)):
    # Generate embedding (best-effort — skip on failure)
    embedding: list[float] | None = None
    try:
        embedding = await vertex_ai.get_embedding(f"{body.name} ({body.level})")
    except Exception:
        logger.warning("Embedding generation failed for skill %s", body.name)

    result = await firestore.add_skill(user.uid, body.name, body.level, embedding)
    return SkillResponse(
        id=result["id"],
        name=result["name"],
        level=result["level"],
        created_at=result["created_at"],
    )


@router.delete("/{skill_id}", status_code=204)
async def delete_skill(skill_id: str, user: UserInfo = Depends(get_current_user)):
    deleted = await firestore.delete_skill(user.uid, skill_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Skill not found")

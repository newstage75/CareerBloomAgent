from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel

SkillLevel = Literal["none", "beginner", "intermediate", "advanced"]


class SkillCreate(BaseModel):
    name: str
    level: SkillLevel


class SkillResponse(BaseModel):
    id: str
    name: str
    level: SkillLevel
    created_at: datetime

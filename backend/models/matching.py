from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class MatchResult(BaseModel):
    id: str
    company: str
    position: str
    score: float
    tags: list[str] = []
    gap_skills: list[str] = []
    calculated_at: datetime

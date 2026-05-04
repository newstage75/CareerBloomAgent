from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class ValueAlignment(BaseModel):
    summary: str
    score: float


class MatchResult(BaseModel):
    id: str
    company: str
    position: str
    score: float
    tags: list[str] = []
    gap_skills: list[str] = []
    value_alignment: ValueAlignment | None = None
    calculated_at: datetime

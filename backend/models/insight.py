from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class ValueItem(BaseModel):
    label: str
    description: str
    confidence: Literal["high", "medium", "low"]


class VisionSummary(BaseModel):
    short_term: str
    mid_term: str
    long_term: str


class ListItem(BaseModel):
    id: str
    text: str


class UserInsights(BaseModel):
    values: list[ValueItem]
    vision: VisionSummary
    strengths: list[str]
    themes: list[str]
    bucket_list: list[ListItem]
    never_list: list[ListItem]
    generated_at: datetime | None = None


class ListItemCreate(BaseModel):
    text: str


class ListItemsUpdate(BaseModel):
    items: list[ListItem]


class ValueChangeEntry(BaseModel):
    id: str
    date: datetime
    category: Literal["discovered", "strengthened", "shifted", "vision_updated"]
    title: str
    description: str
    source: Literal["discover", "vision"] | None = None


class ValueHistoryResponse(BaseModel):
    entries: list[ValueChangeEntry]
    total: int
    limit: int
    offset: int

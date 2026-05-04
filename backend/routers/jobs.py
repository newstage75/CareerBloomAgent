from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from middleware.auth import get_current_user
from models.user import UserInfo
from services.firestore import get_jobs
from services import agent_service

router = APIRouter()


class CollectRequest(BaseModel):
    keywords: list[str] | None = None


@router.get("/jobs")
async def list_jobs(user: UserInfo = Depends(get_current_user)):
    jobs = await get_jobs()
    return jobs


@router.post("/jobs/collect")
async def collect_jobs(body: CollectRequest, user: UserInfo = Depends(get_current_user)):
    """Trigger job collection using ADK agent."""
    result = await agent_service.run_job_collection(body.keywords)
    return {"status": "completed", "result": result}

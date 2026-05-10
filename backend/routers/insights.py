from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from middleware.auth import get_current_user
from models.user import UserInfo
from services import vertex_ai
from services.firestore import (
    add_value_history_entry,
    get_insights,
    get_insights_history,
    save_insights,
)
from services.insight_engine import generate_insights
from services.quota import consume_chat_quota


class DeleteValueRequest(BaseModel):
    label: str


class StarValueRequest(BaseModel):
    label: str
    starred: bool


class StarListItemRequest(BaseModel):
    list_name: str  # "bucket_list" | "never_list"
    item_id: str
    starred: bool


class EditVisionRequest(BaseModel):
    instruction: str

router = APIRouter()


@router.get("/insights")
async def get_user_insights(user: UserInfo = Depends(get_current_user)):
    insights = await get_insights(user.uid)
    if not insights:
        return {"status": "empty", "message": "インサイトがまだ生成されていません"}
    return insights


@router.get("/insights/history")
async def get_user_insights_history(
    limit: int = 20,
    user: UserInfo = Depends(get_current_user),
):
    """Get historical insight snapshots."""
    entries = await get_insights_history(user.uid, limit=limit)
    return {"entries": entries}


@router.post("/insights/generate", dependencies=[Depends(consume_chat_quota)])
async def generate_user_insights(user: UserInfo = Depends(get_current_user)):
    try:
        insights = await generate_insights(user.uid)
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return insights


@router.post("/insights/values/delete")
async def delete_value(
    body: DeleteValueRequest,
    user: UserInfo = Depends(get_current_user),
):
    """ユーザーが明示的に価値観を削除する。削除履歴をvalue_historyに記録。"""
    insights = await get_insights(user.uid)
    if not insights:
        raise HTTPException(status_code=404, detail="インサイトがありません")

    values = insights.get("values", [])
    target = next((v for v in values if v["label"] == body.label), None)
    if not target:
        raise HTTPException(status_code=404, detail="該当する価値観が見つかりません")

    # Remove from values
    insights["values"] = [v for v in values if v["label"] != body.label]
    await save_insights(user.uid, insights)

    # Record deletion in value_history
    await add_value_history_entry(user.uid, {
        "category": "removed",
        "title": f"「{body.label}」を削除",
        "description": target.get("description", ""),
        "source": "discover",
    })

    return insights


@router.post(
    "/insights/vision/edit",
    dependencies=[Depends(consume_chat_quota)],
)
async def edit_vision(
    body: EditVisionRequest,
    user: UserInfo = Depends(get_current_user),
):
    """ユーザーの自然言語指示でビジョン（短期/中期/長期）を書き換える。"""
    instruction = body.instruction.strip()
    if not instruction:
        raise HTTPException(status_code=400, detail="instruction が空です")

    insights = await get_insights(user.uid)
    if not insights:
        raise HTTPException(
            status_code=404,
            detail="先に「価値観発見」「やりたいこと・目標」で対話してインサイトを作成してください",
        )

    current_vision = insights.get("vision") or {}
    new_vision = await vertex_ai.edit_vision_with_instruction(
        current_vision, instruction
    )
    insights["vision"] = new_vision
    await save_insights(user.uid, insights)

    await add_value_history_entry(
        user.uid,
        {
            "category": "vision_updated",
            "title": "ビジョンを編集",
            "description": instruction[:200],
            "source": "vision",
        },
    )

    return insights


@router.post("/insights/values/star")
async def star_value(
    body: StarValueRequest,
    user: UserInfo = Depends(get_current_user),
):
    """価値観にスターを付ける/外す。スター付きは常に表示される。"""
    insights = await get_insights(user.uid)
    if not insights:
        raise HTTPException(status_code=404, detail="インサイトがありません")

    values = insights.get("values", [])
    target = next((v for v in values if v["label"] == body.label), None)
    if not target:
        raise HTTPException(status_code=404, detail="該当する価値観が見つかりません")

    target["starred"] = body.starred
    await save_insights(user.uid, insights)

    return insights


@router.post("/insights/list/star")
async def star_list_item(
    body: StarListItemRequest,
    user: UserInfo = Depends(get_current_user),
):
    """bucket_list / never_list のアイテムにスターを付ける/外す。"""
    if body.list_name not in ("bucket_list", "never_list"):
        raise HTTPException(status_code=400, detail="無効なリスト名です")

    insights = await get_insights(user.uid)
    if not insights:
        raise HTTPException(status_code=404, detail="インサイトがありません")

    items = insights.get(body.list_name, [])
    target = next((item for item in items if item["id"] == body.item_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="該当するアイテムが見つかりません")

    target["starred"] = body.starred
    await save_insights(user.uid, insights)

    return insights

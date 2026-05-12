"""Backend integration for ADK agents.

Provides async wrappers to invoke ADK agents from FastAPI endpoints.
"""

from __future__ import annotations

import asyncio
import logging
from typing import AsyncGenerator

from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

logger = logging.getLogger(__name__)

APP_NAME = "career_bloom"

_session_service = InMemorySessionService()

# Lazy-loaded runners
_insight_runner: Runner | None = None
_roadmap_runner: Runner | None = None


def _get_insight_runner() -> Runner:
    global _insight_runner
    if _insight_runner is None:
        from agent.insight_extractor.agent import insight_extractor_agent
        _insight_runner = Runner(
            agent=insight_extractor_agent,
            app_name=APP_NAME,
            session_service=_session_service,
        )
    return _insight_runner


def _get_roadmap_runner() -> Runner:
    global _roadmap_runner
    if _roadmap_runner is None:
        from agent.roadmap_advisor.agent import roadmap_advisor_agent
        _roadmap_runner = Runner(
            agent=roadmap_advisor_agent,
            app_name=APP_NAME,
            session_service=_session_service,
        )
    return _roadmap_runner


async def _run_agent(
    runner: Runner,
    user_id: str,
    message: str,
    state: dict | None = None,
) -> str | None:
    """Run an ADK agent and return the final text response.

    `state` is written into the session and exposed to tools via
    `tool_context.state` — this is how we securely pass the authenticated uid
    without letting the LLM forge it through tool arguments.
    """
    session = await _session_service.create_session(
        app_name=APP_NAME,
        user_id=user_id,
        state=state or {},
    )

    content = types.Content(
        role="user",
        parts=[types.Part(text=message)],
    )

    final_response: str | None = None
    async for event in runner.run_async(
        user_id=user_id,
        session_id=session.id,
        new_message=content,
    ):
        if event.is_final_response() and event.content and event.content.parts:
            final_response = event.content.parts[0].text

    return final_response


async def stream_agent_events(
    runner: Runner,
    user_id: str,
    message: str,
    state: dict | None = None,
) -> AsyncGenerator[dict, None]:
    """Run an ADK agent and yield progress events.

    Yields dicts with shape `{"type": "tool_call"|"tool_response"|"final"|"error", ...}`.
    Callers translate these into SSE frames.
    """
    session = await _session_service.create_session(
        app_name=APP_NAME,
        user_id=user_id,
        state=state or {},
    )

    content = types.Content(
        role="user",
        parts=[types.Part(text=message)],
    )

    try:
        async for event in runner.run_async(
            user_id=user_id,
            session_id=session.id,
            new_message=content,
        ):
            for call in event.get_function_calls() or []:
                yield {
                    "type": "tool_call",
                    "name": call.name,
                    "args": dict(call.args) if call.args else {},
                }
            for resp in event.get_function_responses() or []:
                raw = resp.response if isinstance(resp.response, str) else str(resp.response)
                summary = raw[:200] + ("…" if len(raw) > 200 else "")
                yield {
                    "type": "tool_response",
                    "name": resp.name,
                    "summary": summary,
                }

            grounding = getattr(event, "grounding_metadata", None)
            if grounding:
                chunks = getattr(grounding, "grounding_chunks", None) or []
                sources: list[dict] = []
                for chunk in chunks:
                    web = getattr(chunk, "web", None)
                    if web is not None:
                        title = getattr(web, "title", "") or ""
                        uri = getattr(web, "uri", "") or ""
                        if uri:
                            sources.append({"title": title, "uri": uri})
                if sources:
                    yield {"type": "search_sources", "sources": sources}

            if (
                event.content
                and event.content.parts
                and event.content.parts[0].text
                and not (event.get_function_calls() or event.get_function_responses())
            ):
                text = event.content.parts[0].text
                if event.is_final_response():
                    yield {"type": "final", "text": text}
    except Exception:
        logger.exception("Agent streaming failed")
        yield {"type": "error", "message": "エージェント実行中にエラーが発生しました"}


async def run_insight_extraction(uid: str, session_id: str) -> None:
    """Fire-and-forget: チャット完了後に呼ばれる。30秒タイムアウト。"""
    try:
        runner = _get_insight_runner()
        await asyncio.wait_for(
            _run_agent(
                runner,
                user_id=uid,
                message="現在のユーザーの最新セッションからインサイトを抽出してください。",
                state={"uid": uid, "session_id": session_id},
            ),
            timeout=30.0,
        )
        logger.info("Insight extraction completed for user %s", uid)
    except asyncio.TimeoutError:
        logger.warning("Insight extraction timed out for user %s", uid)
    except Exception as e:
        logger.warning("Insight extraction failed for user %s: %s", uid, e)


def stream_roadmap_generation(
    uid: str, goal_text: str, goal_id: str
) -> AsyncGenerator[dict, None]:
    """Stream the roadmap_advisor agent. Yields progress events."""
    runner = _get_roadmap_runner()
    return stream_agent_events(
        runner,
        user_id=uid,
        message=(
            f"以下の目標について、ロードマップ・必要なスキル・鍛えること・"
            f"学習用YouTube動画候補を構造化して提案してください。\n\n"
            f"目標: {goal_text}"
        ),
        state={"uid": uid, "goal_id": goal_id, "goal_text": goal_text},
    )

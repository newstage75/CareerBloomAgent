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
_matching_runner: Runner | None = None
_job_collector_runner: Runner | None = None


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


def _get_matching_runner() -> Runner:
    global _matching_runner
    if _matching_runner is None:
        from agent.matching_calculator.agent import matching_calculator_agent
        _matching_runner = Runner(
            agent=matching_calculator_agent,
            app_name=APP_NAME,
            session_service=_session_service,
        )
    return _matching_runner


def _get_job_collector_runner() -> Runner:
    global _job_collector_runner
    if _job_collector_runner is None:
        from agent.job_collector.agent import job_collector_agent
        _job_collector_runner = Runner(
            agent=job_collector_agent,
            app_name=APP_NAME,
            session_service=_session_service,
        )
    return _job_collector_runner


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

    Yields dicts with shape `{"type": "tool_call"|"tool_response"|"thinking"|"final"|"error", ...}`.
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
            if (
                event.content
                and event.content.parts
                and event.content.parts[0].text
                and not (event.get_function_calls() or event.get_function_responses())
            ):
                text = event.content.parts[0].text
                if event.is_final_response():
                    yield {"type": "final", "text": text}
                else:
                    yield {"type": "thinking", "text": text}
    except Exception as exc:
        logger.exception("Agent streaming failed")
        yield {"type": "error", "message": str(exc)}


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


async def run_matching_refresh(uid: str, contexts: list[str] | None = None) -> str | None:
    """マッチング再計算。30秒タイムアウト。"""
    try:
        runner = _get_matching_runner()
        ctx_text = "、".join(contexts) if contexts else "価値観、スキル"
        result = await asyncio.wait_for(
            _run_agent(
                runner,
                user_id=uid,
                message=f"現在のユーザーの求人調査をしてください。ベースにするデータ: {ctx_text}",
                state={"uid": uid},
            ),
            timeout=30.0,
        )
        logger.info("Matching refresh completed for user %s", uid)
        return result
    except asyncio.TimeoutError:
        logger.warning("Matching refresh timed out for user %s", uid)
        return None
    except Exception as e:
        logger.warning("Matching refresh failed for user %s: %s", uid, e)
        return None


def stream_job_collection(keywords: list[str] | None) -> AsyncGenerator[dict, None]:
    """Job collection streaming. Yields progress events."""
    runner = _get_job_collector_runner()
    kw_text = "、".join(keywords) if keywords else "デフォルトキーワード"
    return stream_agent_events(
        runner,
        user_id="system",
        message=f"以下のキーワードで求人情報を収集してください: {kw_text}",
    )


def stream_matching_refresh(uid: str, contexts: list[str] | None) -> AsyncGenerator[dict, None]:
    """Matching refresh streaming. Yields progress events."""
    runner = _get_matching_runner()
    ctx_text = "、".join(contexts) if contexts else "価値観、スキル"
    return stream_agent_events(
        runner,
        user_id=uid,
        message=f"現在のユーザーの求人調査をしてください。ベースにするデータ: {ctx_text}",
        state={"uid": uid},
    )


async def run_job_collection(keywords: list[str] | None = None) -> str | None:
    """求人収集バッチ実行。30秒タイムアウト。"""
    try:
        runner = _get_job_collector_runner()
        kw_text = "、".join(keywords) if keywords else "デフォルトキーワード"
        result = await asyncio.wait_for(
            _run_agent(
                runner,
                user_id="system",
                message=f"以下のキーワードで求人情報を収集してください: {kw_text}",
            ),
            timeout=30.0,
        )
        logger.info("Job collection completed")
        return result
    except asyncio.TimeoutError:
        logger.warning("Job collection timed out")
        return None
    except Exception as e:
        logger.warning("Job collection failed: %s", e)
        return None

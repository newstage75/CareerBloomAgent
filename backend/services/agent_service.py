"""Backend integration for ADK agents.

Provides async wrappers to invoke ADK agents from FastAPI endpoints.
"""

from __future__ import annotations

import asyncio
import logging

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


async def _run_agent(runner: Runner, user_id: str, message: str) -> str | None:
    """Run an ADK agent and return the final text response."""
    session = await _session_service.create_session(
        app_name=APP_NAME,
        user_id=user_id,
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


async def run_insight_extraction(uid: str, session_id: str) -> None:
    """Fire-and-forget: チャット完了後に呼ばれる。30秒タイムアウト。"""
    try:
        runner = _get_insight_runner()
        await asyncio.wait_for(
            _run_agent(
                runner,
                user_id=uid,
                message=f"ユーザー {uid} のセッション {session_id} からインサイトを抽出してください。",
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
                message=f"ユーザー {uid} の求人調査をしてください。ベースにするデータ: {ctx_text}",
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

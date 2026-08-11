"""Human-in-the-loop OpenAI Agents SDK route.

POST /hitl starts an agent run or resumes a pending approval.  The serialized
RunState is kept in ``context.store.state``; clients only send decisions.
"""

from __future__ import annotations

import os
from typing import Any

from agents import Agent, OpenAIChatCompletionsModel, RunState, Runner, function_tool
from openai import AsyncOpenAI

from .._logger import create_logger

logger = create_logger("hitl")
DEFAULT_MODEL = "@makers/deepseek-v4-flash"
STATE_PREFIX = "openai-agents-hitl:"


@function_tool(needs_approval=True)
def send_email(to: str, subject: str, body: str) -> str:
    """Send an email (demo action; always requires human approval)."""
    return f'Email sent to {to} with subject "{subject}" (demo action).'


def _response(payload: dict[str, Any], status: int = 200) -> dict[str, Any]:
    """Return the EdgeOne agent runtime response envelope for errors."""
    if status != 200:
        return {"status_code": status, "body": payload}
    return payload


def _state_store(context: Any) -> Any:
    return getattr(getattr(context, "store", None), "state", None)


def _state_key(conversation_id: str) -> str:
    return f"{STATE_PREFIX}{conversation_id}"


async def _read_state(context: Any, key: str) -> str | None:
    store = _state_store(context)
    if store is None or not hasattr(store, "get"):
        return None
    value = await store.get(key)
    if isinstance(value, str):
        return value
    if isinstance(value, dict) and isinstance(value.get("value"), str):
        return value["value"]
    return None


async def _write_state(context: Any, key: str, value: str) -> None:
    store = _state_store(context)
    if store is None or not hasattr(store, "set"):
        raise RuntimeError("context.store.state.set is unavailable")
    await store.set(key, value)


async def _delete_state(context: Any, key: str) -> None:
    store = _state_store(context)
    if store is not None and hasattr(store, "delete"):
        await store.delete(key)


def _approval_summary(interruption: Any, index: int) -> dict[str, Any]:
    raw = getattr(interruption, "raw_item", None) or getattr(interruption, "rawItem", None) or interruption
    return {
        "index": index,
        "tool": getattr(raw, "name", None) or getattr(interruption, "name", None) or "tool",
        "input": getattr(raw, "arguments", None) or getattr(interruption, "arguments", ""),
    }


def _create_agent(context: Any) -> Agent:
    env = getattr(context, "env", None) or os.environ
    client = AsyncOpenAI(
        api_key=env.get("AI_GATEWAY_API_KEY"),
        base_url=env.get("AI_GATEWAY_BASE_URL"),
    )
    model = OpenAIChatCompletionsModel(
        model=env.get("AI_GATEWAY_MODEL", DEFAULT_MODEL),
        openai_client=client,
    )
    return Agent(
        name="HITL Assistant",
        instructions=(
            "You are an OpenAI Agents SDK human-in-the-loop demo on EdgeOne Makers. "
            "Answer questions directly. If the user asks to send an email, call "
            "send_email with the requested recipient, subject, and body. Sending is "
            "a demo action and must wait for explicit human approval."
        ),
        tools=[send_email],
        model=model,
    )


async def handler(context: Any) -> dict[str, Any]:
    """Start or resume a RunState-backed approval flow."""
    body = context.request.body if isinstance(context.request.body, dict) else {}
    conversation_id = str(getattr(context, "conversation_id", "") or "").strip()
    if not conversation_id:
        return _response({"error": "makers-conversation-id is required"}, 400)

    store = _state_store(context)
    if store is None or not hasattr(store, "get") or not hasattr(store, "set"):
        return _response(
            {"error": "HITL state store is unavailable", "code": "HITL_STATE_STORE_UNAVAILABLE"},
            503,
        )

    key = _state_key(conversation_id)
    stored = await _read_state(context, key)
    action = body.get("action") if body.get("action") in ("approve", "reject") else None
    agent = _create_agent(context)

    if action:
        if not stored:
            return _response({"error": "No pending approval was found", "code": "HITL_STATE_MISSING"}, 404)
        try:
            state = await RunState.from_string(agent, stored)
        except Exception as error:
            logger.error(f"corrupt RunState: {type(error).__name__}: {error}")
            return _response({"error": "The pending approval state is corrupt", "code": "HITL_STATE_CORRUPT"}, 409)

        interruptions = state.get_interruptions()
        index = body.get("approvalIndex", 0)
        if not isinstance(index, int) or index < 0:
            index = 0
        approval = interruptions[index] if index < len(interruptions) else None
        if approval is None:
            return _response({"error": "The approval request is no longer available", "code": "HITL_APPROVAL_MISSING"}, 400)
        if action == "approve":
            state.approve(approval)
        else:
            state.reject(approval)
        result = await Runner.run(agent, state=state)
    else:
        message = body.get("message") if isinstance(body.get("message"), str) else ""
        message = message.strip()
        if not message:
            return _response({"error": "'message' is required"}, 400)
        if stored:
            return _response({"error": "An approval is already pending", "code": "HITL_APPROVAL_PENDING"}, 409)
        result = await Runner.run(agent, message)

    # Use the SDK's state object so this works across SDK releases where
    # interruptions are exposed on either the result or the state.
    state = result.to_state()
    pending = state.get_interruptions()
    if pending:
        await _write_state(context, key, state.to_string())
        return {"status": "needs_approval", "approval": _approval_summary(pending[0], 0)}

    await _delete_state(context, key)
    return {"status": "completed", "output": result.final_output or ""}

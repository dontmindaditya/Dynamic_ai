from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))

from app.services import agent_pipeline


@pytest.mark.asyncio
async def test_run_build_pipeline_links_agent_to_deliverable(monkeypatch):
    calls: dict[str, object] = {}

    async def fake_get_byok_key(_user_id: str):
        return None, None

    async def fake_set_status(_job_id: str, _user_id: str, _status: str, extra: dict | None = None):
        calls.setdefault("statuses", []).append(extra or {})

    async def fake_call_edge_function(fn_name: str, payload: dict, user_id: str, timeout: float = 0):
        if fn_name == "prompt-generator":
            return {"spec": {"name": "Ops Agent"}}
        if fn_name == "config-generator":
            return {
                "config": {
                    "name": "Ops Agent",
                    "description": "Handles deliverable work",
                    "test_cases": [{"input": {"message": "hello"}}],
                },
                "config_path": "agents/user/agent/v1/config.json",
            }
        if fn_name == "agent-runner":
            return {"output": {"ok": True}, "latency_ms": 10, "errors": []}
        if fn_name == "agent-reviewer":
            return {"pass": True, "score": 100, "issues": []}
        raise AssertionError(f"Unexpected edge function: {fn_name}")

    async def fake_create_agent(**kwargs):
        calls["created_agent_id"] = kwargs["agent_id"]

    async def fake_update_deliverable(deliverable_id: str, body: dict):
        calls["deliverable_update"] = (deliverable_id, body)

    async def fake_broadcast_job_status(*_args, **_kwargs):
        return None

    monkeypatch.setattr(agent_pipeline, "get_byok_key", fake_get_byok_key)
    monkeypatch.setattr(agent_pipeline, "_set_status", fake_set_status)
    monkeypatch.setattr(agent_pipeline, "call_edge_function", fake_call_edge_function)
    monkeypatch.setattr(agent_pipeline, "create_agent", fake_create_agent)
    monkeypatch.setattr(agent_pipeline, "update_deliverable", fake_update_deliverable)
    monkeypatch.setattr(agent_pipeline, "broadcast_job_status", fake_broadcast_job_status)
    monkeypatch.setattr(agent_pipeline, "new_uuid", lambda: "agent-123")
    monkeypatch.setattr(agent_pipeline, "generate_api_key", lambda: "raw-key")
    monkeypatch.setattr(agent_pipeline, "hash_api_key", lambda _raw: "hashed-key")
    monkeypatch.setattr(agent_pipeline, "generate_embed_url", lambda agent_id: f"https://embed/{agent_id}")
    monkeypatch.setattr(agent_pipeline, "generate_api_endpoint", lambda agent_id: f"/v1/agents/{agent_id}/run")

    await agent_pipeline.run_build_pipeline(
        job_id="job-1",
        user_id="user-1",
        prompt="Build a deliverable agent",
        provider="openai",
        owner_role="tester",
        title="QA Deliverable",
        deliverable_id="deliv-1",
    )

    assert calls["created_agent_id"] == "agent-123"
    assert calls["deliverable_update"] == ("deliv-1", {"agent_id": "agent-123"})

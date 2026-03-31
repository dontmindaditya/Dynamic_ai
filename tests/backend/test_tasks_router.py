from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))

from app.routers import tasks


@pytest.mark.asyncio
async def test_invoke_agent_for_task_marks_blocked_on_failure(monkeypatch):
    updates: list[tuple[str, dict]] = []

    async def fake_get_task(task_id: str):
        return {
            "id": task_id,
            "title": "Segmentation Analysis",
            "description": "Analyze customer segments",
            "priority": "normal",
        }

    async def fake_get_byok_key(_user_id: str):
        return None, None

    async def fake_call_edge_function(*_args, **_kwargs):
        raise Exception("Edge function 'agent-invoke' returned 500: model error")

    async def fake_update_task(task_id: str, body: dict):
        updates.append((task_id, body))

    monkeypatch.setattr(tasks, "get_task", fake_get_task)
    monkeypatch.setattr(tasks, "get_byok_key", fake_get_byok_key)
    monkeypatch.setattr(tasks, "call_edge_function", fake_call_edge_function)
    monkeypatch.setattr(tasks, "update_task", fake_update_task)

    await tasks._invoke_agent_for_task(
        task_id="task-1",
        agent_id="agent-1",
        user_id="user-1",
        deliverable={"id": "deliv-1", "title": "data analysis"},
        project={"id": "proj-1", "name": "growth"},
    )

    assert updates == [
        ("task-1", {
            "status": "blocked",
            "blockers": ["Edge function 'agent-invoke' returned 500: model error"],
        })
    ]

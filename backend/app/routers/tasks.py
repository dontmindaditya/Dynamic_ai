import logging
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from app.middleware.auth import get_current_user
from app.models.project_models import (
    TaskCreate, TaskUpdate, TaskResponse, TaskListResponse,
)
from app.clients.supabase_client import (
    get_deliverable, get_agent, call_edge_function,
    create_task, get_tasks_for_deliverable, get_task,
    update_task, delete_task, get_project,
)
from app.services.credits_service import get_byok_key

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/deliverables/{deliverable_id}/tasks", tags=["tasks"])


def _fmt(t: dict) -> TaskResponse:
    return TaskResponse(
        id=t["id"], deliverable_id=t["deliverable_id"],
        title=t["title"], description=t.get("description"),
        status=t["status"], priority=t["priority"],
        output=t.get("output"), blockers=t.get("blockers"),
        parent_task_id=t.get("parent_task_id"),
        created_at=t["created_at"], updated_at=t["updated_at"],
    )


async def _invoke_agent_for_task(
    task_id: str, agent_id: str, user_id: str,
    deliverable: dict, project: dict,
) -> None:
    """Background task — invokes the owning agent then writes output back to the task."""
    try:
        task = await get_task(task_id)
        if not task:
            return

        _, byok_key = await get_byok_key(user_id)

        payload: dict = {
            "agent_id": agent_id,
            "user_id":  user_id,
            "source":   "task",
            "input": {
                "message":           task.get("description") or task["title"],
                "task_id":           task_id,
                "task_title":        task["title"],
                "priority":          task["priority"],
                "deliverable_id":    deliverable["id"],
                "deliverable_title": deliverable["title"],
                "project_id":        project["id"],
                "project_name":      project["name"],
            },
        }
        if byok_key:
            payload["api_key_override"] = byok_key

        result = await call_edge_function("agent-invoke", payload, user_id, timeout=120.0)

        output   = result.get("output") or {}
        errors   = result.get("errors") or []
        blockers = [e for e in errors if e]

        await update_task(task_id, {
            "status":   "blocked" if blockers else "done",
            "output":   output,
            "blockers": blockers if blockers else None,
        })
        logger.info(f"[tasks] {task_id} agent invocation done")

    except Exception as exc:
        logger.error(f"[tasks] {task_id} agent invocation failed: {exc}")
        await update_task(task_id, {"status": "pending"})


@router.post("", response_model=TaskResponse, status_code=201)
async def create(
    deliverable_id: str,
    body:           TaskCreate,
    background_tasks: BackgroundTasks,
    current_user:   dict = Depends(get_current_user),
):
    user_id = current_user["user_id"]

    deliverable = await get_deliverable(deliverable_id)
    if not deliverable:
        raise HTTPException(status_code=404, detail="Deliverable not found")
    if deliverable["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    agent_id = deliverable.get("agent_id")
    agent    = await get_agent(agent_id) if agent_id else None
    can_invoke = agent and agent.get("status") == "live"

    task = await create_task(
        deliverable_id=deliverable_id,
        user_id=user_id,
        title=body.title,
        description=body.description,
        priority=body.priority,
        status="processing" if can_invoke else "pending",
    )

    if can_invoke:
        project = await get_project(deliverable["project_id"]) or {"id": "", "name": ""}
        background_tasks.add_task(
            _invoke_agent_for_task,
            task["id"], agent_id, user_id, deliverable, project,
        )

    return _fmt(task)


@router.get("", response_model=TaskListResponse)
async def list_tasks(
    deliverable_id: str,
    current_user:   dict = Depends(get_current_user),
):
    deliverable = await get_deliverable(deliverable_id)
    if not deliverable:
        raise HTTPException(status_code=404, detail="Deliverable not found")
    if deliverable["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    rows = await get_tasks_for_deliverable(deliverable_id)
    return TaskListResponse(tasks=[_fmt(r) for r in rows], total=len(rows))


@router.get("/{task_id}", response_model=TaskResponse)
async def get_one(
    deliverable_id: str,
    task_id:        str,
    current_user:   dict = Depends(get_current_user),
):
    deliverable = await get_deliverable(deliverable_id)
    if not deliverable or deliverable["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    task = await get_task(task_id)
    if not task or task["deliverable_id"] != deliverable_id:
        raise HTTPException(status_code=404, detail="Task not found")
    return _fmt(task)


@router.patch("/{task_id}", response_model=TaskResponse)
async def update(
    deliverable_id: str,
    task_id:        str,
    body:           TaskUpdate,
    background_tasks: BackgroundTasks,
    current_user:   dict = Depends(get_current_user),
):
    user_id     = current_user["user_id"]
    deliverable = await get_deliverable(deliverable_id)
    if not deliverable or deliverable["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    task = await get_task(task_id)
    if not task or task["deliverable_id"] != deliverable_id:
        raise HTTPException(status_code=404, detail="Task not found")

    patch = body.model_dump(exclude_none=True)

    # Re-trigger agent if description changed or status reset to pending
    re_trigger = "description" in patch or patch.get("status") == "pending"
    agent_id   = deliverable.get("agent_id")
    agent      = await get_agent(agent_id) if agent_id else None
    can_invoke = agent and agent.get("status") == "live"

    if re_trigger and can_invoke:
        patch["status"] = "processing"

    if patch:
        await update_task(task_id, patch)

    if re_trigger and can_invoke:
        project = await get_project(deliverable["project_id"]) or {"id": "", "name": ""}
        background_tasks.add_task(
            _invoke_agent_for_task,
            task_id, agent_id, user_id, deliverable, project,
        )

    updated = await get_task(task_id)
    return _fmt(updated)


@router.delete("/{task_id}")
async def delete(
    deliverable_id: str,
    task_id:        str,
    current_user:   dict = Depends(get_current_user),
):
    deliverable = await get_deliverable(deliverable_id)
    if not deliverable or deliverable["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    task = await get_task(task_id)
    if not task or task["deliverable_id"] != deliverable_id:
        raise HTTPException(status_code=404, detail="Task not found")

    await delete_task(task_id)
    return {"message": "Task deleted"}

from fastapi import APIRouter, Depends, HTTPException
from app.middleware.auth import get_current_user
from app.models.project_models import (
    DeliverableCreate, DeliverableUpdate,
    DeliverableResponse, DeliverableListResponse,
)
from app.clients.supabase_client import (
    get_project, create_deliverable, get_deliverables_for_project,
    get_deliverable, update_deliverable, delete_deliverable,
)

router = APIRouter(prefix="/projects/{project_id}/deliverables", tags=["deliverables"])


def _fmt(d: dict) -> DeliverableResponse:
    return DeliverableResponse(
        id=d["id"], project_id=d["project_id"],
        agent_id=d.get("agent_id"), title=d["title"],
        description=d.get("description"), owner_role=d.get("owner_role"),
        status=d.get("status", "active"),
        created_at=d["created_at"], updated_at=d["updated_at"],
    )


async def _check_project(project_id: str, user_id: str):
    project = await get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return project


@router.post("", response_model=DeliverableResponse, status_code=201)
async def create(
    project_id:   str,
    body:         DeliverableCreate,
    current_user: dict = Depends(get_current_user),
):
    await _check_project(project_id, current_user["user_id"])
    row = await create_deliverable(
        project_id=project_id,
        user_id=current_user["user_id"],
        title=body.title,
        description=body.description,
        owner_role=body.owner_role,
        agent_id=body.agent_id,
    )
    return _fmt(row)


@router.get("", response_model=DeliverableListResponse)
async def list_deliverables(
    project_id:   str,
    current_user: dict = Depends(get_current_user),
):
    await _check_project(project_id, current_user["user_id"])
    rows = await get_deliverables_for_project(project_id)
    return DeliverableListResponse(deliverables=[_fmt(r) for r in rows], total=len(rows))


@router.get("/{deliverable_id}", response_model=DeliverableResponse)
async def get_one(
    project_id:     str,
    deliverable_id: str,
    current_user:   dict = Depends(get_current_user),
):
    await _check_project(project_id, current_user["user_id"])
    d = await get_deliverable(deliverable_id)
    if not d or d["project_id"] != project_id:
        raise HTTPException(status_code=404, detail="Deliverable not found")
    return _fmt(d)


@router.patch("/{deliverable_id}", response_model=DeliverableResponse)
async def update(
    project_id:     str,
    deliverable_id: str,
    body:           DeliverableUpdate,
    current_user:   dict = Depends(get_current_user),
):
    await _check_project(project_id, current_user["user_id"])
    d = await get_deliverable(deliverable_id)
    if not d or d["project_id"] != project_id:
        raise HTTPException(status_code=404, detail="Deliverable not found")

    patch = body.model_dump(exclude_none=True)
    if patch:
        await update_deliverable(deliverable_id, patch)

    updated = await get_deliverable(deliverable_id)
    return _fmt(updated)


@router.delete("/{deliverable_id}")
async def delete(
    project_id:     str,
    deliverable_id: str,
    current_user:   dict = Depends(get_current_user),
):
    await _check_project(project_id, current_user["user_id"])
    d = await get_deliverable(deliverable_id)
    if not d or d["project_id"] != project_id:
        raise HTTPException(status_code=404, detail="Deliverable not found")
    await delete_deliverable(deliverable_id)
    return {"message": "Deliverable deleted"}

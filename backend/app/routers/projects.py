from fastapi import APIRouter, Depends, HTTPException
from app.middleware.auth import get_current_user
from app.models.project_models import (
    ProjectCreate, ProjectUpdate, ProjectResponse, ProjectListResponse,
)
from app.clients.supabase_client import (
    create_project, get_projects_for_user, get_project,
    update_project, delete_project,
)

router = APIRouter(prefix="/projects", tags=["projects"])


def _fmt(p: dict) -> ProjectResponse:
    return ProjectResponse(
        id=p["id"], name=p["name"], description=p.get("description"),
        status=p.get("status", "active"),
        created_at=p["created_at"], updated_at=p["updated_at"],
    )


@router.post("", response_model=ProjectResponse, status_code=201)
async def create(
    body:         ProjectCreate,
    current_user: dict = Depends(get_current_user),
):
    row = await create_project(current_user["user_id"], body.name, body.description)
    return _fmt(row)


@router.get("", response_model=ProjectListResponse)
async def list_projects(current_user: dict = Depends(get_current_user)):
    rows = await get_projects_for_user(current_user["user_id"])
    return ProjectListResponse(projects=[_fmt(r) for r in rows], total=len(rows))


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_one(project_id: str, current_user: dict = Depends(get_current_user)):
    project = await get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    return _fmt(project)


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update(
    project_id:   str,
    body:         ProjectUpdate,
    current_user: dict = Depends(get_current_user),
):
    project = await get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    patch = body.model_dump(exclude_none=True)
    if patch:
        await update_project(project_id, patch)

    updated = await get_project(project_id)
    return _fmt(updated)


@router.delete("/{project_id}")
async def delete(project_id: str, current_user: dict = Depends(get_current_user)):
    project = await get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    await delete_project(project_id)
    return {"message": "Project deleted"}

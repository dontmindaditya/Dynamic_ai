from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime


# ── Projects ──────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name:        str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None


class ProjectUpdate(BaseModel):
    name:        Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = None
    status:      Optional[str] = Field(default=None, pattern="^(active|archived)$")


class ProjectResponse(BaseModel):
    id:          str
    name:        str
    description: Optional[str] = None
    status:      str
    created_at:  datetime
    updated_at:  datetime


class ProjectListResponse(BaseModel):
    projects: list[ProjectResponse]
    total:    int


# ── Deliverables ──────────────────────────────────────────────

class DeliverableCreate(BaseModel):
    title:       str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = None
    owner_role:  Optional[str] = Field(default=None, max_length=100)
    agent_id:    Optional[str] = None   # assign existing live agent


class DeliverableUpdate(BaseModel):
    title:       Optional[str] = Field(default=None, max_length=300)
    description: Optional[str] = None
    owner_role:  Optional[str] = None
    agent_id:    Optional[str] = None
    status:      Optional[str] = Field(default=None, pattern="^(active|completed|blocked|archived)$")


class DeliverableResponse(BaseModel):
    id:          str
    project_id:  str
    agent_id:    Optional[str] = None
    title:       str
    description: Optional[str] = None
    owner_role:  Optional[str] = None
    status:      str
    created_at:  datetime
    updated_at:  datetime


class DeliverableListResponse(BaseModel):
    deliverables: list[DeliverableResponse]
    total:        int


# ── Tasks ─────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    title:       str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    priority:    str = Field(default="normal", pattern="^(low|normal|high)$")


class TaskUpdate(BaseModel):
    title:       Optional[str] = Field(default=None, max_length=500)
    description: Optional[str] = None
    priority:    Optional[str] = Field(default=None, pattern="^(low|normal|high)$")
    status:      Optional[str] = Field(default=None, pattern="^(pending|processing|done|blocked)$")


class TaskResponse(BaseModel):
    id:             str
    deliverable_id: str
    title:          str
    description:    Optional[str] = None
    status:         str
    priority:       str
    output:         Optional[Any] = None
    blockers:       Optional[list[str]] = None
    parent_task_id: Optional[str] = None
    created_at:     datetime
    updated_at:     datetime


class TaskListResponse(BaseModel):
    tasks: list[TaskResponse]
    total: int

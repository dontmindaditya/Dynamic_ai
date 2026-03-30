
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from uuid import uuid4

from app.models.agent_models import (
    AgentBuildRequest, AgentBuildResponse,
    AgentInvokeRequest, AgentInvokeResponse,
    JobStatusResponse, AgentResponse, AgentListResponse,
)
from app.services.agent_pipeline import run_build_pipeline
from app.clients.supabase_client import (
    call_edge_function, create_job, get_job, get_agent,
    get_agents_for_user, delete_agent,
)
from app.middleware.rate_limit import check_build_rate_limit
from app.middleware.auth import get_current_user
from app.services.credits_service import get_byok_key

router = APIRouter(prefix="/agents", tags=["agents"])


@router.post("/build", response_model=AgentBuildResponse)
async def build_agent(
    request:          AgentBuildRequest,
    background_tasks: BackgroundTasks,
    current_user:     dict = Depends(get_current_user),
):
    user_id = current_user["user_id"]
    check_build_rate_limit(user_id)

    job_id = str(uuid4())
    await create_job(job_id, user_id, request.prompt)

    background_tasks.add_task(
        run_build_pipeline,
        job_id=job_id,
        user_id=user_id,
        prompt=request.prompt,
        provider=request.provider,
        owner_role=request.owner_role,
        title=request.title,
        deliverable_id=request.deliverable_id,
    )

    return AgentBuildResponse(job_id=job_id, status="queued")


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(
    job_id:       str,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["user_id"]
    job     = await get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    agent_id = embed_url = api_endpoint = None

    if job["status"] == "live":
        agents = await get_agents_for_user(user_id)
        agent  = next((a for a in agents if a.get("job_id") == job_id), None)
        if agent:
            agent_id     = agent["id"]
            embed_url    = agent.get("embed_url")
            api_endpoint = agent.get("api_endpoint")

    return JobStatusResponse(
        job_id=job["id"],
        status=job["status"],
        prompt=job["prompt"],
        retry_count=job.get("retry_count", 0),
        failure_reason=job.get("failure_reason"),
        config_path=job.get("config_path"),
        created_at=job["created_at"],
        updated_at=job["updated_at"],
        agent_id=agent_id,
        embed_url=embed_url,
        api_endpoint=api_endpoint,
    )


@router.get("", response_model=AgentListResponse)
async def list_agents(current_user: dict = Depends(get_current_user)):
    agents = await get_agents_for_user(current_user["user_id"])
    return AgentListResponse(
        agents=[_fmt(a) for a in agents],
        total=len(agents),
    )


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_single_agent(
    agent_id:     str,
    current_user: dict = Depends(get_current_user),
):
    agent = await get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if agent["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    return _fmt(agent)


@router.delete("/{agent_id}")
async def remove_agent(
    agent_id:     str,
    current_user: dict = Depends(get_current_user),
):
    agent = await get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if agent["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    await delete_agent(agent_id)
    return {"message": "Agent deleted"}


@router.post("/{agent_id}/run", response_model=AgentInvokeResponse)
async def playground_invoke(
    agent_id:     str,
    request:      AgentInvokeRequest,
    current_user: dict = Depends(get_current_user),
):
    """Playground invocation — uses session JWT, not an API key."""
    agent = await get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if agent["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    user_id = current_user["user_id"]

    _, byok_key = await get_byok_key(user_id)

    invoke_payload: dict = {
        "agent_id": agent_id,
        "user_id":  user_id,
        "input":    {"message": request.message},
        "source":   "playground",
    }
    if byok_key:
        invoke_payload["api_key_override"] = byok_key

    result = await call_edge_function(
        fn_name="agent-invoke",
        payload=invoke_payload,
        user_id=user_id,
        timeout=120.0,
    )

    if "error" in result and not result.get("output"):
        raise HTTPException(status_code=500, detail=result["error"])

    return AgentInvokeResponse(
        output=result.get("output",      {}),
        steps_taken=result.get("steps_taken", 0),
        latency_ms=result.get("latency_ms",  0),
        tokens_used=result.get("tokens_used", 0),
        errors=result.get("errors",       []),
    )


def _fmt(a: dict) -> AgentResponse:
    return AgentResponse(
        id=a["id"], name=a["name"], description=a.get("description"),
        status=a["status"], version=a.get("version", 1),
        embed_url=a.get("embed_url"), api_endpoint=a.get("api_endpoint"),
        created_at=a["created_at"], updated_at=a["updated_at"],
    )
from fastapi import APIRouter, Depends, HTTPException, Query
from app.models.agent_models import RunLogResponse, RunLogsResponse
from app.clients.supabase_client import get_agent, get_runs_for_agent
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/agents", tags=["runs"])


@router.get("/{agent_id}/runs", response_model=RunLogsResponse)
async def list_runs(
    agent_id:     str,
    limit:        int  = Query(default=20, le=100),
    offset:       int  = Query(default=0),
    current_user: dict = Depends(get_current_user),
):
    agent = await get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if agent["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    runs = await get_runs_for_agent(agent_id, limit=limit, offset=offset)

    return RunLogsResponse(
        runs=[
            RunLogResponse(
                id=r["id"], input=r.get("input", {}), output=r.get("output"),
                steps_taken=r.get("steps_taken", 0), latency_ms=r.get("latency_ms"),
                tokens_used=r.get("tokens_used", 0), error=r.get("error"),
                source=r.get("source", "api"), created_at=r["created_at"],
            )
            for r in runs
        ],
        total=len(runs),
    )
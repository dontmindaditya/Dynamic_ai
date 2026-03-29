from fastapi import APIRouter, Depends, HTTPException
from app.models.agent_models import AgentInvokeRequest, AgentInvokeResponse
from app.middleware.api_key_auth import validate_api_key
from app.clients.supabase_client import call_edge_function

router = APIRouter(prefix="/v1/agents", tags=["public-api"])


@router.post("/{agent_id}/run", response_model=AgentInvokeResponse)
async def invoke_agent(
    agent_id: str,
    request:  AgentInvokeRequest,
    agent:    dict = Depends(validate_api_key),
):
    if agent["id"] != agent_id:
        raise HTTPException(status_code=403, detail="API key does not match agent")

    user_id = agent["user_id"]

    result = await call_edge_function(
        fn_name="agent-invoke",
        payload={
            "agent_id": agent_id,
            "user_id":  user_id,
            "input":    {"message": request.message},
            "source":   "api",
        },
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
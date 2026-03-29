import os
import httpx

SUPABASE_URL     = os.getenv("SUPABASE_URL", "")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


async def broadcast_job_status(
    job_id:  str,
    status:  str,
    payload: dict | None = None,
) -> None:
    """Fire-and-forget — pipeline never blocks on this."""
    try:
        url  = f"{SUPABASE_URL}/realtime/v1/api/broadcast"
        body = {
            "messages": [
                {
                    "topic":   f"job-{job_id}",
                    "event":   "status_update",
                    "payload": {
                        "job_id": job_id,
                        "status": status,
                        **(payload or {}),
                    },
                }
            ]
        }
        async with httpx.AsyncClient() as client:
            await client.post(
                url,
                headers={
                    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
                    "Content-Type":  "application/json",
                    "apikey":        SERVICE_ROLE_KEY,
                },
                json=body,
                timeout=5.0,
            )
    except Exception:
        pass  # Never let broadcast failure crash the pipeline
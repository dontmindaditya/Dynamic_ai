
import httpx
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.utils.id_gen import hash_api_key
from app.clients.supabase_client import REST_URL, _rest_headers

bearer_scheme = HTTPBearer()


async def validate_api_key(
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme),
) -> dict:
    """
    Validates fq_live_xxxx Bearer token against agents table.
    Returns the agent dict if valid.
    """
    raw_key = credentials.credentials

    if not raw_key.startswith("fq_live_"):
        raise HTTPException(status_code=401, detail="Invalid API key format")

    key_hash = hash_api_key(raw_key)

    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{REST_URL}/agents",
            headers=_rest_headers(),
            params={
                "api_key": f"eq.{key_hash}",
                "status":  "eq.live",
                "limit":   "1",
            },
            timeout=10.0,
        )

    if r.status_code >= 400:
        raise HTTPException(status_code=401, detail="Invalid API key")

    data = r.json()
    if not data:
        raise HTTPException(status_code=401, detail="Invalid or expired API key")

    return data[0]
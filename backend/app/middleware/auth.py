import os
import json
import httpx
import jwt
from jwt.algorithms import ECAlgorithm, RSAAlgorithm
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

bearer_scheme = HTTPBearer()

SUPABASE_URL  = os.getenv("SUPABASE_URL", "")
JWT_SECRET    = os.getenv("JWT_SECRET", "change-this-secret")

# Cache the JWKS public keys so we only fetch once per process
_jwks_cache: dict = {}


async def _get_public_key(kid: str | None):
    """Fetch and cache Supabase JWKS public keys."""
    if kid and kid in _jwks_cache:
        return _jwks_cache[kid]

    jwks_url = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
    async with httpx.AsyncClient() as client:
        r = await client.get(jwks_url, timeout=10.0)

    if r.status_code != 200:
        return None

    jwks = r.json()
    for key_data in jwks.get("keys", []):
        k = key_data.get("kid")
        alg = key_data.get("alg", "")
        if alg.startswith("ES"):
            pub = ECAlgorithm.from_jwk(json.dumps(key_data))
        else:
            pub = RSAAlgorithm.from_jwk(json.dumps(key_data))
        if k:
            _jwks_cache[k] = pub

    return _jwks_cache.get(kid) if kid else (next(iter(_jwks_cache.values()), None))


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme),
) -> dict:
    """
    Decodes JWT (HS256 or ES256) and returns {"user_id": str}.
    Used as Depends(get_current_user) in all protected routes.
    """
    token = credentials.credentials

    # Peek at the header to decide which path to take
    try:
        header = jwt.get_unverified_header(token)
    except jwt.DecodeError:
        raise HTTPException(status_code=401, detail="Invalid token")

    alg = header.get("alg", "HS256")

    try:
        if alg in ("ES256", "ES384", "ES512", "RS256", "RS384", "RS512"):
            kid = header.get("kid")
            public_key = await _get_public_key(kid)
            if not public_key:
                raise HTTPException(status_code=401, detail="Unable to fetch signing key")
            payload = jwt.decode(
                token,
                public_key,
                algorithms=[alg],
                options={"verify_aud": False},
            )
        else:
            payload = jwt.decode(
                token,
                JWT_SECRET,
                algorithms=[alg],
                options={"verify_aud": False},
            )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

    user_id = payload.get("user_id") or payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing user_id")

    return {"user_id": str(user_id)}

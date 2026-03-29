import os
import secrets
import hashlib
from uuid import uuid4

BASE_URL = os.getenv("BASE_URL", "https://fairquanta.ai")


def new_uuid() -> str:
    return str(uuid4())


def generate_embed_url(agent_id: str) -> str:
    return f"{BASE_URL}/embed/{agent_id}"


def generate_api_endpoint(agent_id: str) -> str:
    return f"/v1/agents/{agent_id}/run"


def generate_api_key() -> str:
    """Format: fq_live_<32 random hex chars>. Only the hash is stored in DB."""
    return f"fq_live_{secrets.token_hex(32)}"


def hash_api_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode()).hexdigest()


def verify_api_key(raw_key: str, stored_hash: str) -> bool:
    return hash_api_key(raw_key) == stored_hash
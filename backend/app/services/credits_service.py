from app.clients.supabase_client import get_or_create_credits, update_byok
from app.utils.encryption import encrypt_key, decrypt_key


async def get_credits(user_id: str) -> dict:
    row = await get_or_create_credits(user_id)
    return {
        "credits_used":      row.get("credits_used", 0),
        "credits_remaining": row.get("credits_remaining", 100),
        "byok_provider":     row.get("byok_provider"),
        "has_byok":          bool(row.get("byok_key_encrypted")),
    }


async def store_byok_key(user_id: str, provider: str, raw_key: str) -> None:
    encrypted = encrypt_key(raw_key)
    await update_byok(user_id, provider, encrypted)


async def get_byok_key(user_id: str) -> tuple[str | None, str | None]:
    """Returns (provider, decrypted_key) or (None, None) if no BYOK."""
    row       = await get_or_create_credits(user_id)
    provider  = row.get("byok_provider")
    encrypted = row.get("byok_key_encrypted")

    if not provider or not encrypted:
        return None, None

    try:
        return provider, decrypt_key(encrypted)
    except Exception:
        return None, None
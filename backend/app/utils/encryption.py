import os
import base64
from cryptography.fernet import Fernet


def _get_fernet() -> Fernet:
    key = os.getenv("ENCRYPTION_KEY", "")
    if not key:
        raise ValueError("ENCRYPTION_KEY environment variable not set")
    try:
        return Fernet(key.encode())
    except Exception:
        padded = key.encode()[:32].ljust(32, b"0")
        b64_key = base64.urlsafe_b64encode(padded)
        return Fernet(b64_key)


def encrypt_key(plaintext: str) -> str:
    """Encrypt a plaintext API key. Returns base64-encoded ciphertext."""
    f = _get_fernet()
    return f.encrypt(plaintext.encode()).decode()


def decrypt_key(ciphertext: str) -> str:
    """Decrypt an encrypted API key. Returns plaintext."""
    f = _get_fernet()
    return f.decrypt(ciphertext.encode()).decode()


def generate_fernet_key() -> str:
    """Generate a new Fernet key. Run once and store in .env as ENCRYPTION_KEY."""
    return Fernet.generate_key().decode()
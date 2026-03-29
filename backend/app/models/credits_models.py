from pydantic import BaseModel, Field
from typing import Optional


class CreditsResponse(BaseModel):
    credits_used:      int
    credits_remaining: int
    byok_provider:     Optional[str] = None
    has_byok:          bool


class BYOKRequest(BaseModel):
    provider: str = Field(..., pattern="^(openai|anthropic)$")
    api_key:  str = Field(..., min_length=20)


class BYOKResponse(BaseModel):
    message:  str
    provider: str
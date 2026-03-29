from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class AgentBuildRequest(BaseModel):
    prompt: str = Field(..., min_length=10, max_length=2000)
    provider: str = Field(default="openai", pattern="^(openai|anthropic)$")


class AgentInvokeRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=10000)


class AgentBuildResponse(BaseModel):
    job_id: str
    status: str
    message: str = "Build started. Poll /agents/jobs/{job_id} for status."


class JobStatusResponse(BaseModel):
    job_id:          str
    status:          str
    prompt:          str
    retry_count:     int
    failure_reason:  Optional[str] = None
    config_path:     Optional[str] = None
    created_at:      datetime
    updated_at:      datetime
    agent_id:        Optional[str] = None
    embed_url:       Optional[str] = None
    api_endpoint:    Optional[str] = None


class AgentResponse(BaseModel):
    id:           str
    name:         str
    description:  Optional[str] = None
    status:       str
    version:      int
    embed_url:    Optional[str] = None
    api_endpoint: Optional[str] = None
    created_at:   datetime
    updated_at:   datetime


class AgentListResponse(BaseModel):
    agents: list[AgentResponse]
    total:  int


class RunLogResponse(BaseModel):
    id:          str
    input:       dict
    output:      Optional[dict] = None
    steps_taken: int
    latency_ms:  Optional[int] = None
    tokens_used: int
    error:       Optional[str] = None
    source:      str
    created_at:  datetime


class RunLogsResponse(BaseModel):
    runs:  list[RunLogResponse]
    total: int


class AgentInvokeResponse(BaseModel):
    output:      dict
    steps_taken: int
    latency_ms:  int
    tokens_used: int
    errors:      list[str]
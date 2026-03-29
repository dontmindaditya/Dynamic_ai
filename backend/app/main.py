# ============================================================
# backend/app/main.py
# Fairquanta AI Agent Factory — FastAPI application entry point
# ============================================================

import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import agents, agent_runs, credits, public_api

# ── App init ──────────────────────────────────────────────────

app = FastAPI(
    title="Fairquanta AI Agent Factory",
    description="Build, test, and deploy custom AI agents without code.",
    version="1.0.0",
)

# ── CORS ──────────────────────────────────────────────────────

origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────

app.include_router(agents.router)
app.include_router(agent_runs.router)
app.include_router(credits.router)
app.include_router(public_api.router)

# ── Health check ──────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "fairquanta-agent-factory"}
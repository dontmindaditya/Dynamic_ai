# ============================================================
# backend/app/clients/supabase_client.py
# All communication from FastAPI → Supabase
# Service role key lives here only — never in frontend
# ============================================================

import os
import httpx
from typing import Optional

SUPABASE_URL     = os.getenv("SUPABASE_URL", "")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
FUNCTIONS_URL    = f"{SUPABASE_URL}/functions/v1"
REST_URL         = f"{SUPABASE_URL}/rest/v1"


def _rest_headers() -> dict:
    return {
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "apikey":        SERVICE_ROLE_KEY,
        "Content-Type":  "application/json",
        "Prefer":        "return=representation",
    }


def _ef_headers(user_id: str) -> dict:
    return {
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type":  "application/json",
        "x-user-id":     user_id,
    }


# ── Edge Function caller ──────────────────────────────────────

async def call_edge_function(
    fn_name: str,
    payload: dict,
    user_id: str,
    timeout: float = 180.0,
) -> dict:
    url = f"{FUNCTIONS_URL}/{fn_name}"
    async with httpx.AsyncClient() as client:
        response = await client.post(
            url,
            headers=_ef_headers(user_id),
            json=payload,
            timeout=timeout,
        )
    if response.status_code >= 400:
        raise Exception(
            f"Edge function '{fn_name}' returned {response.status_code}: {response.text}"
        )
    return response.json()


# ── agent_jobs ───────────────────────────────────────────────

async def create_job(job_id: str, user_id: str, prompt: str) -> None:
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{REST_URL}/agent_jobs",
            headers=_rest_headers(),
            json={"id": job_id, "user_id": user_id, "prompt": prompt, "status": "queued"},
            timeout=10.0,
        )
    if r.status_code >= 400:
        raise Exception(f"create_job failed: {r.text}")


async def get_job(job_id: str) -> Optional[dict]:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{REST_URL}/agent_jobs",
            headers=_rest_headers(),
            params={"id": f"eq.{job_id}", "limit": "1"},
            timeout=10.0,
        )
    if r.status_code >= 400:
        return None
    data = r.json()
    return data[0] if data else None


async def update_job_status(
    job_id: str,
    status: str,
    extra:  Optional[dict] = None,
) -> None:
    body = {"status": status}
    if extra:
        body.update(extra)
    async with httpx.AsyncClient() as client:
        r = await client.patch(
            f"{REST_URL}/agent_jobs",
            headers=_rest_headers(),
            params={"id": f"eq.{job_id}"},
            json=body,
            timeout=10.0,
        )
    if r.status_code >= 400:
        raise Exception(f"update_job_status failed: {r.text}")


async def get_jobs_for_user(user_id: str, limit: int = 20) -> list[dict]:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{REST_URL}/agent_jobs",
            headers=_rest_headers(),
            params={"user_id": f"eq.{user_id}", "order": "created_at.desc", "limit": str(limit)},
            timeout=10.0,
        )
    return r.json() if r.status_code < 400 else []


# ── agents ───────────────────────────────────────────────────

async def create_agent(
    agent_id: str, user_id: str, job_id: str, name: str,
    description: str, config_path: str, embed_url: str,
    api_endpoint: str, api_key_hash: str, config: dict | None = None,
) -> None:
    body: dict = {
        "id": agent_id, "user_id": user_id, "job_id": job_id,
        "name": name, "description": description, "version": 1,
        "config_path": config_path, "status": "live",
        "embed_url": embed_url, "api_endpoint": api_endpoint,
        "api_key": api_key_hash,
    }
    if config is not None:
        body["config"] = config
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{REST_URL}/agents",
            headers=_rest_headers(),
            json=body,
            timeout=10.0,
        )
    if r.status_code >= 400:
        raise Exception(f"create_agent failed: {r.text}")


async def get_agent(agent_id: str) -> Optional[dict]:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{REST_URL}/agents",
            headers=_rest_headers(),
            params={"id": f"eq.{agent_id}", "limit": "1"},
            timeout=10.0,
        )
    if r.status_code >= 400:
        return None
    data = r.json()
    return data[0] if data else None


async def get_agents_for_user(user_id: str) -> list[dict]:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{REST_URL}/agents",
            headers=_rest_headers(),
            params={"user_id": f"eq.{user_id}", "order": "created_at.desc"},
            timeout=10.0,
        )
    return r.json() if r.status_code < 400 else []


async def delete_agent(agent_id: str) -> None:
    async with httpx.AsyncClient() as client:
        r = await client.delete(
            f"{REST_URL}/agents",
            headers=_rest_headers(),
            params={"id": f"eq.{agent_id}"},
            timeout=10.0,
        )
    if r.status_code >= 400:
        raise Exception(f"delete_agent failed: {r.text}")


# ── agent_runs ───────────────────────────────────────────────

async def get_runs_for_agent(
    agent_id: str, limit: int = 50, offset: int = 0,
) -> list[dict]:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{REST_URL}/agent_runs",
            headers=_rest_headers(),
            params={
                "agent_id": f"eq.{agent_id}",
                "order":    "created_at.desc",
                "limit":    str(limit),
                "offset":   str(offset),
            },
            timeout=10.0,
        )
    return r.json() if r.status_code < 400 else []


# ── usage_credits ────────────────────────────────────────────

async def get_or_create_credits(user_id: str) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{REST_URL}/usage_credits",
            headers=_rest_headers(),
            params={"user_id": f"eq.{user_id}", "limit": "1"},
            timeout=10.0,
        )
        data = r.json() if r.status_code < 400 else []
        if data:
            return data[0]

        r2 = await client.post(
            f"{REST_URL}/usage_credits",
            headers=_rest_headers(),
            json={"user_id": user_id, "credits_used": 0, "credits_remaining": 100},
            timeout=10.0,
        )
        result = r2.json()
        return result[0] if isinstance(result, list) and result else {}


# ── projects ─────────────────────────────────────────────────

async def create_project(user_id: str, name: str, description: str | None) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{REST_URL}/projects",
            headers=_rest_headers(),
            json={"user_id": user_id, "name": name, "description": description},
            timeout=10.0,
        )
    if r.status_code >= 400:
        raise Exception(f"create_project failed: {r.text}")
    data = r.json()
    return data[0] if isinstance(data, list) else data


async def get_projects_for_user(user_id: str) -> list[dict]:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{REST_URL}/projects",
            headers=_rest_headers(),
            params={"user_id": f"eq.{user_id}", "order": "created_at.desc"},
            timeout=10.0,
        )
    return r.json() if r.status_code < 400 else []


async def get_project(project_id: str) -> Optional[dict]:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{REST_URL}/projects",
            headers=_rest_headers(),
            params={"id": f"eq.{project_id}", "limit": "1"},
            timeout=10.0,
        )
    if r.status_code >= 400:
        return None
    data = r.json()
    return data[0] if data else None


async def update_project(project_id: str, body: dict) -> None:
    async with httpx.AsyncClient() as client:
        r = await client.patch(
            f"{REST_URL}/projects",
            headers=_rest_headers(),
            params={"id": f"eq.{project_id}"},
            json=body,
            timeout=10.0,
        )
    if r.status_code >= 400:
        raise Exception(f"update_project failed: {r.text}")


async def delete_project(project_id: str) -> None:
    async with httpx.AsyncClient() as client:
        r = await client.delete(
            f"{REST_URL}/projects",
            headers=_rest_headers(),
            params={"id": f"eq.{project_id}"},
            timeout=10.0,
        )
    if r.status_code >= 400:
        raise Exception(f"delete_project failed: {r.text}")


# ── deliverables ─────────────────────────────────────────────

async def create_deliverable(
    project_id: str, user_id: str, title: str,
    description: str | None, owner_role: str | None, agent_id: str | None,
) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{REST_URL}/deliverables",
            headers=_rest_headers(),
            json={
                "project_id": project_id, "user_id": user_id,
                "title": title, "description": description,
                "owner_role": owner_role, "agent_id": agent_id,
            },
            timeout=10.0,
        )
    if r.status_code >= 400:
        raise Exception(f"create_deliverable failed: {r.text}")
    data = r.json()
    return data[0] if isinstance(data, list) else data


async def get_deliverables_for_project(project_id: str) -> list[dict]:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{REST_URL}/deliverables",
            headers=_rest_headers(),
            params={"project_id": f"eq.{project_id}", "order": "created_at.asc"},
            timeout=10.0,
        )
    return r.json() if r.status_code < 400 else []


async def get_deliverable(deliverable_id: str) -> Optional[dict]:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{REST_URL}/deliverables",
            headers=_rest_headers(),
            params={"id": f"eq.{deliverable_id}", "limit": "1"},
            timeout=10.0,
        )
    if r.status_code >= 400:
        return None
    data = r.json()
    return data[0] if data else None


async def update_deliverable(deliverable_id: str, body: dict) -> None:
    async with httpx.AsyncClient() as client:
        r = await client.patch(
            f"{REST_URL}/deliverables",
            headers=_rest_headers(),
            params={"id": f"eq.{deliverable_id}"},
            json=body,
            timeout=10.0,
        )
    if r.status_code >= 400:
        raise Exception(f"update_deliverable failed: {r.text}")


async def delete_deliverable(deliverable_id: str) -> None:
    async with httpx.AsyncClient() as client:
        r = await client.delete(
            f"{REST_URL}/deliverables",
            headers=_rest_headers(),
            params={"id": f"eq.{deliverable_id}"},
            timeout=10.0,
        )
    if r.status_code >= 400:
        raise Exception(f"delete_deliverable failed: {r.text}")


# ── tasks ─────────────────────────────────────────────────────

async def create_task(
    deliverable_id: str, user_id: str, title: str,
    description: str | None, priority: str, status: str = "pending",
) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{REST_URL}/tasks",
            headers=_rest_headers(),
            json={
                "deliverable_id": deliverable_id, "user_id": user_id,
                "title": title, "description": description,
                "priority": priority, "status": status,
            },
            timeout=10.0,
        )
    if r.status_code >= 400:
        raise Exception(f"create_task failed: {r.text}")
    data = r.json()
    return data[0] if isinstance(data, list) else data


async def get_tasks_for_deliverable(deliverable_id: str) -> list[dict]:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{REST_URL}/tasks",
            headers=_rest_headers(),
            params={"deliverable_id": f"eq.{deliverable_id}", "order": "created_at.asc"},
            timeout=10.0,
        )
    return r.json() if r.status_code < 400 else []


async def get_task(task_id: str) -> Optional[dict]:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{REST_URL}/tasks",
            headers=_rest_headers(),
            params={"id": f"eq.{task_id}", "limit": "1"},
            timeout=10.0,
        )
    if r.status_code >= 400:
        return None
    data = r.json()
    return data[0] if data else None


async def update_task(task_id: str, body: dict) -> None:
    async with httpx.AsyncClient() as client:
        r = await client.patch(
            f"{REST_URL}/tasks",
            headers=_rest_headers(),
            params={"id": f"eq.{task_id}"},
            json=body,
            timeout=10.0,
        )
    if r.status_code >= 400:
        raise Exception(f"update_task failed: {r.text}")


async def delete_task(task_id: str) -> None:
    async with httpx.AsyncClient() as client:
        r = await client.delete(
            f"{REST_URL}/tasks",
            headers=_rest_headers(),
            params={"id": f"eq.{task_id}"},
            timeout=10.0,
        )
    if r.status_code >= 400:
        raise Exception(f"delete_task failed: {r.text}")


# ── usage_credits ────────────────────────────────────────────

async def update_byok(user_id: str, provider: str, encrypted_key: str) -> None:
    async with httpx.AsyncClient() as client:
        r = await client.patch(
            f"{REST_URL}/usage_credits",
            headers=_rest_headers(),
            params={"user_id": f"eq.{user_id}"},
            json={"byok_provider": provider, "byok_key_encrypted": encrypted_key},
            timeout=10.0,
        )
    if r.status_code >= 400:
        raise Exception(f"update_byok failed: {r.text}")
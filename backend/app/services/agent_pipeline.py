# ============================================================
# backend/app/services/agent_pipeline.py
# The core 8-stage build pipeline — runs as a background task
# ============================================================

import logging
from uuid import uuid4

from app.clients.supabase_client import (
    call_edge_function,
    update_job_status,
    create_agent,
)
from app.clients.realtime_client import broadcast_job_status
from app.utils.id_gen import (
    new_uuid,
    generate_embed_url,
    generate_api_endpoint,
    generate_api_key,
    hash_api_key,
)

logger      = logging.getLogger(__name__)
MAX_RETRIES = 3


async def run_build_pipeline(
    job_id:   str,
    user_id:  str,
    prompt:   str,
    provider: str = "openai",
) -> None:
    """
    Full 8-stage agent build pipeline. Called as a FastAPI background task.
    Returns job_id immediately to the user — this runs async in background.
    """
    agent_id = new_uuid()
    spec      = None
    config    = None
    retry     = 0

    try:
        # Stage 2: Prompt Generator (EF1)
        await _set_status(job_id, user_id, "generating_spec")

        ef1 = await call_edge_function(
            fn_name="prompt-generator",
            payload={"job_id": job_id, "user_id": user_id, "raw_prompt": prompt, "provider": provider},
            user_id=user_id,
            timeout=180.0,
        )

        if "error" in ef1:
            raise Exception(f"prompt-generator failed: {ef1['error']}")

        spec = ef1.get("spec")
        if not spec:
            raise Exception("prompt-generator returned no spec")

        logger.info(f"[pipeline] {job_id} spec generated: {spec.get('name')}")

        # Stages 3-6: Config → Runner → Reviewer → Retry loop
        fix_context = None

        while retry <= MAX_RETRIES:

            # Stage 3: Config Generator (EF2)
            await _set_status(job_id, user_id, "generating_config", {"retry_count": retry})

            ef2_payload: dict = {
                "job_id":   job_id,
                "user_id":  user_id,
                "agent_id": agent_id,
                "spec":     spec,
                "provider": provider,
            }
            if fix_context:
                ef2_payload["fix_context"] = fix_context

            ef2 = await call_edge_function(
                fn_name="config-generator",
                payload=ef2_payload,
                user_id=user_id,
                timeout=60.0,
            )

            if "error" in ef2:
                raise Exception(f"config-generator failed: {ef2['error']}")

            config      = ef2.get("config")
            config_path = ef2.get("config_path")

            if not config or not config_path:
                raise Exception("config-generator returned no config")

            logger.info(f"[pipeline] {job_id} config generated (retry={retry})")

            # Stage 4: Agent Runner (EF3)
            await _set_status(job_id, user_id, "running_sandbox", {"config_path": config_path})

            test_case = (config.get("test_cases") or [{}])[0]
            run_input = test_case.get("input", {})

            ef3 = await call_edge_function(
                fn_name="agent-runner",
                payload={
                    "job_id":  job_id,
                    "user_id": user_id,
                    "config":  config,
                    "input":   run_input,
                },
                user_id=user_id,
                timeout=120.0,
            )

            run_output  = ef3.get("output",      {})
            run_latency = ef3.get("latency_ms",  0)
            run_errors  = ef3.get("errors",      [])

            logger.info(f"[pipeline] {job_id} sandbox run done: latency={run_latency}ms")

            # Stage 5: Agent Reviewer (EF4)
            await _set_status(job_id, user_id, "reviewing")

            ef4 = await call_edge_function(
                fn_name="agent-reviewer",
                payload={
                    "job_id":     job_id,
                    "config":     config,
                    "test_case":  test_case,
                    "output":     run_output,
                    "latency_ms": run_latency,
                    "errors":     run_errors,
                },
                user_id=user_id,
                timeout=60.0,
            )

            passed        = ef4.get("pass",          False)
            score         = ef4.get("score",         0)
            suggested_fix = ef4.get("suggested_fix", None)
            issues        = ef4.get("issues",        [])

            logger.info(f"[pipeline] {job_id} review: pass={passed} score={score}")

            if passed:
                break  # Go to deploy

            retry += 1
            if retry > MAX_RETRIES:
                await _set_status(
                    job_id, user_id, "needs_review",
                    {
                        "failure_reason": (
                            f"Failed review after {MAX_RETRIES} retries. "
                            f"Last score: {score}. Issues: {'; '.join(issues)}"
                        ),
                        "retry_count": retry,
                    }
                )
                logger.warning(f"[pipeline] {job_id} needs_review after {MAX_RETRIES} retries")
                return

            fix_context = suggested_fix
            logger.info(f"[pipeline] {job_id} retrying with fix: {fix_context}")

        # Stage 7: Deploy
        raw_api_key  = generate_api_key()
        api_key_hash = hash_api_key(raw_api_key)
        embed_url    = generate_embed_url(agent_id)
        api_endpoint = generate_api_endpoint(agent_id)

        await create_agent(
            agent_id=agent_id,
            user_id=user_id,
            job_id=job_id,
            name=config.get("name", "Unnamed Agent"),
            description=config.get("description", ""),
            config_path=config_path,
            embed_url=embed_url,
            api_endpoint=api_endpoint,
            api_key_hash=api_key_hash,
        )

        await _set_status(job_id, user_id, "live", {"config_path": config_path, "retry_count": retry})

        await broadcast_job_status(job_id, "live", {
            "agent_id":     agent_id,
            "embed_url":    embed_url,
            "api_endpoint": api_endpoint,
            "api_key":      raw_api_key,  # shown once via Realtime
        })

        logger.info(f"[pipeline] {job_id} LIVE — agent_id={agent_id}")

    except Exception as exc:
        logger.error(f"[pipeline] {job_id} FAILED: {exc}", exc_info=True)
        await _set_status(job_id, user_id, "failed", {"failure_reason": str(exc)})
        await broadcast_job_status(job_id, "failed", {"error": str(exc)})


async def _set_status(
    job_id: str, user_id: str, status: str, extra: dict | None = None
) -> None:
    await update_job_status(job_id, status, extra)
    await broadcast_job_status(job_id, status, extra)
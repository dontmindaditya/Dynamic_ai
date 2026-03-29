// ============================================================
// supabase/functions/prompt-generator/index.ts
// EF1 — Converts raw user prompt → structured AgentSpec
// Performs: intent detection, tool selection, test case gen
// Called by FastAPI agent_pipeline.py as first pipeline stage
// ============================================================

import { corsResponse, corsError, CORS_HEADERS } from '../_shared/cors.ts'
import { callLLMForJSON, resolveProvider } from '../_shared/llm_client.ts'
import { updateJobStatus } from '../_shared/db_client.ts'
import { parseJSON } from '../_shared/validators.ts'
import { AuthError, PipelineError } from '../_shared/errors.ts'
import type { EF1Payload, EF1Response, AgentSpec } from '../_shared/types.ts'

const META_PROMPT = `You are an AI agent architect. The user wants to build an agent.

Return a JSON object with EXACTLY these fields:
- intent: one of [sales, support, research, data, creative, utility]
- name: short descriptive name (max 5 words)
- description: one sentence describing what the agent does
- recommended_tools: array of tools from [web_search, scrape_url, send_email, summarize, extract_data]
- system_prompt: detailed system prompt for the agent (2-4 sentences, specific and actionable)
- constraints: array of 2-4 behavioral constraints (e.g. "max 150 words", "no emojis")
- input_schema: JSON Schema object describing the agent's inputs. Each field: { type, description }
- output_schema: JSON Schema object describing expected outputs. Each field: { type, description }
- test_cases: array of 2-3 test cases, each with { input: {...}, expected_contains: ["key1", "key2"] }

Return ONLY valid JSON. No markdown fences, no explanation, no preamble.`

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  try {
    // Auth: x-user-id must be present (set by FastAPI, authorized via service role)
    const userId = req.headers.get('x-user-id')
    if (!userId) throw new AuthError('x-user-id header missing')

    const body = await req.json() as EF1Payload

    if (!body.job_id || !body.raw_prompt) {
      return corsError('job_id and raw_prompt are required', 400)
    }

    // Update job status to show we're working
    await updateJobStatus(body.job_id, 'generating_spec')

    // Determine which LLM to use — honour the caller's preference if provided
    const provider = resolveProvider(body.provider)

    // Call LLM with the meta-prompt
    const userPrompt = `The user wants to build an agent that does the following:\n\n${body.raw_prompt}`
    const rawJson = await callLLMForJSON(provider, META_PROMPT, userPrompt)

    // Parse and lightly validate the spec
    const spec = parseJSON<AgentSpec>(rawJson)

    if (!spec.intent || !spec.name || !spec.system_prompt) {
      return corsError('LLM returned incomplete spec — missing required fields', 500)
    }

    // Ensure arrays are arrays (LLMs sometimes return strings)
    if (!Array.isArray(spec.recommended_tools)) spec.recommended_tools = []
    if (!Array.isArray(spec.constraints))       spec.constraints = []
    if (!Array.isArray(spec.test_cases))        spec.test_cases = []

    // Update job with the spec and advance status
    await updateJobStatus(body.job_id, 'generating_config', {
      spec: spec as unknown as Record<string, unknown>,
    })

    const response: EF1Response = { spec }
    return corsResponse(response)

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[prompt-generator] Error:', message)

    if (err instanceof AuthError) {
      return corsError(message, 401)
    }

    return corsError(message, 500)
  }
})
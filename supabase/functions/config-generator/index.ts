// ============================================================
// supabase/functions/config-generator/index.ts
// EF2 — Converts AgentSpec → validated AgentConfig JSON
// Uploads config to Supabase Storage
// Accepts optional fix_context on retry (from reviewer's suggested_fix)
// ============================================================

import { corsResponse, corsError, CORS_HEADERS } from '../_shared/cors.ts'
import { callLLMForJSON, resolveProvider } from '../_shared/llm_client.ts'
import { validateAgentConfig, parseJSON } from '../_shared/validators.ts'
import { AuthError, ConfigValidationError } from '../_shared/errors.ts'
import type { EF2Payload, EF2Response, AgentConfig } from '../_shared/types.ts'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')     ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

async function updateJobStatus(jobId: string, status: string, extra?: Record<string, unknown>) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/agent_jobs?id=eq.${jobId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey':        SERVICE_ROLE_KEY,
        'Content-Type':  'application/json',
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify({ status, ...extra }),
    })
  } catch {
    // Non-fatal
  }
}

async function uploadConfig(userId: string, agentId: string, version: number, config: AgentConfig): Promise<string> {
  const filePath = `${userId}/${agentId}/v${version}/config.json`
  const fullPath = `agents/${filePath}`
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/agents/${filePath}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey':        SERVICE_ROLE_KEY,
        'Content-Type':  'application/json',
        'x-upsert':      'true',
      },
      body: JSON.stringify(config, null, 2),
    })
    if (!res.ok) {
      const text = await res.text()
      console.warn(`[config-generator] uploadConfig non-fatal: ${text}`)
    }
  } catch (err) {
    console.warn(`[config-generator] uploadConfig non-fatal:`, err)
  }
  return fullPath
}

const CONFIG_SYSTEM_PROMPT = `You are an AI agent config generator. Convert the provided agent spec into a final validated JSON config.

The config must have EXACTLY these fields:
- agent_id: use the provided agent_id
- version: use the provided version number
- name: from the spec
- description: from the spec
- intent: from the spec
- provider: use the provided provider ("openai" or "anthropic")
- system_prompt: from the spec (improve if needed for clarity)
- tools: array of tool names from the spec's recommended_tools
- input_schema: from the spec (object with field names as keys, each { type, description })
- output_schema: from the spec (object with field names as keys, each { type, description })
- constraints: array of strings from the spec
- max_steps: integer between 3 and 8 (choose based on task complexity)
- test_cases: array from the spec, each { input: {...}, expected_contains: ["key1", "key2"] }

Return ONLY valid JSON. No markdown fences, no explanation.`

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) throw new AuthError('x-user-id header missing')

    const body = await req.json() as EF2Payload

    if (!body.job_id || !body.agent_id || !body.spec) {
      return corsError('job_id, agent_id, and spec are required', 400)
    }

    const provider = resolveProvider(body.provider)

    // Build the user prompt — include fix_context if this is a retry
    let userPrompt = `Convert this agent spec to a final config JSON.

Agent ID: ${body.agent_id}
Version: 1
Provider: ${provider}

Spec:
${JSON.stringify(body.spec, null, 2)}`

    if (body.fix_context) {
      userPrompt += `\n\nIMPORTANT — This is a retry. The previous config failed review with this issue:\n${body.fix_context}\n\nFix these specific issues in the new config.`
    }

    const rawJson = await callLLMForJSON(provider, CONFIG_SYSTEM_PROMPT, userPrompt, body.api_key_override)

    // Parse and validate
    let config: AgentConfig
    try {
      const parsed = parseJSON<unknown>(rawJson)
      config = validateAgentConfig(parsed)
    } catch (err) {
      if (err instanceof ConfigValidationError) {
        return corsError(`Config validation failed: ${err.message}`, 422)
      }
      throw err
    }

    // Ensure agent_id and version are correctly set
    config.agent_id = body.agent_id
    config.version  = 1
    config.provider = provider

    // Upload to Supabase Storage
    const configPath = await uploadConfig(userId, body.agent_id, config.version, config)

    // Update job status
    await updateJobStatus(body.job_id, 'running_sandbox', {
      config_path: configPath,
    })

    const response: EF2Response = { config_path: configPath, config }
    return corsResponse(response)

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[config-generator] Error:', message)

    if (err instanceof AuthError) return corsError(message, 401)
    return corsError(message, 500)
  }
})
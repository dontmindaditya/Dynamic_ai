// ============================================================
// supabase/functions/agent-invoke/index.ts
// EF5 — Runs a deployed (live) agent on real user input.
// Called by FastAPI public_api.py (REST) and embed widget.
// Logs every invocation to agent_runs (immutable).
// ============================================================

import { corsResponse, corsError, CORS_HEADERS } from '../_shared/cors.ts'
import { AuthError } from '../_shared/errors.ts'
import type { EF5Payload, EF5Response } from '../_shared/types.ts'
import { callLLM } from '../_shared/llm_client.ts'
import { getToolDefinitions } from '../_shared/tool_definitions.ts'
import { executeTools } from '../_shared/tool_executor.ts'
import { parseJSON } from '../_shared/validators.ts'
import { MaxStepsError } from '../_shared/errors.ts'
import type { AgentConfig, Message, RunResult } from '../_shared/types.ts'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')              ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const REST_HEADERS = {
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'apikey':        SERVICE_ROLE_KEY,
  'Content-Type':  'application/json',
  'Prefer':        'return=minimal',
}

async function getAgent(agentId: string): Promise<Record<string, unknown> | null> {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/agents?id=eq.${agentId}&limit=1`,
    { headers: REST_HEADERS }
  )
  if (!r.ok) return null
  const data = await r.json()
  return data[0] ?? null
}

async function fetchConfig(configPath: string, agentRecord: Record<string, unknown>): Promise<AgentConfig> {
  // Prefer config stored directly in the agents table (avoids Storage dependency)
  if (agentRecord.config && typeof agentRecord.config === 'object') {
    return agentRecord.config as AgentConfig
  }

  // Fallback: fetch from Supabase Storage
  const filePath = configPath.startsWith('agents/') ? configPath.slice('agents/'.length) : configPath
  const r = await fetch(
    `${SUPABASE_URL}/storage/v1/object/agents/${filePath}`,
    { headers: { 'Authorization': `Bearer ${SERVICE_ROLE_KEY}`, 'apikey': SERVICE_ROLE_KEY } }
  )
  if (!r.ok) throw new Error(`fetchConfig failed for ${configPath}: ${await r.text()}`)
  return r.json()
}

async function insertAgentRun(params: {
  agentId: string; userId: string; input: Record<string, unknown>
  output?: Record<string, unknown>; messages?: unknown[]; stepsTaken: number
  latencyMs: number; tokensUsed: number; error?: string; source: string
}): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/agent_runs`, {
      method:  'POST',
      headers: REST_HEADERS,
      body: JSON.stringify({
        agent_id:    params.agentId,
        user_id:     params.userId,
        input:       params.input,
        output:      params.output      ?? null,
        messages:    params.messages    ?? null,
        steps_taken: params.stepsTaken,
        latency_ms:  params.latencyMs,
        tokens_used: params.tokensUsed,
        error:       params.error       ?? null,
        source:      params.source,
      }),
    })
  } catch {
    // Non-fatal — run logging should never crash the response
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  const startTime = Date.now()

  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) throw new AuthError('x-user-id header missing')

    const body = await req.json() as EF5Payload

    if (!body.agent_id || !body.input) {
      return corsError('agent_id and input are required', 400)
    }

    // Load agent record
    const agent = await getAgent(body.agent_id)
    if (!agent) {
      return corsError(`Agent ${body.agent_id} not found`, 404)
    }
    if (agent.status !== 'live') {
      return corsError(`Agent ${body.agent_id} is not live (status: ${agent.status})`, 403)
    }

    // Load config — prefers agent.config (DB), falls back to Storage
    const config = await fetchConfig(String(agent.config_path), agent)

    // Run the agent
    let result: RunResult
    let runError: string | undefined

    try {
      result = await runAgentForInvoke(config, body.input, body.api_key_override)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      runError = msg

      // Return a partial result on error — still log the run
      result = {
        output:      {},
        steps_taken: 0,
        latency_ms:  Date.now() - startTime,
        tokens_used: 0,
        messages:    [],
        errors:      [msg],
      }
    }

    // Log to agent_runs (immutable)
    await insertAgentRun({
      agentId:    body.agent_id,
      userId:     body.user_id,
      input:      body.input,
      output:     result.output,
      messages:   result.messages,
      stepsTaken: result.steps_taken,
      latencyMs:  result.latency_ms,
      tokensUsed: result.tokens_used,
      error:      runError,
      source:     body.source ?? 'api',
    })

    return corsResponse(result as EF5Response)

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[agent-invoke] Error:', message)

    if (err instanceof AuthError) return corsError(message, 401)
    return corsError(message, 500)
  }
})

// ── Runner (duplicated from EF3 to avoid network hop) ────────
// Any changes to the tool-calling loop must be mirrored here

async function runAgentForInvoke(
  config:          AgentConfig,
  input:           Record<string, unknown>,
  apiKeyOverride?: string,
): Promise<RunResult> {
  const startTime   = Date.now()
  const messages:   Message[] = []
  const errors:     string[]  = []
  let   stepCount   = 0
  let   totalTokens = 0

  const toolDefs = getToolDefinitions(config.tools)

  // Build initial user message
  const lines: string[] = []
  let matchedAny = false
  for (const [key] of Object.entries(config.input_schema)) {
    const value = input[key]
    if (value !== undefined) {
      lines.push(`${key}: ${String(value)}`)
      matchedAny = true
    }
  }
  // Fallback: playground sends { message: "..." } — map it to the first schema field
  if (!matchedAny && input.message !== undefined) {
    const firstKey = Object.keys(config.input_schema)[0]
    if (firstKey) lines.push(`${firstKey}: ${String(input.message)}`)
    else lines.push(String(input.message))
  }
  const outputKeys = Object.keys(config.output_schema)
  if (outputKeys.length) {
    lines.push(`\nReturn ONLY a JSON object with exactly these fields: ${outputKeys.join(', ')}. No extra fields, no explanation, no markdown.`)
  }
  if (config.constraints.length) {
    lines.push(`\nConstraints:\n${config.constraints.map((c) => `- ${c}`).join('\n')}`)
  }

  messages.push({ role: 'user', content: lines.join('\n') })

  while (stepCount < config.max_steps) {
    let llmResponse
    try {
      llmResponse = await callLLM({
        provider:         config.provider,
        system_prompt:    config.system_prompt,
        messages,
        tools:            toolDefs.length ? toolDefs : undefined,
        temperature:      0.3,
        api_key_override: apiKeyOverride,
      })
    } catch (err) {
      errors.push(`LLM error at step ${stepCount}: ${err instanceof Error ? err.message : String(err)}`)
      break
    }

    if (llmResponse.usage) totalTokens += llmResponse.usage.total_tokens

    if (llmResponse.type === 'tool_calls' && llmResponse.tool_calls?.length) {
      stepCount++
      messages.push({ role: 'assistant', content: '', tool_calls: llmResponse.tool_calls })

      const toolResults = await executeTools(llmResponse.tool_calls, config.provider)
      for (const r of toolResults) {
        if (r.error) errors.push(`Tool '${r.tool_name}': ${r.error}`)
        messages.push({ role: 'tool', content: r.output, tool_call_id: r.tool_call_id, tool_name: r.tool_name })
      }
      continue
    }

    if (llmResponse.type === 'final_answer' && llmResponse.content) {
      messages.push({ role: 'assistant', content: llmResponse.content })

      let output: Record<string, unknown> = {}
      try {
        const parsed = parseJSON<Record<string, unknown>>(llmResponse.content)
        // Strip keys not in output_schema — keeps output predictable for validators and UI
        const schemaKeys = Object.keys(config.output_schema)
        output = schemaKeys.length
          ? Object.fromEntries(schemaKeys.filter((k) => k in parsed).map((k) => [k, parsed[k]]))
          : parsed
        if (Object.keys(output).length === 0) output = parsed
      } catch {
        const firstKey = Object.keys(config.output_schema)[0] ?? 'result'
        output = { [firstKey]: llmResponse.content }
      }

      return { output, steps_taken: stepCount, latency_ms: Date.now() - startTime, tokens_used: totalTokens, messages, errors }
    }

    errors.push(`Unexpected response type at step ${stepCount}`)
    break
  }

  if (stepCount >= config.max_steps) throw new MaxStepsError(stepCount)

  return { output: {}, steps_taken: stepCount, latency_ms: Date.now() - startTime, tokens_used: totalTokens, messages, errors }
}

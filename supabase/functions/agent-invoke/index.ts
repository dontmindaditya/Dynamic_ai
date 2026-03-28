// ============================================================
// supabase/functions/agent-invoke/index.ts
// EF5 — Runs a deployed (live) agent on real user input.
// Called by FastAPI public_api.py (REST) and embed widget.
// Logs every invocation to agent_runs (immutable).
// ============================================================

import { corsResponse, corsError, CORS_HEADERS } from '../_shared/cors.ts'
import { getAgent, insertAgentRun } from '../_shared/db_client.ts'
import { fetchConfig } from '../_shared/storage_client.ts'
import { AuthError } from '../_shared/errors.ts'
import type { EF5Payload, EF5Response } from '../_shared/types.ts'

// Import runAgent logic — we inline the runner here rather than
// calling EF3, to avoid an extra network hop on every live invocation
import { callLLM } from '../_shared/llm_client.ts'
import { getToolDefinitions } from '../_shared/tool_definitions.ts'
import { executeTools } from '../_shared/tool_executor.ts'
import { parseJSON } from '../_shared/validators.ts'
import { MaxStepsError } from '../_shared/errors.ts'
import type { AgentConfig, Message, RunResult } from '../_shared/types.ts'

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

    // Load config from Storage
    const config = await fetchConfig(String(agent.config_path))

    // Run the agent
    let result: RunResult
    let runError: string | undefined

    try {
      result = await runAgentForInvoke(config, body.input)
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
  config: AgentConfig,
  input:  Record<string, unknown>
): Promise<RunResult> {
  const startTime   = Date.now()
  const messages:   Message[] = []
  const errors:     string[]  = []
  let   stepCount   = 0
  let   totalTokens = 0

  const toolDefs = getToolDefinitions(config.tools)

  // Build initial user message
  const lines: string[] = []
  for (const [key] of Object.entries(config.input_schema)) {
    const value = input[key]
    if (value !== undefined) lines.push(`${key}: ${String(value)}`)
  }
  const outputKeys = Object.keys(config.output_schema)
  if (outputKeys.length) {
    lines.push(`\nReturn your response as JSON with fields: ${outputKeys.join(', ')}`)
  }
  if (config.constraints.length) {
    lines.push(`\nConstraints:\n${config.constraints.map((c) => `- ${c}`).join('\n')}`)
  }

  messages.push({ role: 'user', content: lines.join('\n') })

  while (stepCount < config.max_steps) {
    let llmResponse
    try {
      llmResponse = await callLLM({
        provider:      config.provider,
        system_prompt: config.system_prompt,
        messages,
        tools:         toolDefs.length ? toolDefs : undefined,
        temperature:   0.3,
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
        output = parseJSON<Record<string, unknown>>(llmResponse.content)
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

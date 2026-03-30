// ============================================================
// supabase/functions/agent-runner/index.ts
// EF3 — The core engine. Generic tool-calling loop that
// interprets any AgentConfig. Does NOT execute arbitrary code.
// Fixed TypeScript program that reads config and drives an LLM.
// This is the highest-risk component — validate it first.
// ============================================================

import { corsResponse, corsError, CORS_HEADERS } from '../_shared/cors.ts'
import { callLLM } from '../_shared/llm_client.ts'
import { getToolDefinitions } from '../_shared/tool_definitions.ts'
import { executeTools } from '../_shared/tool_executor.ts'
import { parseJSON } from '../_shared/validators.ts'
import { MaxStepsError, AuthError } from '../_shared/errors.ts'
import type {
  EF3Payload,
  EF3Response,
  AgentConfig,
  Message,
  RunResult,
} from '../_shared/types.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) throw new AuthError('x-user-id header missing')

    const body = await req.json() as EF3Payload

    if (!body.config || !body.input) {
      return corsError('config and input are required', 400)
    }

    const result = await runAgent(body.config, body.input, body.api_key_override)
    return corsResponse(result as EF3Response)

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[agent-runner] Error:', message)

    if (err instanceof AuthError)   return corsError(message, 401)
    if (err instanceof MaxStepsError) {
      // Not a server error — return a structured partial result
      return corsResponse({
        output:      {},
        steps_taken: (err as MaxStepsError).steps_taken,
        latency_ms:  0,
        tokens_used: 0,
        messages:    [],
        errors:      [message],
      } as EF3Response, 200)
    }
    return corsError(message, 500)
  }
})

// ── Core loop ─────────────────────────────────────────────────

async function runAgent(
  config:           AgentConfig,
  input:            Record<string, unknown>,
  apiKeyOverride?:  string,
): Promise<RunResult> {
  const startTime  = Date.now()
  const messages:  Message[] = []
  const errors:    string[]  = []
  let   stepCount  = 0
  let   totalTokens = 0

  // Build the tool definitions for this config's tool list
  const toolDefs = getToolDefinitions(config.tools)

  // Build the initial user message from the input
  const userMessage = buildUserMessage(config, input)

  messages.push({
    role:    'user',
    content: userMessage,
  })

  // ── Tool-calling loop ────────────────────────────────────────
  while (stepCount < config.max_steps) {

    // Call the LLM
    let llmResponse
    try {
      llmResponse = await callLLM({
        provider:          config.provider,
        system_prompt:     config.system_prompt,
        messages,
        tools:             toolDefs.length ? toolDefs : undefined,
        temperature:       0.3,
        api_key_override:  apiKeyOverride,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`LLM call failed at step ${stepCount}: ${msg}`)
      break
    }

    if (llmResponse.usage) {
      totalTokens += llmResponse.usage.total_tokens
    }

    // ── Case 1: LLM wants to call tools ──────────────────────
    if (llmResponse.type === 'tool_calls' && llmResponse.tool_calls?.length) {
      stepCount++

      // Add assistant message with tool calls to history
      messages.push({
        role:       'assistant',
        content:    '',
        tool_calls: llmResponse.tool_calls,
      })

      // Execute all requested tools (in parallel)
      const toolResults = await executeTools(
        llmResponse.tool_calls,
        config.provider
      )

      // Add tool results to message history
      for (const result of toolResults) {
        if (result.error) {
          errors.push(`Tool '${result.tool_name}' error: ${result.error}`)
        }

        messages.push({
          role:         'tool',
          content:      result.output,
          tool_call_id: result.tool_call_id,
          tool_name:    result.tool_name,
        })
      }

      continue  // loop back — LLM will process tool results
    }

    // ── Case 2: LLM produced a final answer ──────────────────
    if (llmResponse.type === 'final_answer' && llmResponse.content) {
      messages.push({
        role:    'assistant',
        content: llmResponse.content,
      })

      // Parse the final answer — LLM should return JSON matching output_schema
      let output: Record<string, unknown> = {}
      try {
        output = parseJSON<Record<string, unknown>>(llmResponse.content)
      } catch {
        // If not JSON, wrap the text response
        // This handles cases where the agent returns plain text
        const firstOutputKey = Object.keys(config.output_schema)[0] ?? 'result'
        output = { [firstOutputKey]: llmResponse.content }
      }

      return {
        output,
        steps_taken: stepCount,
        latency_ms:  Date.now() - startTime,
        tokens_used: totalTokens,
        messages,
        errors,
      }
    }

    // ── Case 3: Unexpected response type ─────────────────────
    errors.push(`Unexpected LLM response type: ${llmResponse.type} at step ${stepCount}`)
    break
  }

  // Exited loop without a final answer — max steps hit
  if (stepCount >= config.max_steps) {
    throw new MaxStepsError(stepCount)
  }

  // Loop exited due to error
  return {
    output:      {},
    steps_taken: stepCount,
    latency_ms:  Date.now() - startTime,
    tokens_used: totalTokens,
    messages,
    errors,
  }
}

// ── Helpers ───────────────────────────────────────────────────

// Build the initial user message from the config's input_schema and actual input
function buildUserMessage(
  config: AgentConfig,
  input:  Record<string, unknown>
): string {
  const lines: string[] = []

  // Describe each input field
  for (const [key] of Object.entries(config.input_schema)) {
    const value = input[key]
    if (value !== undefined && value !== null) {
      lines.push(`${key}: ${String(value)}`)
    }
  }

  // Append output format instruction
  const outputKeys = Object.keys(config.output_schema)
  if (outputKeys.length) {
    lines.push(
      `\nReturn your response as a JSON object with these fields: ${outputKeys.join(', ')}`
    )
  }

  // Append constraints reminder
  if (config.constraints.length) {
    lines.push(`\nConstraints:\n${config.constraints.map((c) => `- ${c}`).join('\n')}`)
  }

  return lines.join('\n')
}

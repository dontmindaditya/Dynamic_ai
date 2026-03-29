// ============================================================
// supabase/functions/_shared/llm_client.ts
// Single interface for all LLM calls — routes to OpenAI or
// Anthropic based on config.provider. All callers (EF1-EF4)
// use this. Never call the LLM APIs directly from edge functions.
// ============================================================

import type { AgentConfig, LLMProvider, LLMResponse, Message } from './types.ts'
import type { ToolDefinition } from './tool_definitions.ts'
import { LLMError } from './errors.ts'
import {
  parseOpenAIResponse,
  buildOpenAIMessages,
} from './openai_adapter.ts'
import {
  parseAnthropicResponse,
  buildAnthropicMessages,
} from './anthropic_adapter.ts'

const OPENAI_API_URL    = 'https://api.openai.com/v1/chat/completions'
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const OPENAI_MODEL      = 'gpt-4o'
const ANTHROPIC_MODEL   = 'claude-sonnet-4-20250514'

// Options for a single LLM call
export interface LLMCallOptions {
  provider:      LLMProvider
  system_prompt: string
  messages:      Message[]
  tools?:        ToolDefinition[]   // pass undefined for non-tool calls (EF1, EF4)
  max_tokens?:   number
  temperature?:  number
  // BYOK: if provided, use this key instead of env var
  api_key_override?: string
}

// Main entry point — call once per loop iteration in EF3
export async function callLLM(opts: LLMCallOptions): Promise<LLMResponse> {
  if (opts.provider === 'openai') {
    return callOpenAI(opts)
  }
  return callAnthropic(opts)
}

// ── OpenAI ───────────────────────────────────────────────────

async function callOpenAI(opts: LLMCallOptions): Promise<LLMResponse> {
  const apiKey = opts.api_key_override ?? Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) throw new LLMError('openai', 'OPENAI_API_KEY not set')

  const body: Record<string, unknown> = {
    model:       OPENAI_MODEL,
    max_tokens:  opts.max_tokens  ?? 2000,
    temperature: opts.temperature ?? 0.3,
    messages: [
      { role: 'system', content: opts.system_prompt },
      ...buildOpenAIMessages(opts.messages),
    ],
  }

  if (opts.tools?.length) {
    body.tools       = opts.tools.map((t) => t.openai)
    body.tool_choice = 'auto'
  }

  const res = await fetch(OPENAI_API_URL, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new LLMError('openai', text, res.status)
  }

  const raw = await res.json()
  return parseOpenAIResponse(raw)
}

// ── Anthropic ────────────────────────────────────────────────

async function callAnthropic(opts: LLMCallOptions): Promise<LLMResponse> {
  const apiKey = opts.api_key_override ?? Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) throw new LLMError('anthropic', 'ANTHROPIC_API_KEY not set')

  const body: Record<string, unknown> = {
    model:       ANTHROPIC_MODEL,
    max_tokens:  opts.max_tokens  ?? 2000,
    temperature: opts.temperature ?? 0.3,
    system:      opts.system_prompt,
    messages:    buildAnthropicMessages(opts.messages),
  }

  if (opts.tools?.length) {
    body.tools = opts.tools.map((t) => t.anthropic)
  }

  const res = await fetch(ANTHROPIC_API_URL, {
    method:  'POST',
    headers: {
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type':      'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new LLMError('anthropic', text, res.status)
  }

  const raw = await res.json()
  return parseAnthropicResponse(raw)
}

// ── Simple text completion ────────────────────────────────────
// Used by EF1 (prompt generator) and EF4 (reviewer) — no tools,
// just a prompt → JSON string response

export async function callLLMForJSON(
  provider: LLMProvider,
  system_prompt: string,
  user_prompt: string,
  api_key_override?: string
): Promise<string> {
  const response = await callLLM({
    provider,
    system_prompt,
    messages: [{ role: 'user', content: user_prompt }],
    max_tokens:  2000,
    temperature: 0.1,    // low temp for structured JSON output
    api_key_override,
  })

  if (response.type !== 'final_answer' || !response.content) {
    throw new LLMError(provider, 'Expected final_answer but got tool_calls in JSON call')
  }

  return response.content
}

// ── Determine provider from config or fallback ───────────────
// If no config available (e.g. EF1 before config exists),
// check which API keys are available and pick accordingly

export function resolveProvider(
  preferredProvider?: LLMProvider,
  byokProvider?: LLMProvider
): LLMProvider {
  if (byokProvider) return byokProvider
  if (preferredProvider) return preferredProvider

  // Fallback: prefer Anthropic, then OpenAI
  if (Deno.env.get('ANTHROPIC_API_KEY')) return 'anthropic'
  if (Deno.env.get('OPENAI_API_KEY'))    return 'openai'

  throw new LLMError('unknown', 'No LLM API key configured (OPENAI_API_KEY or ANTHROPIC_API_KEY)')
}
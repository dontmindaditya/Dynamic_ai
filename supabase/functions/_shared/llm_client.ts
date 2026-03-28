import { LLMError } from './errors.ts'
import type { CallLLMInput, LLMResponse, Message, TokenUsage, ToolCall } from './types.ts'

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini'
const DEFAULT_ANTHROPIC_MODEL = 'claude-3-5-haiku-latest'

function toOpenAIMessage(message: Message): Record<string, unknown> {
  if (message.role === 'tool') {
    return {
      role: 'tool',
      content: message.content,
      tool_call_id: message.tool_call_id,
    }
  }

  const payload: Record<string, unknown> = {
    role: message.role,
    content: message.content,
  }

  if (message.role === 'assistant' && message.tool_calls?.length) {
    payload.tool_calls = message.tool_calls.map((toolCall) => ({
      id: toolCall.id,
      type: 'function',
      function: {
        name: toolCall.name,
        arguments: JSON.stringify(toolCall.arguments ?? {}),
      },
    }))
  }

  return payload
}

function normalizeUsage(usage: Record<string, unknown> | undefined): TokenUsage | undefined {
  if (!usage) return undefined

  const input = typeof usage.prompt_tokens === 'number'
    ? usage.prompt_tokens
    : typeof usage.input_tokens === 'number'
      ? usage.input_tokens
      : 0

  const output = typeof usage.completion_tokens === 'number'
    ? usage.completion_tokens
    : typeof usage.output_tokens === 'number'
      ? usage.output_tokens
      : 0

  const total = typeof usage.total_tokens === 'number'
    ? usage.total_tokens
    : input + output

  return {
    input_tokens: input,
    output_tokens: output,
    total_tokens: total,
  }
}

function parseToolCalls(rawToolCalls: Array<Record<string, unknown>>): ToolCall[] {
  return rawToolCalls.flatMap((toolCall) => {
    const id = typeof toolCall.id === 'string' ? toolCall.id : crypto.randomUUID()
    const fn = toolCall.function

    if (!fn || typeof fn !== 'object') return []

    const functionCall = fn as { name?: unknown; arguments?: unknown }
    const name = typeof functionCall.name === 'string' ? functionCall.name : undefined
    const rawArgs = typeof functionCall.arguments === 'string' ? functionCall.arguments : '{}'

    if (!name) return []

    let parsedArgs: Record<string, unknown> = {}
    try {
      const maybeObject = JSON.parse(rawArgs)
      if (maybeObject && typeof maybeObject === 'object' && !Array.isArray(maybeObject)) {
        parsedArgs = maybeObject as Record<string, unknown>
      }
    } catch {
      parsedArgs = {}
    }

    return [{
      id,
      name,
      arguments: parsedArgs,
    }]
  })
}

async function callOpenAI(input: CallLLMInput): Promise<LLMResponse> {
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) {
    throw new LLMError('OPENAI_API_KEY is not configured')
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: input.model ?? DEFAULT_OPENAI_MODEL,
      temperature: input.temperature ?? 0.3,
      messages: [
        { role: 'system', content: input.system_prompt },
        ...input.messages.map(toOpenAIMessage),
      ],
      tools: input.tools,
      tool_choice: input.tools?.length ? 'auto' : undefined,
      response_format: { type: 'json_object' },
    }),
  })

  const payload = await response.json()
  if (!response.ok) {
    const message = typeof payload?.error?.message === 'string'
      ? payload.error.message
      : `OpenAI request failed with status ${response.status}`
    throw new LLMError(message, response.status)
  }

  const choice = payload?.choices?.[0]?.message
  if (!choice) {
    throw new LLMError('OpenAI response did not include a message')
  }

  const usage = normalizeUsage(payload.usage)
  const toolCalls = Array.isArray(choice.tool_calls)
    ? parseToolCalls(choice.tool_calls as Array<Record<string, unknown>>)
    : []

  if (toolCalls.length) {
    return {
      type: 'tool_calls',
      content: '',
      tool_calls: toolCalls,
      usage,
    }
  }

  return {
    type: 'final_answer',
    content: typeof choice.content === 'string' ? choice.content : JSON.stringify(choice.content ?? {}),
    usage,
  }
}

async function callAnthropic(input: CallLLMInput): Promise<LLMResponse> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    throw new LLMError('ANTHROPIC_API_KEY is not configured')
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: input.model ?? DEFAULT_ANTHROPIC_MODEL,
      system: input.system_prompt,
      max_tokens: 1024,
      temperature: input.temperature ?? 0.3,
      messages: input.messages
        .filter((message) => message.role !== 'tool')
        .map((message) => ({
          role: message.role === 'assistant' ? 'assistant' : 'user',
          content: message.content,
        })),
    }),
  })

  const payload = await response.json()
  if (!response.ok) {
    const message = typeof payload?.error?.message === 'string'
      ? payload.error.message
      : `Anthropic request failed with status ${response.status}`
    throw new LLMError(message, response.status)
  }

  const text = Array.isArray(payload.content)
    ? payload.content
        .filter((item: Record<string, unknown>) => item.type === 'text')
        .map((item: Record<string, unknown>) => String(item.text ?? ''))
        .join('\n')
    : ''

  return {
    type: 'final_answer',
    content: text,
    usage: normalizeUsage(payload.usage),
  }
}

export async function callLLM(input: CallLLMInput): Promise<LLMResponse> {
  const provider = input.provider.toLowerCase()

  if (provider === 'openai') {
    return callOpenAI(input)
  }

  if (provider === 'anthropic') {
    return callAnthropic(input)
  }

  throw new LLMError(`Unsupported provider: ${input.provider}`)
}

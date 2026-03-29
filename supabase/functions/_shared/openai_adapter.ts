// ============================================================
// supabase/functions/_shared/openai_adapter.ts
// Converts OpenAI API response format → internal types
// OpenAI uses: message.tool_calls[] with function.name + arguments (string)
// ============================================================

import type { LLMResponse, ToolCall, Message } from './types.ts'
import { LLMError } from './errors.ts'

// Shape of an OpenAI chat completion response
interface OpenAIMessage {
  role:         string
  content:      string | null
  tool_calls?:  OpenAIToolCall[]
}

interface OpenAIToolCall {
  id:       string
  type:     'function'
  function: {
    name:      string
    arguments: string    // JSON string — must be parsed
  }
}

interface OpenAIUsage {
  prompt_tokens:     number
  completion_tokens: number
  total_tokens:      number
}

interface OpenAIResponse {
  choices: Array<{
    message:       OpenAIMessage
    finish_reason: string
  }>
  usage?: OpenAIUsage
}

// Parse raw OpenAI API JSON → normalized LLMResponse
export function parseOpenAIResponse(raw: OpenAIResponse): LLMResponse {
  const choice = raw.choices?.[0]
  if (!choice) {
    throw new LLMError('openai', 'No choices in response')
  }

  const message = choice.message

  // LLM wants to call tools
  if (choice.finish_reason === 'tool_calls' && message.tool_calls?.length) {
    const tool_calls: ToolCall[] = message.tool_calls.map((tc) => {
      let args: Record<string, unknown> = {}
      try {
        args = JSON.parse(tc.function.arguments)
      } catch {
        // malformed JSON arguments — pass empty, tool_executor will handle
        args = {}
      }
      return {
        id:        tc.id,
        tool_name: tc.function.name as ToolCall['tool_name'],
        arguments: args,
      }
    })

    return {
      type:       'tool_calls',
      tool_calls,
      usage:      raw.usage,
    }
  }

  // LLM produced a final answer
  if (message.content) {
    return {
      type:    'final_answer',
      content: message.content,
      usage:   raw.usage,
    }
  }

  throw new LLMError('openai', `Unexpected finish_reason: ${choice.finish_reason}`)
}

// Build the messages array in OpenAI format for the next LLM call
// Converts internal Message[] → OpenAI messages array
export function buildOpenAIMessages(messages: Message[]): unknown[] {
  return messages.map((msg) => {
    if (msg.role === 'tool') {
      return {
        role:         'tool',
        content:      msg.content,
        tool_call_id: msg.tool_call_id,
      }
    }

    if (msg.role === 'assistant' && msg.tool_calls?.length) {
      return {
        role:       'assistant',
        content:    msg.content ?? null,
        tool_calls: msg.tool_calls.map((tc) => ({
          id:   tc.id,
          type: 'function',
          function: {
            name:      tc.tool_name,
            arguments: JSON.stringify(tc.arguments),
          },
        })),
      }
    }

    return {
      role:    msg.role,
      content: msg.content,
    }
  })
}
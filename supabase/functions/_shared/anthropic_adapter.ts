// ============================================================
// supabase/functions/_shared/anthropic_adapter.ts
// Converts Anthropic API response format → internal types
// Anthropic uses: content[] blocks with type: 'tool_use' | 'text'
// ============================================================

import type { LLMResponse, ToolCall, Message } from './types.ts'
import { LLMError } from './errors.ts'

// Shape of Anthropic message response content blocks
interface AnthropicTextBlock {
  type:  'text'
  text:  string
}

interface AnthropicToolUseBlock {
  type:  'tool_use'
  id:    string
  name:  string
  input: Record<string, unknown>    // already parsed object, not a string
}

type AnthropicContentBlock = AnthropicTextBlock | AnthropicToolUseBlock

interface AnthropicUsage {
  input_tokens:  number
  output_tokens: number
}

interface AnthropicResponse {
  id:           string
  type:         string
  role:         string
  content:      AnthropicContentBlock[]
  stop_reason:  'end_turn' | 'tool_use' | 'max_tokens' | string
  usage:        AnthropicUsage
}

// Parse raw Anthropic API JSON → normalized LLMResponse
export function parseAnthropicResponse(raw: AnthropicResponse): LLMResponse {
  if (!raw.content?.length) {
    throw new LLMError('anthropic', 'Empty content in response')
  }

  const usage = {
    prompt_tokens:     raw.usage?.input_tokens  ?? 0,
    completion_tokens: raw.usage?.output_tokens ?? 0,
    total_tokens:      (raw.usage?.input_tokens ?? 0) + (raw.usage?.output_tokens ?? 0),
  }

  // LLM wants to call tools
  if (raw.stop_reason === 'tool_use') {
    const toolBlocks = raw.content.filter(
      (b): b is AnthropicToolUseBlock => b.type === 'tool_use'
    )

    if (!toolBlocks.length) {
      throw new LLMError('anthropic', 'stop_reason is tool_use but no tool_use blocks found')
    }

    const tool_calls: ToolCall[] = toolBlocks.map((block) => ({
      id:        block.id,
      tool_name: block.name as ToolCall['tool_name'],
      arguments: block.input,
    }))

    return { type: 'tool_calls', tool_calls, usage }
  }

  // LLM produced a final answer
  if (raw.stop_reason === 'end_turn') {
    const textBlock = raw.content.find(
      (b): b is AnthropicTextBlock => b.type === 'text'
    )

    if (!textBlock) {
      throw new LLMError('anthropic', 'end_turn but no text block found')
    }

    return { type: 'final_answer', content: textBlock.text, usage }
  }

  throw new LLMError('anthropic', `Unexpected stop_reason: ${raw.stop_reason}`)
}

// Build the messages array in Anthropic format for the next LLM call
// Converts internal Message[] → Anthropic messages array
// NOTE: Anthropic doesn't accept system messages in the messages array —
// system prompt is passed separately as a top-level parameter
export function buildAnthropicMessages(messages: Message[]): unknown[] {
  const result: unknown[] = []

  for (const msg of messages) {
    if (msg.role === 'system') continue  // handled separately

    if (msg.role === 'tool') {
      // Anthropic tool results go inside a user message as tool_result blocks
      result.push({
        role:    'user',
        content: [
          {
            type:        'tool_result',
            tool_use_id: msg.tool_call_id,
            content:     msg.content,
          },
        ],
      })
      continue
    }

    if (msg.role === 'assistant' && msg.tool_calls?.length) {
      // Assistant message with tool use: include both text (if any) and tool_use blocks
      const content: unknown[] = []

      if (msg.content) {
        content.push({ type: 'text', text: msg.content })
      }

      for (const tc of msg.tool_calls) {
        content.push({
          type:  'tool_use',
          id:    tc.id,
          name:  tc.tool_name,
          input: tc.arguments,
        })
      }

      result.push({ role: 'assistant', content })
      continue
    }

    result.push({ role: msg.role, content: msg.content })
  }

  return result
}
import type { Provider, ToolCall, ToolResult } from './types.ts'

export async function executeTools(toolCalls: ToolCall[], _provider: Provider): Promise<ToolResult[]> {
  return toolCalls.map((toolCall) => ({
    tool_call_id: toolCall.id,
    tool_name: toolCall.name,
    output: JSON.stringify({
      ok: false,
      error: `Tool '${toolCall.name}' is not implemented in this Edge Function runtime.`,
    }),
    error: `Tool '${toolCall.name}' is not implemented in this Edge Function runtime.`,
  }))
}

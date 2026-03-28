import type { ToolConfig } from './types.ts'

export function getToolDefinitions(tools: ToolConfig[] = []): Array<Record<string, unknown>> {
  return tools
    .filter((tool) => Boolean(tool?.name))
    .map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description ?? '',
        parameters: tool.parameters ?? {
          type: 'object',
          properties: {},
          additionalProperties: true,
        },
      },
    }))
}

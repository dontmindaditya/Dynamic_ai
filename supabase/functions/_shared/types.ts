export type Provider = 'openai' | 'anthropic' | string

export type JsonSchemaField = {
  type?: string
  description?: string
  enum?: string[]
  items?: Record<string, unknown>
  properties?: Record<string, unknown>
  required?: string[]
}

export type ToolConfig = {
  name: string
  description?: string
  parameters?: Record<string, unknown>
}

export type AgentConfig = {
  agent_id?: string
  version?: number
  name?: string
  description?: string
  intent?: string
  provider: Provider
  model?: string
  system_prompt: string
  tools: ToolConfig[]
  input_schema: Record<string, JsonSchemaField>
  output_schema: Record<string, JsonSchemaField>
  constraints: string[]
  max_steps: number
  test_cases?: Array<Record<string, unknown>>
}

export type ToolCall = {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export type ToolResult = {
  tool_call_id: string
  tool_name: string
  output: string
  error?: string
}

export type Message = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: ToolCall[]
  tool_call_id?: string
  tool_name?: string
}

export type TokenUsage = {
  input_tokens?: number
  output_tokens?: number
  total_tokens: number
}

export type LLMResponse =
  | {
      type: 'tool_calls'
      content: ''
      tool_calls: ToolCall[]
      usage?: TokenUsage
    }
  | {
      type: 'final_answer'
      content: string
      usage?: TokenUsage
    }

export type CallLLMInput = {
  provider: Provider
  system_prompt: string
  messages: Message[]
  tools?: Array<Record<string, unknown>>
  temperature?: number
  model?: string
}

export type RunResult = {
  output: Record<string, unknown>
  steps_taken: number
  latency_ms: number
  tokens_used: number
  messages: Message[]
  errors: string[]
}

export type EF3Payload = {
  job_id?: string
  user_id?: string
  config: AgentConfig
  input: Record<string, unknown>
}

export type EF3Response = RunResult

export type EF5Payload = {
  agent_id: string
  user_id?: string
  input: Record<string, unknown>
  source?: string
}

export type EF5Response = RunResult

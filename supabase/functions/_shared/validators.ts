// ============================================================
// supabase/functions/_shared/validators.ts
// Validates AgentConfig and agent output against schemas.
// Catches malformed configs before they reach EF3, saving
// retries that would fail at the runner stage instead.
// ============================================================

import type { AgentConfig, ToolName, IntentCategory } from './types.ts'
import { ConfigValidationError } from './errors.ts'

const VALID_INTENTS: IntentCategory[] = [
  'sales', 'support', 'research', 'data', 'creative', 'utility',
]

const VALID_TOOLS: ToolName[] = [
  'web_search', 'scrape_url', 'summarize', 'extract_data', 'send_email',
]

const MAX_STEPS_LIMIT = 10

// Validate a full AgentConfig object
// Throws ConfigValidationError on the first invalid field
export function validateAgentConfig(config: unknown): AgentConfig {
  if (!config || typeof config !== 'object') {
    throw new ConfigValidationError('Config must be a non-null object')
  }

  const c = config as Record<string, unknown>

  // Required string fields
  for (const field of ['agent_id', 'name', 'description', 'system_prompt'] as const) {
    if (!c[field] || typeof c[field] !== 'string') {
      throw new ConfigValidationError(`Field '${field}' must be a non-empty string`, field)
    }
  }

  // intent
  if (!VALID_INTENTS.includes(c.intent as IntentCategory)) {
    throw new ConfigValidationError(
      `Field 'intent' must be one of: ${VALID_INTENTS.join(', ')}`,
      'intent'
    )
  }

  // provider
  if (c.provider !== 'openai' && c.provider !== 'anthropic') {
    throw new ConfigValidationError(
      `Field 'provider' must be 'openai' or 'anthropic'`,
      'provider'
    )
  }

  // version
  if (typeof c.version !== 'number' || c.version < 1) {
    throw new ConfigValidationError(`Field 'version' must be a positive number`, 'version')
  }

  // tools
  if (!Array.isArray(c.tools) || c.tools.length === 0) {
    throw new ConfigValidationError(`Field 'tools' must be a non-empty array`, 'tools')
  }

  const invalidTools = (c.tools as string[]).filter(
    (t) => !VALID_TOOLS.includes(t as ToolName)
  )
  if (invalidTools.length) {
    throw new ConfigValidationError(
      `Unknown tools: ${invalidTools.join(', ')}. Valid tools: ${VALID_TOOLS.join(', ')}`,
      'tools'
    )
  }

  // max_steps
  if (
    typeof c.max_steps !== 'number' ||
    c.max_steps < 1 ||
    c.max_steps > MAX_STEPS_LIMIT
  ) {
    throw new ConfigValidationError(
      `Field 'max_steps' must be between 1 and ${MAX_STEPS_LIMIT}`,
      'max_steps'
    )
  }

  // input_schema
  if (!c.input_schema || typeof c.input_schema !== 'object') {
    throw new ConfigValidationError(`Field 'input_schema' must be an object`, 'input_schema')
  }

  // output_schema
  if (!c.output_schema || typeof c.output_schema !== 'object') {
    throw new ConfigValidationError(`Field 'output_schema' must be an object`, 'output_schema')
  }

  // constraints
  if (!Array.isArray(c.constraints)) {
    throw new ConfigValidationError(`Field 'constraints' must be an array`, 'constraints')
  }

  // test_cases
  if (!Array.isArray(c.test_cases) || c.test_cases.length === 0) {
    throw new ConfigValidationError(
      `Field 'test_cases' must be a non-empty array with at least one test case`,
      'test_cases'
    )
  }

  for (let i = 0; i < (c.test_cases as unknown[]).length; i++) {
    const tc = (c.test_cases as Record<string, unknown>[])[i]
    if (!tc.input || typeof tc.input !== 'object') {
      throw new ConfigValidationError(`test_cases[${i}].input must be an object`, 'test_cases')
    }
    if (!Array.isArray(tc.expected_contains)) {
      throw new ConfigValidationError(
        `test_cases[${i}].expected_contains must be an array`,
        'test_cases'
      )
    }
  }

  return c as unknown as AgentConfig
}

// Validate that agent output contains all required keys
// from the output_schema and test case expected_contains
export function validateOutput(
  output:           unknown,
  outputSchema:     Record<string, unknown>,
  expectedContains: string[]
): { valid: boolean; missingKeys: string[] } {
  if (!output || typeof output !== 'object') {
    return { valid: false, missingKeys: expectedContains }
  }

  const outputObj = output as Record<string, unknown>

  // Check all expected_contains keys exist
  const missingFromExpected = expectedContains.filter(
    (key) => !(key in outputObj)
  )

  // Check all output_schema keys exist
  const schemaKeys = Object.keys(outputSchema)
  const missingFromSchema = schemaKeys.filter(
    (key) => !(key in outputObj)
  )

  const missingKeys = [...new Set([...missingFromExpected, ...missingFromSchema])]

  return {
    valid:       missingKeys.length === 0,
    missingKeys,
  }
}

// Strip JSON markdown fences from LLM output before parsing
// LLMs often wrap JSON in ```json ... ``` even when told not to
export function stripJsonFences(text: string): string {
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/,      '')
    .replace(/\s*```$/,      '')
    .trim()
}

// Safe JSON parse with fence stripping
export function parseJSON<T = unknown>(text: string): T {
  const clean = stripJsonFences(text)
  try {
    return JSON.parse(clean) as T
  } catch (err) {
    throw new ConfigValidationError(
      `Failed to parse JSON: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}
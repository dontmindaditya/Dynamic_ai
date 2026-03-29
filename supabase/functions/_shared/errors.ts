// ============================================================
// supabase/functions/_shared/errors.ts
// Typed error classes — lets agent_pipeline.py distinguish
// recoverable failures (retry) from hard stops (abort)
// ============================================================

// Base class — all pipeline errors extend this
export class PipelineError extends Error {
  public readonly code: string
  public readonly retryable: boolean

  constructor(message: string, code: string, retryable = false) {
    super(message)
    this.name = 'PipelineError'
    this.code = code
    this.retryable = retryable
  }
}

// EF4 returned pass: false — retry with suggested_fix
export class ReviewFailError extends PipelineError {
  public readonly suggested_fix: string | null
  public readonly score: number

  constructor(suggested_fix: string | null, score: number) {
    super(
      `Agent reviewer failed with score ${score}. Fix: ${suggested_fix ?? 'none'}`,
      'REVIEW_FAIL',
      true  // retryable — FastAPI will inject suggested_fix and try again
    )
    this.name = 'ReviewFailError'
    this.suggested_fix = suggested_fix
    this.score = score
  }
}

// EF3 hit config.max_steps without a final answer
export class MaxStepsError extends PipelineError {
  public readonly steps_taken: number

  constructor(steps_taken: number) {
    super(
      `Agent exceeded max steps (${steps_taken} steps taken)`,
      'MAX_STEPS_EXCEEDED',
      false  // not retryable — config needs a higher max_steps or better prompt
    )
    this.name = 'MaxStepsError'
    this.steps_taken = steps_taken
  }
}

// LLM API call failed (rate limit, timeout, bad response)
export class LLMError extends PipelineError {
  public readonly provider: string
  public readonly status?: number

  constructor(provider: string, message: string, status?: number) {
    super(
      `LLM error from ${provider}: ${message}`,
      'LLM_ERROR',
      true  // retryable — transient API errors
    )
    this.name = 'LLMError'
    this.provider = provider
    this.status = status
  }
}

// Config JSON failed schema validation in EF2
export class ConfigValidationError extends PipelineError {
  public readonly field?: string

  constructor(message: string, field?: string) {
    super(
      `Config validation failed${field ? ` on field '${field}'` : ''}: ${message}`,
      'CONFIG_VALIDATION_ERROR',
      false  // not retryable without a fix
    )
    this.name = 'ConfigValidationError'
    this.field = field
  }
}

// Tool execution failed (network error, bad URL, etc.)
export class ToolExecutionError extends PipelineError {
  public readonly tool_name: string

  constructor(tool_name: string, message: string) {
    super(
      `Tool '${tool_name}' failed: ${message}`,
      'TOOL_EXECUTION_ERROR',
      false  // runner catches this and continues loop with error in messages
    )
    this.name = 'ToolExecutionError'
    this.tool_name = tool_name
  }
}

// Supabase DB or Storage operation failed
export class StorageError extends PipelineError {
  constructor(message: string) {
    super(message, 'STORAGE_ERROR', true)
    this.name = 'StorageError'
  }
}

// User not found or unauthorized
export class AuthError extends PipelineError {
  constructor(message = 'Unauthorized') {
    super(message, 'AUTH_ERROR', false)
    this.name = 'AuthError'
  }
}
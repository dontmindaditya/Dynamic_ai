// ============================================================
// supabase/functions/agent-reviewer/index.ts
// EF4 — Scores agent output. Always returns the same JSON
// contract. Pass threshold: score >= 75 AND accuracy >= 70
// AND format >= 80. Returns suggested_fix on failure.
// ============================================================

import { corsResponse, corsError, CORS_HEADERS } from '../_shared/cors.ts'
import { callLLMForJSON, resolveProvider } from '../_shared/llm_client.ts'
import { parseJSON } from '../_shared/validators.ts'
import { AuthError } from '../_shared/errors.ts'
import type { EF4Payload, EF4Response, ReviewResult, ReviewMetrics } from '../_shared/types.ts'

const PASS_THRESHOLD = {
  score:    75,
  accuracy: 70,
  format:   80,
}

const REVIEWER_SYSTEM_PROMPT = `You are a strict AI agent quality reviewer. Evaluate agent output objectively.

Score each metric 0-100:
- accuracy: does the output match the expected shape and contain all required fields?
- latency: is response time acceptable? Under 5000ms = 100, under 10000ms = 70, over 10000ms = 30
- format: does the output conform to the output_schema with correct types?
- constraint_adherence: does the output follow ALL constraints listed in the config?

Pass conditions: score >= 75 AND accuracy >= 70 AND format >= 80

Return ONLY this exact JSON structure. No markdown, no explanation:
{
  "pass": true or false,
  "score": weighted average (accuracy*0.4 + latency*0.2 + format*0.25 + constraint_adherence*0.15),
  "metrics": { "accuracy": n, "latency": n, "format": n, "constraint_adherence": n },
  "issues": ["description of each problem found"],
  "suggested_fix": "specific config change to fix the issues, or null if passing"
}`

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) throw new AuthError('x-user-id header missing')

    const body = await req.json() as EF4Payload

    if (!body.config || !body.test_case || body.output === undefined) {
      return corsError('config, test_case, and output are required', 400)
    }

    const provider = resolveProvider(body.config.provider)

    const userPrompt = buildReviewPrompt(body)
    const rawJson = await callLLMForJSON(provider, REVIEWER_SYSTEM_PROMPT, userPrompt)

    let review: ReviewResult
    try {
      review = parseJSON<ReviewResult>(rawJson)
    } catch {
      // If LLM returned malformed JSON, create a fail result
      review = buildFailResult('Reviewer LLM returned malformed JSON', rawJson)
    }

    // Enforce pass threshold ourselves — don't trust the LLM's own pass/fail
    review.pass = enforcePassThreshold(review.metrics, review.score)

    // Ensure suggested_fix is null when passing
    if (review.pass) {
      review.suggested_fix = null
    }

    const response: EF4Response = review
    return corsResponse(response)

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[agent-reviewer] Error:', message)

    if (err instanceof AuthError) return corsError(message, 401)
    return corsError(message, 500)
  }
})

// ── Helpers ───────────────────────────────────────────────────

function buildReviewPrompt(body: EF4Payload): string {
  return `Evaluate this agent output:

=== Agent Config ===
Name: ${body.config.name}
Intent: ${body.config.intent}
System Prompt: ${body.config.system_prompt}
Constraints: ${body.config.constraints.join(', ') || 'none'}
Output Schema: ${JSON.stringify(body.config.output_schema)}

=== Test Case ===
Input: ${JSON.stringify(body.test_case.input)}
Expected output keys: ${body.test_case.expected_contains.join(', ')}

=== Actual Output ===
${JSON.stringify(body.output, null, 2)}

=== Performance ===
Latency: ${body.latency_ms}ms
Errors: ${body.errors.length ? body.errors.join('; ') : 'none'}`
}

function enforcePassThreshold(metrics: ReviewMetrics, score: number): boolean {
  return (
    score              >= PASS_THRESHOLD.score    &&
    metrics.accuracy   >= PASS_THRESHOLD.accuracy &&
    metrics.format     >= PASS_THRESHOLD.format
  )
}

function buildFailResult(reason: string, rawResponse: string): ReviewResult {
  return {
    pass:   false,
    score:  0,
    metrics: {
      accuracy:             0,
      latency:              0,
      format:               0,
      constraint_adherence: 0,
    },
    issues:        [reason, `Raw response: ${rawResponse.slice(0, 200)}`],
    suggested_fix: 'Reviewer failed to parse output. Check system_prompt and output_schema clarity.',
  }
}
import { corsResponse, corsError, CORS_HEADERS } from '../_shared/cors.ts'
import { callLLMForJSON, resolveProvider } from '../_shared/llm_client.ts'
import { parseJSON } from '../_shared/validators.ts'
import { AuthError } from '../_shared/errors.ts'
import type { EF1Payload, EF1Response, AgentSpec } from '../_shared/types.ts'

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const META_PROMPT = `You are an AI agent architect. The user wants to build an agent.

Return a JSON object with EXACTLY these fields:
- intent: one of [sales, support, research, data, creative, utility]
- name: short descriptive name (max 5 words)
- description: one sentence describing what the agent does
- recommended_tools: array of tools from [web_search, scrape_url, send_email, summarize, extract_data]
- system_prompt: detailed system prompt for the agent (2-4 sentences, specific and actionable)
- constraints: array of 2-4 behavioral constraints (e.g. "max 150 words", "no emojis")
- input_schema: JSON Schema object describing the agent inputs. Each field: { type, description }
- output_schema: JSON Schema object describing expected outputs. Each field: { type, description }
- test_cases: array of 2-3 test cases, each with { input: {...}, expected_contains: ["key1", "key2"] }

Return ONLY valid JSON. No markdown fences, no explanation, no preamble.`

const DELIVERABLE_META_PROMPT = `You are an AI agent architect. You are building a deliverable agent with a specific role.

The agent's system_prompt MUST use this exact template structure:

"You are a {owner_role}.

Your mission is to deliver: {title}

You own all tasks under deliverable {deliverable_id}. When new tasks are created
under this deliverable, you are responsible for:
- Breaking them down into actionable subtasks
- Producing the work output (drafts, analysis, plans, frameworks)
- Flagging blockers or dependencies on other deliverables
- Reporting progress

Stay in character as a {owner_role}. Your decisions, language, and
priorities should reflect that expertise."

Fill in the placeholders with the provided values. Do NOT change the structure.

Return a JSON object with EXACTLY these fields:
- intent: one of [sales, support, research, data, creative, utility]
- name: short descriptive name based on the role and title (max 5 words)
- description: one sentence describing what this deliverable agent does
- recommended_tools: array of tools from [web_search, scrape_url, send_email, summarize, extract_data]
- system_prompt: the filled-in template above (replace all {placeholders})
- constraints: array of 2-4 behavioral constraints appropriate for this role
- input_schema: JSON Schema — at minimum include "task" (string) and "context" (string) fields
- output_schema: JSON Schema — at minimum include "output" (string), "subtasks" (array), "blockers" (array) fields
- test_cases: array of 2 test cases appropriate for this role and deliverable

Return ONLY valid JSON. No markdown fences, no explanation, no preamble.`

async function updateJobStatus(jobId: string, status: string, extra?: Record<string, unknown>) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/agent_jobs?id=eq.${jobId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ status, ...extra }),
    })
  } catch {
    // Non-fatal — don't crash the function if status update fails
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) throw new AuthError('x-user-id header missing')

    const body = await req.json() as EF1Payload

    if (!body.job_id || !body.raw_prompt) {
      return corsError('job_id and raw_prompt are required', 400)
    }

    await updateJobStatus(body.job_id, 'generating_spec')

    const provider = resolveProvider(body.provider)

    const isDeliverable = !!(body.owner_role && body.title)
    const systemPrompt  = isDeliverable ? DELIVERABLE_META_PROMPT : META_PROMPT
    const userPrompt    = isDeliverable
      ? `Build a deliverable agent with these details:
Owner Role: ${body.owner_role}
Title: ${body.title}
Deliverable ID: ${body.deliverable_id ?? 'N/A'}
Additional context: ${body.raw_prompt}`
      : `The user wants to build an agent that does the following:\n\n${body.raw_prompt}`

    const rawJson = await callLLMForJSON(provider, systemPrompt, userPrompt, body.api_key_override)
    const spec       = parseJSON<AgentSpec>(rawJson)

    if (!spec.intent || !spec.name || !spec.system_prompt) {
      return corsError('LLM returned incomplete spec', 500)
    }

    if (!Array.isArray(spec.recommended_tools)) spec.recommended_tools = []
    if (!Array.isArray(spec.constraints))       spec.constraints = []
    if (!Array.isArray(spec.test_cases))        spec.test_cases = []

    await updateJobStatus(body.job_id, 'generating_config', {
      spec: spec as unknown as Record<string, unknown>,
    })

    const response: EF1Response = { spec }
    return corsResponse(response)

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[prompt-generator] Error:', message)
    if (err instanceof AuthError) return corsError(message, 401)
    return corsError(message, 500)
  }
})
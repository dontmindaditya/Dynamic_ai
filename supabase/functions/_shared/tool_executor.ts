// ============================================================
// supabase/functions/_shared/tool_executor.ts
// Executes whitelisted tools. Only tools implemented here
// can ever run — no arbitrary code injection possible.
// web_search is mocked for Week 1. Replace with real search
// API (Serper/Brave/Tavily) in Week 2.
// ============================================================

import type { ToolCall, ToolResult, ToolName } from './types.ts'
import { ToolExecutionError } from './errors.ts'
import { callLLMForJSON } from './llm_client.ts'
import type { LLMProvider } from './types.ts'

// Execute a single tool call and return its result
export async function executeTool(
  toolCall: ToolCall,
  provider: LLMProvider,
  apiKeyOverride?: string
): Promise<ToolResult> {
  try {
    const output = await dispatch(toolCall, provider, apiKeyOverride)
    return {
      tool_call_id: toolCall.id,
      tool_name:    toolCall.tool_name,
      output,
    }
  } catch (err) {
    // Tool errors don't crash the loop — they're returned as error results
    // EF3 appends them to messages and the LLM decides what to do next
    const message = err instanceof Error ? err.message : String(err)
    return {
      tool_call_id: toolCall.id,
      tool_name:    toolCall.tool_name,
      output:       `Error: ${message}`,
      error:        message,
    }
  }
}

// Execute all tool calls in parallel (LLM may request multiple at once)
export async function executeTools(
  toolCalls: ToolCall[],
  provider: LLMProvider,
  apiKeyOverride?: string
): Promise<ToolResult[]> {
  return Promise.all(
    toolCalls.map((tc) => executeTool(tc, provider, apiKeyOverride))
  )
}

// ── Dispatcher ───────────────────────────────────────────────

async function dispatch(
  toolCall: ToolCall,
  provider: LLMProvider,
  apiKeyOverride?: string
): Promise<string> {
  const args = toolCall.arguments

  switch (toolCall.tool_name as ToolName) {
    case 'web_search':
      return webSearch(String(args.query ?? ''))

    case 'scrape_url':
      return scrapeUrl(String(args.url ?? ''))

    case 'summarize':
      return summarize(
        String(args.text ?? ''),
        Number(args.max_sentences ?? 5),
        provider,
        apiKeyOverride
      )

    case 'extract_data':
      return extractData(
        String(args.text ?? ''),
        args.schema as Record<string, unknown>,
        provider,
        apiKeyOverride
      )

    case 'send_email':
      return sendEmail(
        String(args.to      ?? ''),
        String(args.subject ?? ''),
        String(args.body    ?? ''),
        args.cc ? String(args.cc) : undefined
      )

    default:
      throw new ToolExecutionError(
        toolCall.tool_name,
        `Unknown tool: ${toolCall.tool_name}. Only whitelisted tools are allowed.`
      )
  }
}

// ── Tool Implementations ─────────────────────────────────────

// MOCK — Week 1 placeholder. Replace with Serper/Brave/Tavily in Week 2.
async function webSearch(query: string): Promise<string> {
  if (!query.trim()) {
    throw new ToolExecutionError('web_search', 'Query cannot be empty')
  }

  // TODO Week 2: Replace with real search API
  // const SERPER_KEY = Deno.env.get('SERPER_API_KEY')
  // const res = await fetch('https://google.serper.dev/search', {
  //   method: 'POST',
  //   headers: { 'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ q: query, num: 5 }),
  // })
  // const data = await res.json()
  // return data.organic.slice(0, 5).map(r => `${r.title}\n${r.snippet}\n${r.link}`).join('\n\n')

  return [
    `[MOCK SEARCH RESULTS for: "${query}"]`,
    `Result 1: Example result about ${query}. This is a placeholder for Week 1 development.`,
    `Result 2: Another example result about ${query}.`,
    `Result 3: Third result with information about ${query}.`,
    `Note: Replace webSearch() in tool_executor.ts with a real search API in Week 2.`,
  ].join('\n\n')
}

async function scrapeUrl(url: string): Promise<string> {
  if (!url.trim()) {
    throw new ToolExecutionError('scrape_url', 'URL cannot be empty')
  }

  // Validate URL format
  try {
    new URL(url)
  } catch {
    throw new ToolExecutionError('scrape_url', `Invalid URL: ${url}`)
  }

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'FairQuantaBot/1.0 (AI Agent; +https://fairquanta.ai)',
    },
    signal: AbortSignal.timeout(10_000),   // 10s timeout
  })

  if (!res.ok) {
    throw new ToolExecutionError('scrape_url', `HTTP ${res.status} fetching ${url}`)
  }

  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('text')) {
    throw new ToolExecutionError('scrape_url', `Non-text content type: ${contentType}`)
  }

  const html = await res.text()

  // Strip HTML tags — basic extraction, good enough for most pages
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2000)

  return text || `No readable text content found at ${url}`
}

async function summarize(
  text: string,
  maxSentences: number,
  provider: LLMProvider,
  apiKeyOverride?: string
): Promise<string> {
  if (!text.trim()) {
    throw new ToolExecutionError('summarize', 'Text cannot be empty')
  }

  const result = await callLLMForJSON(
    provider,
    `Summarize the provided text in ${maxSentences} sentences or fewer. Return only the summary text, no JSON wrapping.`,
    text.slice(0, 8000),   // cap input to avoid token overflow
    apiKeyOverride
  )

  return result
}

async function extractData(
  text: string,
  schema: Record<string, unknown>,
  provider: LLMProvider,
  apiKeyOverride?: string
): Promise<string> {
  if (!text.trim()) {
    throw new ToolExecutionError('extract_data', 'Text cannot be empty')
  }

  const result = await callLLMForJSON(
    provider,
    `Extract structured data from the provided text according to this JSON schema: ${JSON.stringify(schema)}. Return ONLY valid JSON matching the schema. No markdown, no explanation.`,
    text.slice(0, 8000),
    apiKeyOverride
  )

  // Validate the output is valid JSON
  try {
    JSON.parse(result.replace(/```json\n?|```/g, '').trim())
  } catch {
    throw new ToolExecutionError('extract_data', 'LLM returned invalid JSON for extraction')
  }

  return result
}

function sendEmail(
  to: string,
  subject: string,
  body: string,
  cc?: string
): Promise<string> {
  // Returns a draft object — does NOT actually send
  const draft = {
    draft: true,
    to,
    subject,
    body,
    ...(cc ? { cc } : {}),
    note: 'This is a draft. Send via your own email system.',
  }
  return Promise.resolve(JSON.stringify(draft, null, 2))
}
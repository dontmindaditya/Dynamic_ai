// ============================================================
// frontend/lib/api.ts
// Typed fetch wrappers for all Agent Factory endpoints
// All calls go through FastAPI — never directly to Supabase
// ============================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

// ── Auth helper ───────────────────────────────────────────────
// Gets the JWT from wherever your existing auth stores it
// Adjust this to match your existing auth implementation
function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const token = localStorage.getItem("token") ?? sessionStorage.getItem("token")
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
      ...(options.headers ?? {}),
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail ?? `Request failed: ${res.status}`)
  }

  return res.json()
}

// ── Types ─────────────────────────────────────────────────────

export interface BuildResponse {
  job_id:  string
  status:  string
  message: string
}

export interface JobStatus {
  job_id:         string
  status:         string
  prompt:         string
  retry_count:    number
  failure_reason: string | null
  config_path:    string | null
  created_at:     string
  updated_at:     string
  agent_id:       string | null
  embed_url:      string | null
  api_endpoint:   string | null
}

export interface Agent {
  id:           string
  name:         string
  description:  string | null
  status:       string
  version:      number
  embed_url:    string | null
  api_endpoint: string | null
  created_at:   string
  updated_at:   string
}

export interface RunLog {
  id:          string
  input:       Record<string, unknown>
  output:      Record<string, unknown> | null
  steps_taken: number
  latency_ms:  number | null
  tokens_used: number
  error:       string | null
  source:      string
  created_at:  string
}

export interface InvokeResponse {
  output:      Record<string, unknown>
  steps_taken: number
  latency_ms:  number
  tokens_used: number
  errors:      string[]
}

export interface Credits {
  credits_used:      number
  credits_remaining: number
  byok_provider:     string | null
  has_byok:          boolean
}

// ── API calls ─────────────────────────────────────────────────

export const api = {
  // Start a build
  buildAgent: (prompt: string, provider = "openai") =>
    apiFetch<BuildResponse>("/agents/build", {
      method: "POST",
      body:   JSON.stringify({ prompt, provider }),
    }),

  // Poll job status
  getJob: (jobId: string) =>
    apiFetch<JobStatus>(`/agents/jobs/${jobId}`),

  // List all user agents
  listAgents: () =>
    apiFetch<{ agents: Agent[]; total: number }>("/agents"),

  // Get single agent
  getAgent: (agentId: string) =>
    apiFetch<Agent>(`/agents/${agentId}`),

  // Delete agent
  deleteAgent: (agentId: string) =>
    apiFetch<{ message: string }>(`/agents/${agentId}`, { method: "DELETE" }),

  // Get run logs
  getRuns: (agentId: string, limit = 20, offset = 0) =>
    apiFetch<{ runs: RunLog[]; total: number }>(
      `/agents/${agentId}/runs?limit=${limit}&offset=${offset}`
    ),

  // Invoke agent from playground (uses session auth, not API key)
  invokeAgent: (agentId: string, message: string) =>
    apiFetch<InvokeResponse>(`/agents/${agentId}/run`, {
      method: "POST",
      body:   JSON.stringify({ message }),
    }),

  // Credits
  getCredits: () =>
    apiFetch<Credits>("/credits"),

  setBYOK: (provider: string, api_key: string) =>
    apiFetch<{ message: string; provider: string }>("/credits/byok", {
      method: "POST",
      body:   JSON.stringify({ provider, api_key }),
    }),
}
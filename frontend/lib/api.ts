// ============================================================
// frontend/lib/api.ts
// Typed fetch wrappers for all Agent Factory endpoints
// All calls go through FastAPI — never directly to Supabase
// ============================================================

import { supabase } from "@/lib/supabase"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

// ── Auth helper ───────────────────────────────────────────────
// Reads the access token from the active Supabase Auth session
async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return {}
  return { Authorization: `Bearer ${session.access_token}` }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(await getAuthHeader()),
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

export interface Project {
  id:          string
  name:        string
  description: string | null
  status:      string
  created_at:  string
  updated_at:  string
}

export interface Deliverable {
  id:          string
  project_id:  string
  agent_id:    string | null
  title:       string
  description: string | null
  owner_role:  string | null
  status:      string
  created_at:  string
  updated_at:  string
}

export interface Task {
  id:             string
  deliverable_id: string
  title:          string
  description:    string | null
  status:         "pending" | "processing" | "done" | "blocked"
  priority:       "low" | "normal" | "high"
  output:         Record<string, unknown> | null
  blockers:       string[] | null
  parent_task_id: string | null
  created_at:     string
  updated_at:     string
}

// ── API calls ─────────────────────────────────────────────────

export const api = {
  // Start a build
  buildAgent: (
    prompt: string,
    provider = "openai",
    opts?: { owner_role?: string; title?: string; deliverable_id?: string }
  ) =>
    apiFetch<BuildResponse>("/agents/build", {
      method: "POST",
      body:   JSON.stringify({ prompt, provider, ...opts }),
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

  // ── Projects ──────────────────────────────────────────────
  createProject: (name: string, description?: string) =>
    apiFetch<Project>("/projects", { method: "POST", body: JSON.stringify({ name, description }) }),

  listProjects: () =>
    apiFetch<{ projects: Project[]; total: number }>("/projects"),

  getProject: (id: string) =>
    apiFetch<Project>(`/projects/${id}`),

  updateProject: (id: string, patch: Partial<Pick<Project, "name" | "description" | "status">>) =>
    apiFetch<Project>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),

  deleteProject: (id: string) =>
    apiFetch<{ message: string }>(`/projects/${id}`, { method: "DELETE" }),

  // ── Deliverables ──────────────────────────────────────────
  createDeliverable: (projectId: string, body: { title: string; description?: string; owner_role?: string; agent_id?: string }) =>
    apiFetch<Deliverable>(`/projects/${projectId}/deliverables`, { method: "POST", body: JSON.stringify(body) }),

  listDeliverables: (projectId: string) =>
    apiFetch<{ deliverables: Deliverable[]; total: number }>(`/projects/${projectId}/deliverables`),

  getDeliverable: (projectId: string, deliverableId: string) =>
    apiFetch<Deliverable>(`/projects/${projectId}/deliverables/${deliverableId}`),

  updateDeliverable: (projectId: string, deliverableId: string, patch: Partial<Pick<Deliverable, "title" | "description" | "owner_role" | "agent_id" | "status">>) =>
    apiFetch<Deliverable>(`/projects/${projectId}/deliverables/${deliverableId}`, { method: "PATCH", body: JSON.stringify(patch) }),

  deleteDeliverable: (projectId: string, deliverableId: string) =>
    apiFetch<{ message: string }>(`/projects/${projectId}/deliverables/${deliverableId}`, { method: "DELETE" }),

  // ── Tasks ─────────────────────────────────────────────────
  createTask: (deliverableId: string, body: { title: string; description?: string; priority?: string }) =>
    apiFetch<Task>(`/deliverables/${deliverableId}/tasks`, { method: "POST", body: JSON.stringify(body) }),

  listTasks: (deliverableId: string) =>
    apiFetch<{ tasks: Task[]; total: number }>(`/deliverables/${deliverableId}/tasks`),

  getTask: (deliverableId: string, taskId: string) =>
    apiFetch<Task>(`/deliverables/${deliverableId}/tasks/${taskId}`),

  updateTask: (deliverableId: string, taskId: string, patch: Partial<Pick<Task, "title" | "description" | "priority" | "status">>) =>
    apiFetch<Task>(`/deliverables/${deliverableId}/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(patch) }),

  deleteTask: (deliverableId: string, taskId: string) =>
    apiFetch<{ message: string }>(`/deliverables/${deliverableId}/tasks/${taskId}`, { method: "DELETE" }),

  retryTask: (deliverableId: string, taskId: string) =>
    apiFetch<Task>(`/deliverables/${deliverableId}/tasks/${taskId}/retry`, { method: "POST" }),
}
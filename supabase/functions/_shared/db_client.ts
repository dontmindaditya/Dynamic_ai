// ============================================================
// supabase/functions/_shared/db_client.ts
// Supabase client + all DB read/write helpers used by edge fns
// Uses service role key — all writes are scoped by user_id
// in application logic, not RLS (FastAPI owns auth)
// ============================================================

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { JobStatus, AgentConfig } from './types.ts'
import { StorageError } from './errors.ts'

// Initialize once per edge function invocation
let _client: SupabaseClient | null = null

export function getDB(): SupabaseClient {
  if (_client) return _client

  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!url || !key) {
    throw new StorageError('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set')
  }

  _client = createClient(url, key, {
    auth: { persistSession: false },
  })

  return _client
}

// ── agent_jobs ───────────────────────────────────────────────

export async function createJob(
  jobId: string,
  userId: string,
  prompt: string
): Promise<void> {
  const { error } = await getDB()
    .from('agent_jobs')
    .insert({
      id:      jobId,
      user_id: userId,
      prompt,
      status:  'queued',
    })

  if (error) throw new StorageError(`createJob failed: ${error.message}`)
}

export async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  extra?: Partial<{
    spec:           Record<string, unknown>
    config_path:    string
    retry_count:    number
    failure_reason: string
  }>
): Promise<void> {
  const { error } = await getDB()
    .from('agent_jobs')
    .update({ status, ...extra })
    .eq('id', jobId)

  if (error) throw new StorageError(`updateJobStatus failed: ${error.message}`)
}

export async function getJob(jobId: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await getDB()
    .from('agent_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (error) return null
  return data
}

// ── agents ───────────────────────────────────────────────────

export async function createAgent(params: {
  agentId:     string
  userId:      string
  jobId:       string
  name:        string
  description: string
  configPath:  string
  embedUrl:    string
  apiEndpoint: string
  apiKey:      string
}): Promise<void> {
  const { error } = await getDB()
    .from('agents')
    .insert({
      id:           params.agentId,
      user_id:      params.userId,
      job_id:       params.jobId,
      name:         params.name,
      description:  params.description,
      version:      1,
      config_path:  params.configPath,
      status:       'live',
      embed_url:    params.embedUrl,
      api_endpoint: params.apiEndpoint,
      api_key:      params.apiKey,
    })

  if (error) throw new StorageError(`createAgent failed: ${error.message}`)
}

export async function getAgent(agentId: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await getDB()
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .single()

  if (error) return null
  return data
}

export async function getAgentByApiKey(
  apiKeyHash: string
): Promise<Record<string, unknown> | null> {
  const { data, error } = await getDB()
    .from('agents')
    .select('*')
    .eq('api_key', apiKeyHash)
    .eq('status', 'live')
    .single()

  if (error) return null
  return data
}

// ── agent_versions ───────────────────────────────────────────

export async function insertAgentVersion(
  agentId:    string,
  userId:     string,
  version:    number,
  configPath: string
): Promise<void> {
  const { error } = await getDB()
    .from('agent_versions')
    .insert({ agent_id: agentId, user_id: userId, version, config_path: configPath })

  if (error) throw new StorageError(`insertAgentVersion failed: ${error.message}`)
}

// ── agent_runs ───────────────────────────────────────────────
// Runs are immutable — insert only, never update or delete

export async function insertAgentRun(params: {
  agentId:    string
  userId:     string
  input:      Record<string, unknown>
  output?:    Record<string, unknown>
  messages?:  unknown[]
  stepsTaken: number
  latencyMs:  number
  tokensUsed: number
  error?:     string
  source:     'playground' | 'embed' | 'api'
}): Promise<string> {
  const { data, error } = await getDB()
    .from('agent_runs')
    .insert({
      agent_id:    params.agentId,
      user_id:     params.userId,
      input:       params.input,
      output:      params.output    ?? null,
      messages:    params.messages  ?? null,
      steps_taken: params.stepsTaken,
      latency_ms:  params.latencyMs,
      tokens_used: params.tokensUsed,
      error:       params.error     ?? null,
      source:      params.source,
    })
    .select('id')
    .single()

  if (error) throw new StorageError(`insertAgentRun failed: ${error.message}`)
  return data.id
}

// ── usage_credits ────────────────────────────────────────────

export async function getCredits(userId: string): Promise<{
  credits_used:       number
  credits_remaining:  number
  byok_provider:      string | null
  byok_key_encrypted: string | null
} | null> {
  const { data, error } = await getDB()
    .from('usage_credits')
    .select('credits_used, credits_remaining, byok_provider, byok_key_encrypted')
    .eq('user_id', userId)
    .single()

  if (error) return null
  return data
}

export async function deductCredits(
  userId:      string,
  tokensUsed:  number,
  creditCost:  number   // calculated by credits_service
): Promise<void> {
  const { error } = await getDB()
    .rpc('deduct_credits', {
      p_user_id:     userId,
      p_tokens_used: tokensUsed,
      p_credit_cost: creditCost,
    })

  if (error) throw new StorageError(`deductCredits failed: ${error.message}`)
}

export async function ensureCreditsRow(userId: string): Promise<void> {
  // Insert a credits row if one doesn't exist (upsert with no-op on conflict)
  const { error } = await getDB()
    .from('usage_credits')
    .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true })

  if (error) throw new StorageError(`ensureCreditsRow failed: ${error.message}`)
}
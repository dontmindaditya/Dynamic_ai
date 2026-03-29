// ============================================================
// supabase/functions/_shared/storage_client.ts
// Upload and fetch agent config.json from Supabase Storage
// Path convention: agents/{userId}/{agentId}/v{n}/config.json
// ============================================================

import { getDB } from './db_client.ts'
import type { AgentConfig } from './types.ts'
import { StorageError } from './errors.ts'

const BUCKET = 'agents'

// Build the canonical storage path for a config version
export function buildConfigPath(
  userId:   string,
  agentId:  string,
  version:  number
): string {
  return `agents/${userId}/${agentId}/v${version}/config.json`
}

// Upload a config object to Supabase Storage
// Returns the storage path
export async function uploadConfig(
  userId:  string,
  agentId: string,
  version: number,
  config:  AgentConfig
): Promise<string> {
  const path = buildConfigPath(userId, agentId, version)
  const body = JSON.stringify(config, null, 2)

  const { error } = await getDB()
    .storage
    .from(BUCKET)
    .upload(path, body, {
      contentType: 'application/json',
      upsert:      true,    // overwrite if exists (e.g. retried config gen)
    })

  if (error) {
    throw new StorageError(`uploadConfig failed for ${path}: ${error.message}`)
  }

  return path
}

// Download and parse a config from Supabase Storage
export async function fetchConfig(configPath: string): Promise<AgentConfig> {
  const { data, error } = await getDB()
    .storage
    .from(BUCKET)
    .download(configPath)

  if (error) {
    throw new StorageError(`fetchConfig failed for ${configPath}: ${error.message}`)
  }

  const text = await data.text()

  try {
    return JSON.parse(text) as AgentConfig
  } catch {
    throw new StorageError(`fetchConfig: invalid JSON at ${configPath}`)
  }
}

// Delete all versions of an agent's config (used when agent is deleted)
export async function deleteAgentConfigs(
  userId:  string,
  agentId: string
): Promise<void> {
  // List all files under agents/{userId}/{agentId}/
  const prefix = `agents/${userId}/${agentId}/`

  const { data: files, error: listError } = await getDB()
    .storage
    .from(BUCKET)
    .list(prefix, { limit: 100 })

  if (listError) {
    throw new StorageError(`deleteAgentConfigs list failed: ${listError.message}`)
  }

  if (!files?.length) return

  const paths = files.map((f) => `${prefix}${f.name}`)

  const { error: deleteError } = await getDB()
    .storage
    .from(BUCKET)
    .remove(paths)

  if (deleteError) {
    throw new StorageError(`deleteAgentConfigs delete failed: ${deleteError.message}`)
  }
}

// Get a public-like URL for a config (for debugging — not exposed to users)
export function getConfigStoragePath(
  userId:  string,
  agentId: string,
  version: number
): string {
  return buildConfigPath(userId, agentId, version)
}
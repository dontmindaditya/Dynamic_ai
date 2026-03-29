-- ============================================================
-- 002_storage_buckets.sql
-- Fairquanta AI Agent Factory — Supabase Storage setup
-- Run this after 001_agent_factory_schema.sql
-- ============================================================

-- Create the 'agents' bucket (private — never public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'agents',
  'agents',
  false,                          -- private bucket, no public URLs
  52428800,                       -- 50MB max per file (configs are tiny, headroom for future)
  ARRAY['application/json']       -- only JSON config files allowed
)
ON CONFLICT (id) DO NOTHING;

-- ── Storage access policy ────────────────────────────────────
-- All access is via service role key from FastAPI/Edge Functions only.
-- No anon or authenticated-role access needed since we use service role.
-- These policies are defensive — service role bypasses RLS anyway.

CREATE POLICY "service_role_all_agents_storage"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'agents')
WITH CHECK (bucket_id = 'agents');

-- Path convention enforced in application code (not DB):
-- agents/{userId}/{agentId}/v{n}/config.json
-- Example: agents/usr_abc123/agt_xyz789/v1/config.json
--
-- Version history is additive — old versions are never deleted,
-- only new paths are written. storage_client.ts handles this.
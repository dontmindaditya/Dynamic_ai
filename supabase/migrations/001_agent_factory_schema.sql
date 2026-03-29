-- ============================================================
-- 001_agent_factory_schema.sql
-- Fairquanta AI Agent Factory — core tables
-- user_id is a plain UUID from existing Fairquanta PostgreSQL
-- NO Supabase Auth foreign keys anywhere
-- ============================================================

-- ── agent_jobs ───────────────────────────────────────────────
-- Tracks every build pipeline job from queued → live
CREATE TABLE IF NOT EXISTS agent_jobs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'queued',
  -- status values: queued | generating_spec | generating_config |
  --                running_sandbox | reviewing | live | needs_review | failed
  prompt           TEXT        NOT NULL,
  spec             JSONB,                        -- output of EF1
  config_path      TEXT,                         -- Storage path to config.json
  retry_count      INT         NOT NULL DEFAULT 0,
  failure_reason   TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_jobs_user_id  ON agent_jobs(user_id);
CREATE INDEX idx_agent_jobs_status   ON agent_jobs(status);
CREATE INDEX idx_agent_jobs_created  ON agent_jobs(created_at DESC);

-- ── agents ───────────────────────────────────────────────────
-- Registry of all deployed (and draft) agents
CREATE TABLE IF NOT EXISTS agents (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL,
  job_id           UUID        REFERENCES agent_jobs(id) ON DELETE SET NULL,
  name             TEXT        NOT NULL,
  description      TEXT,
  version          INT         NOT NULL DEFAULT 1,
  config_path      TEXT        NOT NULL,         -- Storage path to current config.json
  status           TEXT        NOT NULL DEFAULT 'draft',
  -- status values: draft | live | paused | archived
  embed_url        TEXT,                         -- https://fairquanta.ai/embed/{id}
  api_endpoint     TEXT,                         -- /v1/agents/{id}/run
  api_key          TEXT,                         -- fq_live_xxxxxxxxxxxx (hashed)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agents_user_id  ON agents(user_id);
CREATE INDEX idx_agents_status   ON agents(status);
CREATE INDEX idx_agents_job_id   ON agents(job_id);

-- ── agent_versions ───────────────────────────────────────────
-- Immutable version history for each agent
CREATE TABLE IF NOT EXISTS agent_versions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id         UUID        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  user_id          UUID        NOT NULL,
  version          INT         NOT NULL,
  config_path      TEXT        NOT NULL,         -- Storage path to this version's config.json
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agent_id, version)
);

CREATE INDEX idx_agent_versions_agent_id ON agent_versions(agent_id);

-- ── agent_runs ───────────────────────────────────────────────
-- Immutable log of every agent invocation — never deleted
CREATE TABLE IF NOT EXISTS agent_runs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id         UUID        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  user_id          UUID        NOT NULL,
  input            JSONB       NOT NULL,
  output           JSONB,
  messages         JSONB,                        -- full message trace for playground
  steps_taken      INT         NOT NULL DEFAULT 0,
  latency_ms       INT,
  tokens_used      INT         NOT NULL DEFAULT 0,
  error            TEXT,
  source           TEXT        NOT NULL DEFAULT 'playground',
  -- source values: playground | embed | api
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- NOTE: no updated_at — runs are immutable after creation
);

CREATE INDEX idx_agent_runs_agent_id   ON agent_runs(agent_id);
CREATE INDEX idx_agent_runs_user_id    ON agent_runs(user_id);
CREATE INDEX idx_agent_runs_created    ON agent_runs(created_at DESC);

-- ── usage_credits ────────────────────────────────────────────
-- Token usage and billing tracking, one row per user
CREATE TABLE IF NOT EXISTS usage_credits (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        UNIQUE NOT NULL,
  credits_used        INT         NOT NULL DEFAULT 0,
  credits_remaining   INT         NOT NULL DEFAULT 100,  -- 100 free on signup
  byok_provider       TEXT,                              -- 'openai' | 'anthropic' | NULL
  byok_key_encrypted  TEXT,                              -- AES-256 encrypted, NULL if using credits
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usage_credits_user_id ON usage_credits(user_id);

-- ── updated_at auto-trigger ──────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_agent_jobs_updated_at
  BEFORE UPDATE ON agent_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_usage_credits_updated_at
  BEFORE UPDATE ON usage_credits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS — disabled entirely ──────────────────────────────────
-- FastAPI is the sole auth authority. All DB access goes through
-- the service role key on the server. Never expose to frontend.
ALTER TABLE agent_jobs      DISABLE ROW LEVEL SECURITY;
ALTER TABLE agents          DISABLE ROW LEVEL SECURITY;
ALTER TABLE agent_versions  DISABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs      DISABLE ROW LEVEL SECURITY;
ALTER TABLE usage_credits   DISABLE ROW LEVEL SECURITY;
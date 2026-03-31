# Dynamic AI — Agent Factory

Build, test, and deploy custom AI agents without code.

---

## Environment Variables

### Backend — `backend/.env`

```env
# Supabase project URL
SUPABASE_URL=https://your-project-ref.supabase.co

# Supabase service role key (from Project Settings → API)
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# JWT secret (from Project Settings → API → JWT Secret)
JWT_SECRET=your-jwt-secret

# Encryption key for BYOK API keys — generate with:
# python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
ENCRYPTION_KEY=your-fernet-encryption-key

# Comma-separated list of allowed frontend origins
ALLOWED_ORIGINS=http://localhost:3000
```

---

### Frontend — `frontend/.env.local`

```env
# FastAPI backend URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# Supabase project URL (same as backend)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co

# Supabase anon/public key (from Project Settings → API)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

### Supabase Edge Functions — `supabase/.env.local`

```env
# Postgres connection string (from Project Settings → Database)
DATABASE_URL=postgresql://postgres:your-password@db.your-project-ref.supabase.co:5432/postgres

# OpenAI API key (used as fallback LLM provider)
OPENAI_API_KEY=sk-proj-...

# Anthropic API key (preferred LLM provider)
ANTHROPIC_API_KEY=sk-ant-api03-...

# Supabase service role key (same as backend)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

> Edge function secrets must also be set in the Supabase dashboard under
> **Project Settings → Edge Functions → Secrets**, or deployed via:
> ```bash
> supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
> supabase secrets set OPENAI_API_KEY=sk-proj-...
> supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
> ```

---

## Database Setup

Run these migrations in order in the **Supabase SQL Editor**:

```
supabase/migrations/001_agent_factory_schema.sql
supabase/migrations/002_storage_buckets.sql
supabase/migrations/004_projects_deliverables_tasks.sql
```

Then run this to add the config column:

```sql
ALTER TABLE agents ADD COLUMN IF NOT EXISTS config jsonb;
```

---

## Running the Project

### 1. Backend (FastAPI)

```bash
cd backend

# Create and activate virtual environment (Python 3.11 required)
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --reload --port 8000
```

Backend runs at `http://localhost:8000`
API docs at `http://localhost:8000/docs`

---

### 2. Frontend (Next.js)

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Frontend runs at `http://localhost:3000`

---

### 3. Supabase Edge Functions

```bash
cd supabase

# Login (first time only)
npx supabase login

# Deploy all edge functions
npx supabase functions deploy prompt-generator
npx supabase functions deploy config-generator
npx supabase functions deploy agent-runner
npx supabase functions deploy agent-invoke
npx supabase functions deploy agent-reviewer
```

---

## Project Structure

```
Dynamic_ai/
├── backend/                  # FastAPI — auth, pipeline orchestration, REST API
│   ├── app/
│   │   ├── routers/          # agents, projects, deliverables, tasks, credits
│   │   ├── services/         # agent_pipeline, credits_service
│   │   ├── clients/          # supabase_client, realtime_client
│   │   ├── middleware/        # auth (ES256 JWT), rate_limit
│   │   └── models/           # Pydantic request/response models
│   └── requirements.txt
│
├── frontend/                 # Next.js — UI
│   ├── app/
│   │   ├── agents/           # Agent list, detail, build, job status
│   │   ├── projects/         # Projects, deliverables, tasks
│   │   └── settings/         # BYOK API key management
│   ├── components/
│   │   └── agents/           # AgentBuilder, PlaygroundRunner, etc.
│   └── lib/
│       └── api.ts            # Typed fetch wrappers for all endpoints
│
└── supabase/
    ├── functions/            # Edge functions (Deno TypeScript)
    │   ├── prompt-generator/ # EF1 — converts prompt to agent spec
    │   ├── config-generator/ # EF2 — converts spec to validated config
    │   ├── agent-runner/     # EF3 — tool-calling loop (sandbox)
    │   ├── agent-reviewer/   # EF4 — scores and approves/rejects config
    │   ├── agent-invoke/     # EF5 — runtime invocation (playground + tasks)
    │   └── _shared/          # types, llm_client, validators, tool_executor
    └── migrations/           # SQL schema files
```

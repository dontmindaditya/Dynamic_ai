"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"

type Mode = "freeform" | "deliverable"

const EXAMPLES = [
  "An agent that researches any company URL and writes a personalized cold email",
  "A support agent that answers questions about my product based on a URL I provide",
  "An agent that summarizes any article URL into 5 bullet points",
]

const ROLE_EXAMPLES = [
  "governance_lead",
  "data_analyst",
  "product_manager",
  "compliance_officer",
  "research_lead",
]

export function AgentBuilder() {
  const router  = useRouter()
  const [mode, setMode]         = useState<Mode>("freeform")
  const [provider, setProvider] = useState<"openai" | "anthropic">("openai")
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  // Free-form fields
  const [prompt, setPrompt] = useState("")

  // Deliverable fields
  const [ownerRole, setOwnerRole]           = useState("")
  const [title, setTitle]                   = useState("")
  const [deliverableId, setDeliverableId]   = useState("")
  const [extraContext, setExtraContext]      = useState("")

  const canSubmit = mode === "freeform"
    ? prompt.trim().length >= 10
    : ownerRole.trim().length > 0 && title.trim().length > 0

  const handleSubmit = async () => {
    if (!canSubmit) return
    setLoading(true)
    setError(null)

    try {
      if (mode === "freeform") {
        const { job_id } = await api.buildAgent(prompt, provider)
        router.push(`/agents/jobs/${job_id}`)
      } else {
        const { job_id } = await api.buildAgent(
          extraContext || `Build a ${ownerRole} agent for: ${title}`,
          provider,
          { owner_role: ownerRole, title, deliverable_id: deliverableId || undefined }
        )
        router.push(`/agents/jobs/${job_id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start build")
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* Mode toggle */}
      <div className="flex gap-1 rounded-full border border-black/8 bg-white/70 p-1 dark:border-white/10 dark:bg-white/5">
        {([
          { id: "freeform",     label: "Free-form" },
          { id: "deliverable",  label: "Deliverable Agent" },
        ] as { id: Mode; label: string }[]).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => { setMode(id); setError(null) }}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              mode === id
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Free-form mode */}
      {mode === "freeform" && (
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium tracking-[-0.01em] text-gray-700 dark:text-gray-300">
              What should your agent do?
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your agent in plain English..."
              rows={6}
              className="w-full resize-none rounded-[24px] border border-black/8 bg-white/90 px-5 py-4 text-sm leading-7 text-gray-900 placeholder-gray-400 shadow-[0_20px_60px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-black dark:border-white/10 dark:bg-white/5 dark:text-gray-100 dark:focus:ring-white"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>{prompt.length} characters</span>
              <span>min 10, max 2000</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Try an example
            </p>
            <div className="grid gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setPrompt(ex)}
                  className="rounded-2xl border border-black/8 bg-white/75 px-4 py-3 text-left text-xs leading-6 text-gray-900 hover:border-black/15 dark:border-white/10 dark:bg-white/5 dark:text-gray-100 dark:hover:border-white/20"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Deliverable mode */}
      {mode === "deliverable" && (
        <div className="space-y-5">
          <div className="rounded-[20px] border border-black/8 bg-gray-50/80 px-4 py-3 text-xs leading-6 text-gray-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-400">
            The agent's system prompt will be built from your role and deliverable.
            It will stay in character as the <span className="font-medium text-gray-900 dark:text-gray-100">owner_role</span> across all tasks.
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Owner Role <span className="text-red-500">*</span>
            </label>
            <input
              value={ownerRole}
              onChange={(e) => setOwnerRole(e.target.value)}
              placeholder="e.g. governance_lead, data_analyst, product_manager"
              className="w-full rounded-2xl border border-black/8 bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:border-white/10 dark:bg-white/5 dark:focus:ring-white"
            />
            <div className="flex flex-wrap gap-2">
              {ROLE_EXAMPLES.map((r) => (
                <button
                  key={r}
                  onClick={() => setOwnerRole(r)}
                  className="rounded-full border border-black/8 px-3 py-1 text-xs text-gray-600 hover:border-black/20 dark:border-white/10 dark:text-gray-400 dark:hover:border-white/20"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Deliverable Title <span className="text-red-500">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q3 Compliance Report, Customer Segmentation Analysis"
              className="w-full rounded-2xl border border-black/8 bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:border-white/10 dark:bg-white/5 dark:focus:ring-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Deliverable ID <span className="text-xs text-gray-400">(optional)</span>
            </label>
            <input
              value={deliverableId}
              onChange={(e) => setDeliverableId(e.target.value)}
              placeholder="e.g. DEL-042, Q3-COMP-001"
              className="w-full rounded-2xl border border-black/8 bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:border-white/10 dark:bg-white/5 dark:focus:ring-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Additional Context <span className="text-xs text-gray-400">(optional)</span>
            </label>
            <textarea
              value={extraContext}
              onChange={(e) => setExtraContext(e.target.value)}
              placeholder="Any extra details about the deliverable, tools needed, constraints..."
              rows={3}
              className="w-full resize-none rounded-[20px] border border-black/8 bg-white/90 px-4 py-3 text-sm leading-7 focus:outline-none focus:ring-2 focus:ring-black dark:border-white/10 dark:bg-white/5 dark:focus:ring-white"
            />
          </div>

          {/* Preview */}
          {ownerRole && title && (
            <div className="rounded-[20px] border border-black/8 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">System Prompt Preview</p>
              <pre className="whitespace-pre-wrap text-xs leading-6 text-gray-600 dark:text-gray-400">{`You are a ${ownerRole || "{owner_role}"}.

Your mission is to deliver: ${title || "{title}"}

You own all tasks under deliverable ${deliverableId || "{id}"}. When new tasks are created
under this deliverable, you are responsible for:
- Breaking them down into actionable subtasks
- Producing the work output (drafts, analysis, plans, frameworks)
- Flagging blockers or dependencies on other deliverables
- Reporting progress

Stay in character as a ${ownerRole || "{owner_role}"}. Your decisions, language, and
priorities should reflect that expertise.`}</pre>
            </div>
          )}
        </div>
      )}

      {/* Provider */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">LLM Provider</label>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["openai", "anthropic"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setProvider(p)}
              className={`rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${
                provider === p
                  ? "border-black bg-black text-white shadow-[0_20px_60px_rgba(0,0,0,0.12)] dark:border-white dark:bg-white dark:text-black"
                  : "border-black/8 bg-white/70 text-gray-600 hover:border-black/15 dark:border-white/10 dark:bg-white/5 dark:text-gray-400"
              }`}
            >
              {p === "openai" ? "OpenAI GPT-4o" : "Anthropic Claude"}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-2xl border border-black/8 bg-gray-100/80 px-4 py-3 text-sm text-gray-900 dark:border-white/10 dark:bg-gray-800 dark:text-gray-100">
          {error}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || !canSubmit}
        suppressHydrationWarning
        className="w-full rounded-full border border-black bg-black px-6 py-3.5 text-sm font-medium text-white shadow-[0_20px_60px_rgba(0,0,0,0.14)] hover:-translate-y-0.5 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-200"
      >
        {loading ? "Starting build..." : "Build Agent"}
      </button>

      <p className="text-center text-xs text-gray-400">
        Builds take 30–90 seconds. You will be redirected automatically.
      </p>
    </div>
  )
}

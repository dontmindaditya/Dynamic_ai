"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { api, type Agent } from "@/lib/api"

export default function NewDeliverablePage() {
  const { project_id } = useParams<{ project_id: string }>()
  const router = useRouter()

  const [title, setTitle]           = useState("")
  const [description, setDesc]      = useState("")
  const [ownerRole, setOwnerRole]   = useState("")
  const [agentMode, setAgentMode]   = useState<"existing" | "none">("none")
  const [agents, setAgents]         = useState<Agent[]>([])
  const [selectedAgent, setSelected] = useState("")
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  useEffect(() => {
    api.listAgents().then((r) => setAgents(r.agents.filter((a) => a.status === "live")))
  }, [])

  async function handleSubmit() {
    if (!title.trim()) return
    setLoading(true)
    setError(null)
    try {
      await api.createDeliverable(project_id, {
        title: title.trim(),
        description: description.trim() || undefined,
        owner_role: ownerRole.trim() || undefined,
        agent_id: agentMode === "existing" && selectedAgent ? selectedAgent : undefined,
      })
      router.push(`/projects/${project_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create deliverable")
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-xs uppercase tracking-[0.24em] text-gray-400">New Deliverable</p>
      <h1 className="mt-2 mb-8 text-3xl font-medium tracking-[-0.05em] text-gray-900 dark:text-gray-100">
        Add a deliverable
      </h1>

      <div className="rounded-[28px] border border-black/8 bg-white/70 p-6 dark:border-white/10 dark:bg-white/[0.03] space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Q3 Compliance Report"
            className="w-full rounded-2xl border border-black/8 bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:border-white/10 dark:bg-white/5 dark:focus:ring-white"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Description <span className="text-xs text-gray-400">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDesc(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-2xl border border-black/8 bg-white/90 px-4 py-3 text-sm leading-7 focus:outline-none focus:ring-2 focus:ring-black dark:border-white/10 dark:bg-white/5 dark:focus:ring-white"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Owner Role <span className="text-xs text-gray-400">(optional — shapes agent behaviour)</span>
          </label>
          <input
            value={ownerRole}
            onChange={(e) => setOwnerRole(e.target.value)}
            placeholder="e.g. governance_lead, data_analyst"
            className="w-full rounded-2xl border border-black/8 bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:border-white/10 dark:bg-white/5 dark:focus:ring-white"
          />
        </div>

        {/* Agent assignment */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Assign Agent</label>
          <div className="grid grid-cols-2 gap-2">
            {(["none", "existing"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setAgentMode(m)}
                className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                  agentMode === m
                    ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                    : "border-black/8 text-gray-600 hover:border-black/15 dark:border-white/10 dark:text-gray-400"
                }`}
              >
                {m === "none" ? "Assign later" : "Use existing agent"}
              </button>
            ))}
          </div>

          {agentMode === "existing" && (
            <select
              value={selectedAgent}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full rounded-2xl border border-black/8 bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:border-white/10 dark:bg-white/5 dark:focus:ring-white"
            >
              <option value="">Select a live agent…</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading || !title.trim()}
          className="w-full rounded-full border border-black bg-black px-4 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:border-white dark:bg-white dark:text-black"
        >
          {loading ? "Creating..." : "Create Deliverable"}
        </button>
      </div>
    </div>
  )
}

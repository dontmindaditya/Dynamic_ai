"use client"
// ============================================================
// frontend/app/agents/[id]/page.tsx
// Deployed agent page — playground, embed code, run logs
// ============================================================

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { api, type Agent } from "@/lib/api"
import { PlaygroundRunner } from "@/components/agents/PlaygroundRunner"
import { EmbedCodePanel }   from "@/components/agents/EmbedCodePanel"
import { RunLogTable }      from "@/components/agents/RunLogTable"
import { ConfigInspector }  from "@/components/agents/ConfigInspector"

type Tab = "playground" | "deploy" | "logs"

export default function AgentPage() {
  const params  = useParams()
  const agentId = params.id as string

  const [agent,   setAgent]   = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [tab,     setTab]     = useState<Tab>("playground")

  useEffect(() => {
    api.getAgent(agentId)
      .then(setAgent)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [agentId])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="h-8 w-48 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse mb-4" />
        <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (error || !agent) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <p className="text-gray-900 dark:text-gray-100">{error ?? "Agent not found"}</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {agent.name}
            </h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              agent.status === "live"
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
            }`}>
              {agent.status}
            </span>
          </div>
          {agent.description && (
            <p className="text-sm text-gray-500">{agent.description}</p>
          )}
        </div>
        <span className="text-xs text-gray-400">v{agent.version}</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {(["playground", "deploy", "logs"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors -mb-px ${
              tab === t
                ? "border-black text-black dark:border-white dark:text-white"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        {tab === "playground" && (
          <div className="space-y-6">
            <PlaygroundRunner agentId={agentId} />
            <ConfigInspector configPath={null} />
          </div>
        )}

        {tab === "deploy" && (
          <EmbedCodePanel agent={agent} />
        )}

        {tab === "logs" && (
          <RunLogTable agentId={agentId} />
        )}
      </div>
    </div>
  )
}

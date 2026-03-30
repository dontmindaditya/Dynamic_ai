"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { api, type Agent } from "@/lib/api"
import { PlaygroundRunner } from "@/components/agents/PlaygroundRunner"
import { EmbedCodePanel } from "@/components/agents/EmbedCodePanel"
import { RunLogTable } from "@/components/agents/RunLogTable"
import { ConfigInspector } from "@/components/agents/ConfigInspector"

type Tab = "playground" | "deploy" | "logs"

export default function AgentPage() {
  const params = useParams()
  const agentId = params.id as string

  const [agent, setAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>("playground")

  useEffect(() => {
    api.getAgent(agentId)
      .then(setAgent)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [agentId])

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="panel mb-4 h-10 w-56 rounded-2xl animate-pulse" />
        <div className="panel h-72 rounded-[28px] animate-pulse" />
      </div>
    )
  }

  if (error || !agent) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-gray-900 dark:text-gray-100">{error ?? "Agent not found"}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6 sm:px-6 lg:px-8">
      <div className="panel rounded-[28px] p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-gray-400">Agent Overview</p>
            <div className="mb-1 flex items-center gap-3">
              <h1 className="mt-2 text-3xl font-medium tracking-[-0.05em] text-gray-900 dark:text-gray-100">
                {agent.name}
              </h1>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                agent.status === "live"
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
              }`}>
                {agent.status}
              </span>
            </div>
            {agent.description && (
              <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-500">{agent.description}</p>
            )}
          </div>

          <div className="rounded-2xl border border-black/8 bg-white/70 px-4 py-3 text-right dark:border-white/10 dark:bg-white/5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Version</p>
            <span className="mt-1 block text-sm font-medium text-gray-900 dark:text-gray-100">v{agent.version}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto rounded-full border border-black/8 bg-white/70 p-1 dark:border-white/10 dark:bg-white/5">
        {(["playground", "deploy", "logs"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-sm font-medium capitalize ${
              tab === t
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="panel rounded-[28px] p-6 sm:p-8">
        {tab === "playground" && (
          <div className="space-y-6">
            <PlaygroundRunner agentId={agentId} />
            <ConfigInspector configPath={null} />
          </div>
        )}

        {tab === "deploy" && <EmbedCodePanel agent={agent} />}

        {tab === "logs" && <RunLogTable agentId={agentId} />}
      </div>
    </div>
  )
}

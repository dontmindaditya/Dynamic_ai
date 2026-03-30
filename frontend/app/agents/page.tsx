"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { api, type Agent } from "@/lib/api"
import { AgentCard } from "@/components/agents/AgentCard"

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.listAgents()
      .then((data) => setAgents(data.agents))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-gray-400">Workspace</p>
          <h1 className="mt-2 text-3xl font-medium tracking-[-0.05em] text-gray-900 dark:text-gray-100">My Agents</h1>
          <p className="mt-2 text-sm text-gray-500">Build and deploy custom AI agents without code.</p>
        </div>
        <Link
          href="/agents/new"
          className="inline-flex items-center justify-center rounded-full border border-black bg-black px-5 py-3 text-sm font-medium text-white hover:bg-gray-800 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-200"
        >
          New Agent
        </Link>
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="panel h-40 rounded-[24px] animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-gray-900 dark:text-gray-100">{error}</p>
      )}

      {!loading && agents.length === 0 && (
        <div className="panel rounded-[28px] py-20 text-center space-y-4">
          <p className="text-gray-400">No agents yet.</p>
          <Link href="/agents/new" className="text-gray-900 dark:text-gray-100 hover:underline text-sm">
            Build your first agent →
          </Link>
        </div>
      )}

      {agents.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// frontend/app/agents/page.tsx
// Agent list — all user's agents with status badges
// ============================================================

"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { api, type Agent } from "@/lib/api"
import { AgentCard } from "@/components/agents/AgentCard"

export default function AgentsPage() {
  const [agents,  setAgents]  = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    api.listAgents()
      .then((data) => setAgents(data.agents))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">My Agents</h1>
          <p className="text-sm text-gray-500 mt-1">Build and deploy custom AI agents without code.</p>
        </div>
        <Link
          href="/agents/new"
          className="px-4 py-2 rounded-xl bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black text-sm font-medium transition-colors"
        >
          New Agent
        </Link>
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-gray-900 dark:text-gray-100">{error}</p>
      )}

      {!loading && agents.length === 0 && (
        <div className="text-center py-20 space-y-4">
          <p className="text-gray-400">No agents yet.</p>
          <Link href="/agents/new" className="text-gray-900 dark:text-gray-100 hover:underline text-sm">
            Build your first agent →
          </Link>
        </div>
      )}

      {agents.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  )
}

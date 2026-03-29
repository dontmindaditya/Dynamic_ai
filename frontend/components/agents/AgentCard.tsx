"use client"
// ============================================================
// frontend/components/agents/AgentCard.tsx
// Reusable agent card for the agent list page
// ============================================================

import Link from "next/link"
import type { Agent } from "@/lib/api"

interface Props { agent: Agent }

export function AgentCard({ agent }: Props) {
  const statusStyle = {
    live:     "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    draft:    "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    paused:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    archived: "bg-gray-100 text-gray-400 dark:bg-gray-800",
  }[agent.status] ?? "bg-gray-100 text-gray-600"

  return (
    <Link href={`/agents/${agent.id}`}>
      <div className="group rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all cursor-pointer">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
            {agent.name}
          </h3>
          <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle}`}>
            {agent.status}
          </span>
        </div>

        {agent.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
            {agent.description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>v{agent.version}</span>
          <span>{new Date(agent.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    </Link>
  )
}
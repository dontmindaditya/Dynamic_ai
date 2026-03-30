"use client"

import Link from "next/link"
import type { Agent } from "@/lib/api"

interface Props { agent: Agent }

export function AgentCard({ agent }: Props) {
  const statusStyle = {
    live: "bg-black text-white dark:bg-white dark:text-black",
    draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
    paused: "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100",
    archived: "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500",
  }[agent.status] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"

  return (
    <Link href={`/agents/${agent.id}`}>
      <div className="panel rounded-[24px] p-5 transition-all hover:-translate-y-0.5 hover:border-black/20 dark:hover:border-white/20">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="line-clamp-1 text-lg font-medium tracking-[-0.03em] text-gray-900 transition-colors dark:text-gray-100">
            {agent.name}
          </h3>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle}`}>
            {agent.status}
          </span>
        </div>

        {agent.description && (
          <p className="mb-6 line-clamp-2 text-sm leading-7 text-gray-500 dark:text-gray-400">
            {agent.description}
          </p>
        )}

        <div className="flex items-center justify-between border-t border-black/6 pt-4 text-xs text-gray-400 dark:border-white/10">
          <span>v{agent.version}</span>
          <span>{new Date(agent.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    </Link>
  )
}

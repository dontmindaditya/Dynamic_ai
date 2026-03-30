"use client"
// ============================================================
// frontend/components/agents/RunLogTable.tsx
// ============================================================

import { useAgentRuns } from "@/hooks/useAgentRuns"

interface Props { agentId: string }

export function RunLogTable({ agentId }: Props) {
  const { runs, loading, hasMore, loadMore, refresh } = useAgentRuns(agentId)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Run History</h3>
        <button onClick={refresh} className="text-xs text-gray-900 dark:text-gray-100 hover:underline">Refresh</button>
      </div>

      {loading && runs.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">Loading runs...</p>
      )}

      {!loading && runs.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">No runs yet. Test your agent in the playground.</p>
      )}

      {runs.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-4 py-2 text-gray-500 font-medium">Time</th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">Source</th>
                <th className="text-right px-4 py-2 text-gray-500 font-medium">Latency</th>
                <th className="text-right px-4 py-2 text-gray-500 font-medium">Steps</th>
                <th className="text-right px-4 py-2 text-gray-500 font-medium">Tokens</th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400 font-mono">
                    {new Date(run.created_at).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-2">
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      {run.source}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">
                    {run.latency_ms ? `${run.latency_ms}ms` : "—"}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">{run.steps_taken}</td>
                  <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">{run.tokens_used}</td>
                  <td className="px-4 py-2">
                    {run.error
                      ? <span className="text-gray-900 dark:text-gray-100">Error</span>
                      : <span className="text-gray-900 dark:text-gray-100">OK</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasMore && (
        <button onClick={loadMore} className="w-full py-2 text-xs text-gray-900 dark:text-gray-100 hover:underline">
          {loading ? "Loading..." : "Load more"}
        </button>
      )}
    </div>
  )
}

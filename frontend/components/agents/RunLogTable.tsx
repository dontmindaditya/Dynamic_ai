"use client"

import { useAgentRuns } from "@/hooks/useAgentRuns"

interface Props { agentId: string }

export function RunLogTable({ agentId }: Props) {
  const { runs, loading, hasMore, loadMore, refresh } = useAgentRuns(agentId)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Run History</h3>
        <button onClick={refresh} className="text-xs text-gray-900 dark:text-gray-100 hover:underline">Refresh</button>
      </div>

      {loading && runs.length === 0 && (
        <p className="py-8 text-center text-sm text-gray-400">Loading runs...</p>
      )}

      {!loading && runs.length === 0 && (
        <p className="py-8 text-center text-sm text-gray-400">No runs yet. Test your agent in the playground.</p>
      )}

      {runs.length > 0 && (
        <div className="overflow-hidden rounded-[24px] border border-black/8 bg-white/70 dark:border-white/10 dark:bg-white/[0.03]">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-black/8 bg-gray-50/80 dark:border-white/10 dark:bg-white/[0.03]">
                <th className="px-4 py-2 text-left font-medium text-gray-500">Time</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Source</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500">Latency</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500">Steps</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500">Tokens</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-b border-black/6 hover:bg-gray-50/70 dark:border-white/10 dark:hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-400">
                    {new Date(run.created_at).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {run.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                    {run.latency_ms ? `${run.latency_ms}ms` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{run.steps_taken}</td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{run.tokens_used}</td>
                  <td className="px-4 py-3">
                    <span className="text-gray-900 dark:text-gray-100">{run.error ? "Error" : "OK"}</span>
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

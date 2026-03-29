"use client"
// ============================================================
// frontend/components/agents/PlaygroundRunner.tsx
// Send input to agent, show output + expandable message trace
// ============================================================

import { useState } from "react"
import { api, type InvokeResponse } from "@/lib/api"

interface Props { agentId: string }

export function PlaygroundRunner({ agentId }: Props) {
  const [input,    setInput]    = useState("")
  const [result,   setResult]   = useState<InvokeResponse | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [showTrace, setShowTrace] = useState(false)

  const handleRun = async () => {
    if (!input.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    setShowTrace(false)

    try {
      const data = await api.invokeAgent(agentId, input)
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Run failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Input
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your input here..."
          rows={3}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <button
        onClick={handleRun}
        disabled={loading || !input.trim()}
        className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
      >
        {loading ? "Running..." : "Run Agent"}
      </button>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-3">
          {/* Output */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Output</span>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>{result.latency_ms}ms</span>
                <span>{result.steps_taken} steps</span>
                <span>{result.tokens_used} tokens</span>
              </div>
            </div>
            <pre className="p-4 text-sm text-gray-900 dark:text-gray-100 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(result.output, null, 2)}
            </pre>
          </div>

          {/* Errors from run */}
          {result.errors.length > 0 && (
            <div className="rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 px-4 py-3">
              <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400 mb-1">Warnings</p>
              {result.errors.map((e, i) => (
                <p key={i} className="text-xs text-yellow-600 dark:text-yellow-300">{e}</p>
              ))}
            </div>
          )}

          {/* Message trace toggle */}
          <button
            onClick={() => setShowTrace((v) => !v)}
            className="text-xs text-blue-500 hover:text-blue-600 underline"
          >
            {showTrace ? "Hide" : "Show"} full message trace ({result.steps_taken} steps)
          </button>

          {showTrace && (
            <div className="space-y-2">
              {result.messages?.map((msg: Record<string, unknown>, i: number) => (
                <div
                  key={i}
                  className={`rounded-lg px-4 py-3 text-xs ${
                    msg.role === "user"
                      ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800"
                      : msg.role === "tool"
                      ? "bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                      : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <p className="font-medium text-gray-500 dark:text-gray-400 mb-1 capitalize">
                    {msg.role as string}
                    {msg.tool_name ? ` · ${msg.tool_name}` : ""}
                  </p>
                  <pre className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                    {typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
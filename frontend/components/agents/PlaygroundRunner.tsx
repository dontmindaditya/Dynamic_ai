"use client"

import { useState } from "react"
import { api, type InvokeResponse } from "@/lib/api"

interface Props { agentId: string }

export function PlaygroundRunner({ agentId }: Props) {
  const [input, setInput] = useState("")
  const [result, setResult] = useState<InvokeResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Input
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your input here..."
          rows={4}
          className="w-full resize-none rounded-[24px] border border-black/8 bg-white/90 px-5 py-4 text-sm leading-7 focus:outline-none focus:ring-2 focus:ring-black dark:border-white/10 dark:bg-white/5 dark:focus:ring-white"
        />
      </div>

      <button
        onClick={handleRun}
        disabled={loading || !input.trim()}
        className="w-full rounded-full border border-black bg-black px-4 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-200"
      >
        {loading ? "Running..." : "Run Agent"}
      </button>

      {error && (
        <div className="rounded-[20px] border border-black/8 bg-gray-100/80 px-4 py-3 text-sm text-gray-900 dark:border-white/10 dark:bg-gray-800 dark:text-gray-100">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-[24px] border border-black/8 bg-white/70 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between border-b border-black/8 bg-gray-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Output</span>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>{result.latency_ms}ms</span>
                <span>{result.steps_taken} steps</span>
                <span>{result.tokens_used} tokens</span>
              </div>
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap p-4 text-sm text-gray-900 dark:text-gray-100">
              {JSON.stringify(result.output, null, 2)}
            </pre>
          </div>

          {result.errors.length > 0 && (
            <div className="rounded-[20px] border border-black/8 bg-gray-100/80 px-4 py-3 dark:border-white/10 dark:bg-gray-800">
              <p className="mb-1 text-xs font-medium text-gray-900 dark:text-gray-100">Warnings</p>
              {result.errors.map((e, i) => (
                <p key={i} className="text-xs text-gray-700 dark:text-gray-300">{e}</p>
              ))}
            </div>
          )}

          <button
            onClick={() => setShowTrace((v) => !v)}
            className="text-xs text-gray-900 underline hover:text-gray-600 dark:text-gray-100 dark:hover:text-gray-300"
          >
            {showTrace ? "Hide" : "Show"} full message trace ({result.steps_taken} steps)
          </button>

          {showTrace && (
            <div className="space-y-2">
              {result.messages?.map((msg: Record<string, unknown>, i: number) => (
                <div
                  key={i}
                  className={`rounded-[20px] px-4 py-3 text-xs ${
                    msg.role === "user"
                      ? "border border-black/8 bg-gray-100/85 dark:border-white/10 dark:bg-gray-800"
                      : msg.role === "tool"
                      ? "border border-black/8 bg-gray-50 dark:border-white/10 dark:bg-white/[0.03]"
                      : "border border-black/8 bg-white/80 dark:border-white/10 dark:bg-black/40"
                  }`}
                >
                  <p className="mb-1 font-medium capitalize text-gray-500 dark:text-gray-400">
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

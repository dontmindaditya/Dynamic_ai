"use client"
// ============================================================
// frontend/components/agents/AgentBuilder.tsx
// Prompt intake form — submits to POST /agents/build
// Stores job_id and shows live status bar
// ============================================================

import { useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"

const EXAMPLES = [
  "An agent that researches any company URL and writes a personalized cold email",
  "A support agent that answers questions about my product based on a URL I provide",
  "An agent that summarizes any article URL into 5 bullet points",
]

export function AgentBuilder() {
  const router = useRouter()
  const [prompt,   setPrompt]   = useState("")
  const [provider, setProvider] = useState<"openai" | "anthropic">("openai")
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!prompt.trim() || prompt.length < 10) {
      setError("Please describe your agent in at least 10 characters.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { job_id } = await api.buildAgent(prompt, provider)
      // Redirect to job status page — polling starts there
      router.push(`/agents/jobs/${job_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start build")
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Prompt textarea */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          What should your agent do?
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your agent in plain English. For example: 'An agent that takes a product URL, researches it, and writes a personalized cold email'"
          rows={5}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>{prompt.length} characters</span>
          <span>min 10, max 2000</span>
        </div>
      </div>

      {/* Example prompts */}
      <div className="space-y-2">
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
          Try an example
        </p>
        <div className="flex flex-col gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setPrompt(ex)}
              className="text-left text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Provider selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          LLM Provider
        </label>
        <div className="flex gap-3">
          {(["openai", "anthropic"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setProvider(p)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium border transition-colors
                ${provider === p
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                }`}
            >
              {p === "openai" ? "OpenAI GPT-4o" : "Anthropic Claude"}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading || prompt.length < 10}
        className="w-full py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
      >
        {loading ? "Starting build..." : "Build Agent"}
      </button>

      <p className="text-center text-xs text-gray-400">
        Builds take 30–90 seconds. You will be redirected automatically.
      </p>
    </div>
  )
}
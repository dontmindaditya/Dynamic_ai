"use client"

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
  const [prompt, setPrompt] = useState("")
  const [provider, setProvider] = useState<"openai" | "anthropic">("openai")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!prompt.trim() || prompt.length < 10) {
      setError("Please describe your agent in at least 10 characters.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { job_id } = await api.buildAgent(prompt, provider)
      router.push(`/agents/jobs/${job_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start build")
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <label className="text-sm font-medium tracking-[-0.01em] text-gray-700 dark:text-gray-300">
          What should your agent do?
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your agent in plain English. For example: 'An agent that takes a product URL, researches it, and writes a personalized cold email'"
          rows={7}
          className="w-full resize-none rounded-[24px] border border-black/8 bg-white/90 px-5 py-4 text-sm leading-7 text-gray-900 placeholder-gray-400 shadow-[0_20px_60px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-black dark:border-white/10 dark:bg-white/5 dark:text-gray-100 dark:focus:ring-white"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>{prompt.length} characters</span>
          <span>min 10, max 2000</span>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Try an example
        </p>
        <div className="grid gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setPrompt(ex)}
              className="rounded-2xl border border-black/8 bg-white/75 px-4 py-3 text-left text-xs leading-6 text-gray-900 hover:border-black/15 dark:border-white/10 dark:bg-white/5 dark:text-gray-100 dark:hover:border-white/20"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          LLM Provider
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["openai", "anthropic"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setProvider(p)}
              className={`rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${
                provider === p
                  ? "border-black bg-black text-white shadow-[0_20px_60px_rgba(0,0,0,0.12)] dark:border-white dark:bg-white dark:text-black"
                  : "border-black/8 bg-white/70 text-gray-600 hover:border-black/15 dark:border-white/10 dark:bg-white/5 dark:text-gray-400 dark:hover:border-white/20"
              }`}
            >
              {p === "openai" ? "OpenAI GPT-4o" : "Anthropic Claude"}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-2xl border border-black/8 bg-gray-100/80 px-4 py-3 text-sm text-gray-900 dark:border-white/10 dark:bg-gray-800 dark:text-gray-100">
          {error}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || prompt.length < 10}
        className="w-full rounded-full border border-black bg-black px-6 py-3.5 text-sm font-medium text-white shadow-[0_20px_60px_rgba(0,0,0,0.14)] hover:-translate-y-0.5 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-200"
      >
        {loading ? "Starting build..." : "Build Agent"}
      </button>

      <p className="text-center text-xs text-gray-400">
        Builds take 30-90 seconds. You will be redirected automatically.
      </p>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"

type Provider = "openai" | "anthropic"

export default function SettingsPage() {
  const [provider, setProvider]   = useState<Provider>("anthropic")
  const [apiKey, setApiKey]       = useState("")
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [currentProvider, setCurrentProvider] = useState<string | null>(null)
  const [hasKey, setHasKey]       = useState(false)

  useEffect(() => {
    api.getCredits().then((c) => {
      if (c.has_byok && c.byok_provider) {
        setCurrentProvider(c.byok_provider)
        setHasKey(true)
        setProvider(c.byok_provider as Provider)
      }
    }).catch(() => {})
  }, [])

  async function handleSave() {
    if (!apiKey.trim()) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await api.setBYOK(provider, apiKey.trim())
      setCurrentProvider(provider)
      setHasKey(true)
      setApiKey("")
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save key")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.24em] text-gray-400">Settings</p>
        <h1 className="mt-2 text-3xl font-medium tracking-[-0.05em] text-gray-900 dark:text-gray-100">
          API Keys
        </h1>
        <p className="mt-3 text-sm leading-7 text-gray-500">
          Add your own LLM API key. Your agents will use your key instead of the shared quota — no credits consumed.
        </p>
      </div>

      {hasKey && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-black/8 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/5">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Using your own <span className="font-medium capitalize">{currentProvider}</span> key
          </span>
        </div>
      )}

      <div className="rounded-[28px] border border-black/8 bg-white/70 p-6 dark:border-white/10 dark:bg-white/[0.03] space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Provider
          </label>
          <div className="grid grid-cols-2 gap-3">
            {(["openai", "anthropic"] as Provider[]).map((p) => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className={`rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${
                  provider === p
                    ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                    : "border-black/8 bg-white/70 text-gray-600 hover:border-black/15 dark:border-white/10 dark:bg-white/5 dark:text-gray-400"
                }`}
              >
                {p === "openai" ? "OpenAI" : "Anthropic"}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {provider === "openai" ? "OpenAI API Key" : "Anthropic API Key"}
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={provider === "openai" ? "sk-..." : "sk-ant-..."}
            className="w-full rounded-2xl border border-black/8 bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:border-white/10 dark:bg-white/5 dark:focus:ring-white"
          />
          <p className="text-xs text-gray-400">
            Stored encrypted. Never logged or shared.
          </p>
        </div>

        {error && (
          <p className="rounded-2xl border border-black/8 bg-gray-100/80 px-4 py-3 text-sm text-red-600 dark:border-white/10 dark:bg-gray-800">
            {error}
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving || !apiKey.trim()}
          className="w-full rounded-full border border-black bg-black px-4 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-200"
        >
          {saving ? "Saving..." : saved ? "Saved!" : hasKey ? "Update Key" : "Save Key"}
        </button>
      </div>

      <p className="mt-6 text-xs text-gray-400 leading-6">
        Your key is used for both building and running agents. You can update it at any time.
        To remove your key, contact support.
      </p>
    </div>
  )
}

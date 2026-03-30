"use client"

import { useState } from "react"
import type { Agent } from "@/lib/api"

interface Props { agent: Agent }

export function EmbedCodePanel({ agent }: Props) {
  const [copied, setCopied] = useState<string | null>(null)

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const embedSnippet = `<script src="https://fairquanta.ai/widget.js" data-agent-id="${agent.id}"></script>`
  const curlSnippet = `curl -X POST https://api.fairquanta.ai${agent.api_endpoint} \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Your input here"}'`

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Embed Widget</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-[20px] border border-black/8 bg-gray-50/80 px-3 py-3 text-xs font-mono dark:border-white/10 dark:bg-white/[0.03]">
            {embedSnippet}
          </code>
          <button
            onClick={() => copy(embedSnippet, "embed")}
            className="shrink-0 rounded-full border border-black/8 bg-white/80 px-4 py-2 text-xs hover:border-black/15 hover:bg-gray-100 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-white/[0.06]"
          >
            {copied === "embed" ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">REST API</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <pre className="flex-1 overflow-x-auto rounded-[20px] border border-black/8 bg-gray-50/80 px-3 py-3 text-xs font-mono dark:border-white/10 dark:bg-white/[0.03]">
            {curlSnippet}
          </pre>
          <button
            onClick={() => copy(curlSnippet, "curl")}
            className="shrink-0 rounded-full border border-black/8 bg-white/80 px-4 py-2 text-xs hover:border-black/15 hover:bg-gray-100 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-white/[0.06]"
          >
            {copied === "curl" ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  )
}

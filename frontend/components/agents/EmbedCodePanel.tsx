"use client"
// ============================================================
// frontend/components/agents/EmbedCodePanel.tsx
// ============================================================

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
  const curlSnippet  = `curl -X POST https://api.fairquanta.ai${agent.api_endpoint} \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Your input here"}'`

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Embed Widget</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 font-mono overflow-x-auto whitespace-nowrap">
            {embedSnippet}
          </code>
          <button
            onClick={() => copy(embedSnippet, "embed")}
            className="shrink-0 px-3 py-2 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {copied === "embed" ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">REST API</p>
        <div className="flex items-start gap-2">
          <pre className="flex-1 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 font-mono overflow-x-auto">
            {curlSnippet}
          </pre>
          <button
            onClick={() => copy(curlSnippet, "curl")}
            className="shrink-0 px-3 py-2 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {copied === "curl" ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  )
}

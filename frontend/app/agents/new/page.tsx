// ============================================================
// frontend/app/agents/new/page.tsx
// Prompt intake page
// ============================================================

import { AgentBuilder } from "@/components/agents/AgentBuilder"

export default function NewAgentPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Build an Agent</h1>
        <p className="text-sm text-gray-500 mt-1">
          Describe what you want your agent to do in plain English.
          No code required.
        </p>
      </div>
      <AgentBuilder />
    </div>
  )
}
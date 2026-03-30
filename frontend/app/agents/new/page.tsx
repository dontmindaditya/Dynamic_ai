import { AgentBuilder } from "@/components/agents/AgentBuilder"

export default function NewAgentPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 max-w-2xl">
        <p className="text-xs uppercase tracking-[0.24em] text-gray-400">New Agent</p>
        <h1 className="mt-2 text-3xl font-medium tracking-[-0.05em] text-gray-900 dark:text-gray-100">Build an Agent</h1>
        <p className="mt-3 text-sm leading-7 text-gray-500">
          Describe what you want your agent to do in plain English.
          No code required.
        </p>
      </div>

      <div className="panel rounded-[28px] p-6 sm:p-8">
        <AgentBuilder />
      </div>
    </div>
  )
}

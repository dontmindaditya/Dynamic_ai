"use client"

import { useJobPolling } from "@/hooks/useJobPolling"
import { useRealtimeJob } from "@/hooks/useRealtimeJob"

const STAGES = [
  { key: "queued", label: "Queued" },
  { key: "generating_spec", label: "Reading prompt" },
  { key: "generating_config", label: "Building config" },
  { key: "running_sandbox", label: "Testing agent" },
  { key: "reviewing", label: "Reviewing" },
  { key: "live", label: "Live" },
]

interface Props {
  jobId: string
  onLive?: (job: { agent_id: string | null; embed_url: string | null }) => void
  onFailed?: (reason: string) => void
}

export function JobStatusBar({ jobId, onLive, onFailed }: Props) {
  const { job } = useJobPolling(jobId)
  const { realtimePayload } = useRealtimeJob(jobId)

  const status = (realtimePayload?.status as string) ?? job?.status ?? "queued"
  const currentIndex = STAGES.findIndex((s) => s.key === status)
  const progressIndex = currentIndex === -1 ? 0 : currentIndex

  if (status === "live" && job?.agent_id && onLive) {
    onLive({ agent_id: job.agent_id, embed_url: job.embed_url })
  }
  if (status === "failed" && job?.failure_reason && onFailed) {
    onFailed(job.failure_reason)
  }
  if (status === "needs_review" && job?.failure_reason && onFailed) {
    onFailed(job.failure_reason)
  }

  const isTerminal = ["live", "needs_review", "failed"].includes(status)
  const isFailed = ["needs_review", "failed"].includes(status)

  return (
    <div className="w-full space-y-5">
      <div className="grid gap-2 sm:grid-cols-6">
        {STAGES.map((stage, i) => {
          const isDone = i < progressIndex || status === "live"
          const isCurrent = i === progressIndex && !isTerminal
          const isFail = isFailed && i === progressIndex

          return (
            <div key={stage.key} className="space-y-2">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  isDone
                    ? "bg-black dark:bg-white"
                    : isCurrent
                    ? "bg-gray-500 animate-pulse dark:bg-gray-400"
                    : isFail
                    ? "bg-gray-700 dark:bg-gray-300"
                    : "bg-gray-200 dark:bg-gray-700"
                }`}
              />
              <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">{stage.label}</p>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {isFailed
            ? "Build failed"
            : status === "live"
            ? "Agent is live"
            : STAGES.find((s) => s.key === status)?.label ?? "Starting..."}
        </span>

        {job?.retry_count && job.retry_count > 0 && (
          <span className="rounded-full border border-black/8 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-gray-400 dark:border-white/10">
            Retry {job.retry_count}/3
          </span>
        )}
      </div>

      {isFailed && job?.failure_reason && (
        <p className="rounded-[20px] border border-black/8 bg-gray-100/80 p-3 text-xs text-gray-900 dark:border-white/10 dark:bg-gray-800 dark:text-gray-100">
          {job.failure_reason}
        </p>
      )}
    </div>
  )
}

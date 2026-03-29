"use client"
// ============================================================
// frontend/components/agents/JobStatusBar.tsx
// Live pipeline progress bar — 6 stages from queued to live
// ============================================================

import { useJobPolling }   from "@/hooks/useJobPolling"
import { useRealtimeJob }  from "@/hooks/useRealtimeJob"

const STAGES = [
  { key: "queued",            label: "Queued"          },
  { key: "generating_spec",   label: "Reading prompt"  },
  { key: "generating_config", label: "Building config" },
  { key: "running_sandbox",   label: "Testing agent"   },
  { key: "reviewing",         label: "Reviewing"       },
  { key: "live",              label: "Live"            },
]

const STATUS_COLORS: Record<string, string> = {
  live:         "bg-green-500",
  needs_review: "bg-yellow-500",
  failed:       "bg-red-500",
}

interface Props {
  jobId:     string
  onLive?:   (job: { agent_id: string | null; embed_url: string | null }) => void
  onFailed?: (reason: string) => void
}

export function JobStatusBar({ jobId, onLive, onFailed }: Props) {
  const { job }              = useJobPolling(jobId)
  const { realtimePayload }  = useRealtimeJob(jobId)

  // Prefer realtime status for snappier UI, fall back to polled
  const status = (realtimePayload?.status as string) ?? job?.status ?? "queued"

  const currentIndex = STAGES.findIndex((s) => s.key === status)
  const progressIndex = currentIndex === -1 ? 0 : currentIndex

  // Fire callbacks on terminal states
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
  const isFailed   = ["needs_review", "failed"].includes(status)

  return (
    <div className="w-full space-y-3">
      {/* Stage pills */}
      <div className="flex items-center gap-1">
        {STAGES.map((stage, i) => {
          const isDone    = i < progressIndex || status === "live"
          const isCurrent = i === progressIndex && !isTerminal
          const isFail    = isFailed && i === progressIndex

          return (
            <div key={stage.key} className="flex items-center gap-1 flex-1">
              <div className={`
                flex-1 h-1.5 rounded-full transition-all duration-500
                ${isDone    ? "bg-green-500"  : ""}
                ${isCurrent ? "bg-blue-500 animate-pulse" : ""}
                ${isFail    ? "bg-red-500"    : ""}
                ${!isDone && !isCurrent && !isFail ? "bg-gray-200 dark:bg-gray-700" : ""}
              `} />
            </div>
          )
        })}
      </div>

      {/* Current stage label */}
      <div className="flex items-center justify-between text-sm">
        <span className={`font-medium ${isFailed ? "text-red-500" : "text-blue-500"}`}>
          {isFailed
            ? "Build failed"
            : status === "live"
            ? "Agent is live"
            : STAGES.find((s) => s.key === status)?.label ?? "Starting..."}
        </span>

        {job?.retry_count && job.retry_count > 0 && (
          <span className="text-xs text-gray-400">
            Retry {job.retry_count}/3
          </span>
        )}
      </div>

      {/* Failure reason */}
      {isFailed && job?.failure_reason && (
        <p className="text-xs text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
          {job.failure_reason}
        </p>
      )}
    </div>
  )
}
"use client"
// ============================================================
// frontend/app/agents/jobs/[jobId]/page.tsx
// Polls job status every 2s, redirects to agent page on live
// ============================================================

import { useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { JobStatusBar } from "@/components/agents/JobStatusBar"
import { useJobPolling } from "@/hooks/useJobPolling"

export default function JobPage() {
  const router = useRouter()
  const params = useParams()
  const jobId  = params.jobId as string

  const { job } = useJobPolling(jobId)

  // Redirect to agent page when live
  useEffect(() => {
    if (job?.status === "live" && job.agent_id) {
      router.push(`/agents/${job.agent_id}`)
    }
  }, [job, router])

  return (
    <div className="max-w-xl mx-auto px-4 py-20 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Building your agent
        </h1>
        <p className="text-sm text-gray-400">
          This takes 30–90 seconds. You can safely leave and come back.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        {job?.prompt && (
          <p className="text-sm text-gray-600 dark:text-gray-300 italic">
            "{job.prompt}"
          </p>
        )}

        <JobStatusBar
          jobId={jobId}
          onLive={({ agent_id }) => {
            if (agent_id) router.push(`/agents/${agent_id}`)
          }}
          onFailed={(reason) => {
            console.error("Build failed:", reason)
          }}
        />
      </div>

      {/* Status detail */}
      {job && (
        <p className="text-center text-xs text-gray-400">
          Job ID: <code className="font-mono">{jobId}</code>
          {job.retry_count > 0 && ` · Retry ${job.retry_count}/3`}
        </p>
      )}
    </div>
  )
}
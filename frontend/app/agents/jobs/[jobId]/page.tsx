"use client"

import { useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { JobStatusBar } from "@/components/agents/JobStatusBar"
import { useJobPolling } from "@/hooks/useJobPolling"

export default function JobPage() {
  const router = useRouter()
  const params = useParams()
  const jobId = params.jobId as string

  const { job } = useJobPolling(jobId)

  useEffect(() => {
    if (job?.status === "live" && job.agent_id) {
      router.push(`/agents/${job.agent_id}`)
    }
  }, [job, router])

  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.24em] text-gray-400">Build Pipeline</p>
        <h1 className="mt-3 text-3xl font-medium tracking-[-0.05em] text-gray-900 dark:text-gray-100">
          Building your agent
        </h1>
        <p className="mt-3 text-sm text-gray-400">
          This takes 30-90 seconds. You can safely leave and come back.
        </p>
      </div>

      <div className="panel mt-10 rounded-[28px] p-6 sm:p-8">
        {job?.prompt && (
          <div className="mb-6 rounded-[20px] border border-black/8 bg-white/75 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400">Prompt</p>
            <p className="mt-2 text-sm italic text-gray-600 dark:text-gray-300">
              &quot;{job.prompt}&quot;
            </p>
          </div>
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

      {job && (
        <p className="mt-6 text-center text-xs text-gray-400">
          Job ID: <code className="font-mono">{jobId}</code>
          {job.retry_count > 0 && ` · Retry ${job.retry_count}/3`}
        </p>
      )}
    </div>
  )
}

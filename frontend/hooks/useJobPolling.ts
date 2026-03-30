"use client"
// ============================================================
// frontend/hooks/useJobPolling.ts
// Polls GET /agents/jobs/{jobId} every 2s
// Stops automatically on terminal status
// ============================================================

import { useState, useEffect, useRef } from "react"
import { api, type JobStatus } from "@/lib/api"

const TERMINAL_STATUSES = new Set(["live", "needs_review", "failed"])
const POLL_INTERVAL_MS  = 2000

export function useJobPolling(jobId: string | null) {
  const [job,     setJob]     = useState<JobStatus | null>(null)
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!jobId) return

    const poll = async () => {
      setLoading(true)

      try {
        const data = await api.getJob(jobId)
        setJob(data)
        setError(null)

        // Stop polling on terminal status
        if (TERMINAL_STATUSES.has(data.status)) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          setLoading(false)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch job status")
        setLoading(false)
      }
    }

    // Poll immediately then every 2s
    poll()
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [jobId])

  return { job, error, loading }
}

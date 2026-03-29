"use client"
// ============================================================
// frontend/hooks/useRealtimeJob.ts
// Supabase Realtime subscription for live job updates
// Complements polling — gets instant updates without waiting 2s
// ============================================================

import { useState, useEffect } from "react"
import { subscribeToJob } from "@/lib/supabase"

export function useRealtimeJob(jobId: string | null) {
  const [realtimeStatus,  setRealtimeStatus]  = useState<string | null>(null)
  const [realtimePayload, setRealtimePayload] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    if (!jobId) return

    const unsubscribe = subscribeToJob(jobId, (payload) => {
      setRealtimeStatus(payload.status as string)
      setRealtimePayload(payload)
    })

    return unsubscribe
  }, [jobId])

  return { realtimeStatus, realtimePayload }
}
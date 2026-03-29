// ============================================================
// frontend/lib/supabase.ts
// Supabase client for Realtime subscriptions only
// All data fetching goes through FastAPI — this is purely
// for real-time job status streaming to the frontend
// ============================================================

import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 10 } },
})

// Subscribe to job status updates via Realtime broadcast
// Returns an unsubscribe function — call it on component unmount
export function subscribeToJob(
  jobId:    string,
  onUpdate: (payload: Record<string, unknown>) => void
): () => void {
  const channel = supabase
    .channel(`job-${jobId}`)
    .on("broadcast", { event: "status_update" }, ({ payload }) => {
      onUpdate(payload)
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
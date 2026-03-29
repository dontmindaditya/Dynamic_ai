"use client"
// ============================================================
// frontend/hooks/useAgentRuns.ts
// Fetches and paginates agent run logs
// ============================================================

import { useState, useEffect, useCallback } from "react"
import { api, type RunLog } from "@/lib/api"

export function useAgentRuns(agentId: string | null) {
  const [runs,    setRuns]    = useState<RunLog[]>([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [offset,  setOffset]  = useState(0)
  const LIMIT = 20

  const fetchRuns = useCallback(async (newOffset = 0) => {
    if (!agentId) return
    setLoading(true)
    try {
      const data = await api.getRuns(agentId, LIMIT, newOffset)
      setRuns(newOffset === 0 ? data.runs : (prev) => [...prev, ...data.runs])
      setTotal(data.total)
      setOffset(newOffset)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch runs")
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => { fetchRuns(0) }, [fetchRuns])

  const loadMore = () => fetchRuns(offset + LIMIT)
  const refresh  = () => fetchRuns(0)

  return {
    runs,
    total,
    loading,
    error,
    hasMore: runs.length < total,
    loadMore,
    refresh,
  }
}
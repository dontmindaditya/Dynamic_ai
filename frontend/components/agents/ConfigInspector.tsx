"use client"
// ============================================================
// frontend/components/agents/ConfigInspector.tsx
// ============================================================

import { useState } from "react"

interface Props { configPath: string | null }

export function ConfigInspector({ configPath }: Props) {
  const [open, setOpen] = useState(false)

  if (!configPath) return null

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
      >
        <span>Config JSON</span>
        <span className="text-gray-400">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="p-4 bg-white dark:bg-gray-900">
          <p className="text-xs text-gray-400 font-mono mb-2">{configPath}</p>
          <p className="text-xs text-gray-500">
            Config is stored in Supabase Storage. View it in your Supabase dashboard under Storage → agents.
          </p>
        </div>
      )}
    </div>
  )
}
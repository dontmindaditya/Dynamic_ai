"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"

export default function NewProjectPage() {
  const router = useRouter()
  const [name, setName]           = useState("")
  const [description, setDesc]    = useState("")
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  async function handleSubmit() {
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    try {
      const project = await api.createProject(name.trim(), description.trim() || undefined)
      router.push(`/projects/${project.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project")
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-xs uppercase tracking-[0.24em] text-gray-400">New Project</p>
      <h1 className="mt-2 mb-8 text-3xl font-medium tracking-[-0.05em] text-gray-900 dark:text-gray-100">
        Create a project
      </h1>

      <div className="rounded-[28px] border border-black/8 bg-white/70 p-6 dark:border-white/10 dark:bg-white/[0.03] space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Project name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Community Platform Launch"
            className="w-full rounded-2xl border border-black/8 bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:border-white/10 dark:bg-white/5 dark:focus:ring-white"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Description <span className="text-xs text-gray-400">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="What is this project about?"
            rows={3}
            className="w-full resize-none rounded-2xl border border-black/8 bg-white/90 px-4 py-3 text-sm leading-7 focus:outline-none focus:ring-2 focus:ring-black dark:border-white/10 dark:bg-white/5 dark:focus:ring-white"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading || !name.trim()}
          className="w-full rounded-full border border-black bg-black px-4 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:border-white dark:bg-white dark:text-black"
        >
          {loading ? "Creating..." : "Create Project"}
        </button>
      </div>
    </div>
  )
}

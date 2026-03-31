"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { api, type Project, type Deliverable } from "@/lib/api"

const STATUS_COLORS: Record<string, string> = {
  active:    "bg-black text-white dark:bg-white dark:text-black",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  blocked:   "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  archived:  "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
}

export default function ProjectDetailPage() {
  const { project_id } = useParams<{ project_id: string }>()

  const [project, setProject]           = useState<Project | null>(null)
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      api.getProject(project_id),
      api.listDeliverables(project_id),
    ])
      .then(([p, d]) => { setProject(p); setDeliverables(d.deliverables) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [project_id])

  if (loading) return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-4 sm:px-6 lg:px-8">
      <div className="h-10 w-64 rounded-2xl bg-gray-100 animate-pulse dark:bg-white/10" />
      <div className="h-40 rounded-[28px] bg-gray-100 animate-pulse dark:bg-white/10" />
    </div>
  )

  if (error || !project) return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-gray-600 dark:text-gray-400">{error ?? "Project not found"}</p>
    </div>
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="rounded-[28px] border border-black/8 bg-white/70 p-6 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-gray-400">Project</p>
            <h1 className="mt-2 text-3xl font-medium tracking-[-0.05em] text-gray-900 dark:text-gray-100">
              {project.name}
            </h1>
            {project.description && (
              <p className="mt-2 text-sm text-gray-500">{project.description}</p>
            )}
          </div>
          <Link
            href={`/projects/${project_id}/deliverables/new`}
            className="shrink-0 rounded-full border border-black bg-black px-4 py-2 text-sm font-medium text-white hover:-translate-y-0.5 hover:bg-gray-800 dark:border-white dark:bg-white dark:text-black"
          >
            Add Deliverable
          </Link>
        </div>
      </div>

      {/* Deliverables tree */}
      {deliverables.length === 0 ? (
        <div className="rounded-[28px] border border-black/8 bg-white/70 px-8 py-14 text-center dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500">No deliverables yet.</p>
          <Link href={`/projects/${project_id}/deliverables/new`} className="mt-3 inline-block text-sm font-medium underline text-gray-900 dark:text-gray-100">
            Add the first deliverable
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {deliverables.map((d) => (
            <Link key={d.id} href={`/projects/${project_id}/deliverables/${d.id}`}>
              <div className="group rounded-[24px] border border-black/8 bg-white/70 p-5 transition-all hover:-translate-y-0.5 hover:border-black/20 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20">
                <div className="flex items-start gap-4">
                  {/* Tree line indicator */}
                  <div className="mt-1 flex flex-col items-center">
                    <div className="h-2 w-2 rounded-full bg-gray-400 dark:bg-gray-500" />
                    <div className="mt-1 h-full w-px bg-gray-200 dark:bg-white/10" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 dark:text-gray-100">{d.title}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[d.status] ?? STATUS_COLORS.active}`}>
                        {d.status}
                      </span>
                      {d.owner_role && (
                        <span className="rounded-full border border-black/8 px-2 py-0.5 text-xs text-gray-500 dark:border-white/10 dark:text-gray-400">
                          {d.owner_role}
                        </span>
                      )}
                      {d.agent_id && (
                        <span className="rounded-full border border-black/8 bg-gray-50 px-2 py-0.5 text-xs text-gray-500 dark:border-white/10 dark:bg-white/[0.03]">
                          agent assigned
                        </span>
                      )}
                    </div>
                    {d.description && (
                      <p className="mt-1 text-sm text-gray-500 line-clamp-1">{d.description}</p>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

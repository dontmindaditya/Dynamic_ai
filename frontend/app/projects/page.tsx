"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { api, type Project } from "@/lib/api"

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    api.listProjects()
      .then((r) => setProjects(r.projects))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-gray-400">Workspace</p>
          <h1 className="mt-2 text-3xl font-medium tracking-[-0.05em] text-gray-900 dark:text-gray-100">
            Projects
          </h1>
        </div>
        <Link
          href="/projects/new"
          className="rounded-full border border-black bg-black px-4 py-2 text-sm font-medium text-white hover:-translate-y-0.5 hover:bg-gray-800 dark:border-white dark:bg-white dark:text-black"
        >
          New Project
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => <div key={i} className="h-24 rounded-[24px] border border-black/8 bg-white/70 animate-pulse dark:border-white/10 dark:bg-white/5" />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-[28px] border border-black/8 bg-white/70 px-8 py-16 text-center dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500">No projects yet.</p>
          <Link href="/projects/new" className="mt-4 inline-block text-sm font-medium text-gray-900 underline dark:text-gray-100">
            Create your first project
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`}>
              <div className="group rounded-[24px] border border-black/8 bg-white/70 p-5 transition-all hover:-translate-y-0.5 hover:border-black/20 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <h3 className="font-medium tracking-[-0.02em] text-gray-900 dark:text-gray-100">{p.name}</h3>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    p.status === "active"
                      ? "bg-black text-white dark:bg-white dark:text-black"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                  }`}>{p.status}</span>
                </div>
                {p.description && (
                  <p className="line-clamp-2 text-sm text-gray-500">{p.description}</p>
                )}
                <p className="mt-4 text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString()}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

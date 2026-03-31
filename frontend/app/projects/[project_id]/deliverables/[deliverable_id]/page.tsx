"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { api, type Deliverable, type Task, type Agent } from "@/lib/api"

const STATUS_CHIP: Record<string, string> = {
  pending:    "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  processing: "bg-black text-white dark:bg-white dark:text-black",
  done:       "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100",
  blocked:    "bg-gray-900 text-white dark:bg-gray-100 dark:text-black",
}

const PRIORITY_DOT: Record<string, string> = {
  low:    "bg-gray-300",
  normal: "bg-gray-500",
  high:   "bg-black dark:bg-white",
}

export default function DeliverableDetailPage() {
  const { project_id, deliverable_id } = useParams<{ project_id: string; deliverable_id: string }>()

  const [deliverable, setDeliverable] = useState<Deliverable | null>(null)
  const [tasks, setTasks]             = useState<Task[]>([])
  const [selected, setSelected]       = useState<Task | null>(null)
  const [loading, setLoading]         = useState(true)

  // Agent assignment
  const [liveAgents, setLiveAgents]     = useState<Agent[]>([])
  const [assigningAgent, setAssigning]  = useState("")
  const [savingAgent, setSavingAgent]   = useState(false)

  // New task form
  const [newTitle, setNewTitle] = useState("")
  const [newDesc, setNewDesc]   = useState("")
  const [newPrio, setNewPrio]   = useState("normal")
  const [creating, setCreating] = useState(false)
  const [formOpen, setFormOpen] = useState(false)

  const fetchTasks = useCallback(() => {
    api.listTasks(deliverable_id).then((r) => setTasks(r.tasks))
  }, [deliverable_id])

  useEffect(() => {
    Promise.all([
      api.getDeliverable(project_id, deliverable_id),
      api.listTasks(deliverable_id),
      api.listAgents(),
    ])
      .then(([d, t, a]) => {
        setDeliverable(d)
        setTasks(t.tasks)
        setLiveAgents(a.agents.filter((ag) => ag.status === "live"))
        if (d.agent_id) setAssigning(d.agent_id)
      })
      .finally(() => setLoading(false))
  }, [project_id, deliverable_id])

  // Keep selected task in sync with polled tasks
  useEffect(() => {
    if (!selected) return
    const latest = tasks.find((t) => t.id === selected.id)
    if (latest && latest !== selected) setSelected(latest)
  }, [tasks, selected])

  // Poll while any task is processing
  useEffect(() => {
    const processing = tasks.filter((t) => t.status === "processing")
    if (!processing.length) return
    const interval = setInterval(fetchTasks, 3000)
    return () => clearInterval(interval)
  }, [tasks, fetchTasks])

  async function handleAssignAgent() {
    if (!assigningAgent || !deliverable) return
    setSavingAgent(true)
    try {
      const updated = await api.updateDeliverable(project_id, deliverable_id, { agent_id: assigningAgent })
      setDeliverable(updated)
    } finally {
      setSavingAgent(false)
    }
  }

  async function handleCreateTask() {
    if (!newTitle.trim()) return
    setCreating(true)
    try {
      const task = await api.createTask(deliverable_id, {
        title:       newTitle.trim(),
        description: newDesc.trim() || undefined,
        priority:    newPrio,
      })
      setTasks((prev) => [...prev, task])
      setNewTitle(""); setNewDesc(""); setNewPrio("normal")
      setFormOpen(false)
      setSelected(task)
    } finally {
      setCreating(false)
    }
  }

  async function handleRetry(task: Task) {
    try {
      const updated = await api.retryTask(deliverable_id, task.id)
      setTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t))
      setSelected(updated)
    } catch (err) {
      console.error("Retry failed:", err)
    }
  }

  async function refreshTask(task: Task) {
    const updated = await api.getTask(deliverable_id, task.id)
    setTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t))
    setSelected((prev) => prev?.id === updated.id ? updated : prev)
  }

  if (loading) return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="h-10 w-72 rounded-2xl bg-gray-100 animate-pulse dark:bg-white/10 mb-6" />
      <div className="h-80 rounded-[28px] bg-gray-100 animate-pulse dark:bg-white/10" />
    </div>
  )

  if (!deliverable) return null

  const hasAgent     = !!deliverable.agent_id
  const pendingCount = tasks.filter((t) => t.status === "pending").length

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 space-y-5">

      {/* Header */}
      <div className="rounded-[28px] border border-black/8 bg-white/70 p-6 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-gray-400">Deliverable</p>
            <h1 className="mt-2 text-2xl font-medium tracking-[-0.04em] text-gray-900 dark:text-gray-100">
              {deliverable.title}
            </h1>
            <div className="mt-2 flex flex-wrap gap-2">
              {deliverable.owner_role && (
                <span className="rounded-full border border-black/8 px-2.5 py-0.5 text-xs text-gray-500 dark:border-white/10">
                  {deliverable.owner_role}
                </span>
              )}
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                hasAgent
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "border border-black/8 text-gray-400 dark:border-white/10"
              }`}>
                {hasAgent ? "agent live" : "no agent"}
              </span>
            </div>
          </div>
          <button
            onClick={() => setFormOpen((v) => !v)}
            className="shrink-0 rounded-full border border-black bg-black px-4 py-2 text-sm font-medium text-white hover:-translate-y-0.5 hover:bg-gray-800 dark:border-white dark:bg-white dark:text-black"
          >
            + Add Task
          </button>
        </div>
      </div>

      {/* No agent warning + assignment panel */}
      {!hasAgent && (
        <div className="rounded-[24px] border border-black/8 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
            No agent assigned
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Tasks will stay <span className="font-medium">pending</span> until a live agent is assigned to this deliverable.
            {pendingCount > 0 && ` ${pendingCount} task${pendingCount > 1 ? "s" : ""} waiting.`}
          </p>
          <div className="flex gap-2">
            <select
              value={assigningAgent}
              onChange={(e) => setAssigning(e.target.value)}
              className="flex-1 rounded-2xl border border-black/8 bg-white/90 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:border-white/10 dark:bg-white/5 dark:focus:ring-white"
            >
              <option value="">Select a live agent…</option>
              {liveAgents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <button
              onClick={handleAssignAgent}
              disabled={savingAgent || !assigningAgent}
              className="rounded-full border border-black bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:border-white dark:bg-white dark:text-black"
            >
              {savingAgent ? "Saving…" : "Assign"}
            </button>
          </div>
          {liveAgents.length === 0 && (
            <p className="mt-3 text-xs text-gray-400">
              No live agents yet —{" "}
              <a href="/agents/new" className="underline">build one first</a>.
            </p>
          )}
        </div>
      )}

      {/* Pending tasks banner — agent now assigned, offer bulk retry */}
      {hasAgent && pendingCount > 0 && (
        <div className="flex items-center justify-between rounded-[20px] border border-black/8 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {pendingCount} task{pendingCount > 1 ? "s" : ""} waiting to run
          </p>
          <button
            onClick={() => tasks.filter((t) => t.status === "pending").forEach(handleRetry)}
            className="rounded-full border border-black bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 dark:border-white dark:bg-white dark:text-black"
          >
            Run all pending
          </button>
        </div>
      )}

      {/* New task form */}
      {formOpen && (
        <div className="rounded-[24px] border border-black/8 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.03] space-y-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">New task</p>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Task title"
            className="w-full rounded-2xl border border-black/8 bg-white/90 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:border-white/10 dark:bg-white/5 dark:focus:ring-white"
          />
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description — the agent will use this as its instruction"
            rows={3}
            className="w-full resize-none rounded-2xl border border-black/8 bg-white/90 px-4 py-2.5 text-sm leading-7 focus:outline-none focus:ring-2 focus:ring-black dark:border-white/10 dark:bg-white/5 dark:focus:ring-white"
          />
          <div className="flex items-center gap-3">
            <select
              value={newPrio}
              onChange={(e) => setNewPrio(e.target.value)}
              className="rounded-2xl border border-black/8 bg-white/90 px-3 py-2 text-xs focus:outline-none dark:border-white/10 dark:bg-white/5"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
            <button
              onClick={handleCreateTask}
              disabled={creating || !newTitle.trim()}
              className="rounded-full border border-black bg-black px-4 py-2 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:border-white dark:bg-white dark:text-black"
            >
              {creating ? "Creating…" : "Create Task"}
            </button>
            <button onClick={() => setFormOpen(false)} className="text-xs text-gray-400 hover:text-gray-600">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Task list + detail */}
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">

        {/* Task list */}
        <div className="space-y-2">
          {tasks.length === 0 ? (
            <div className="rounded-[24px] border border-black/8 bg-white/70 px-6 py-12 text-center text-sm text-gray-500 dark:border-white/10 dark:bg-white/[0.03]">
              No tasks yet — add the first one above.
            </div>
          ) : tasks.map((task) => (
            <button
              key={task.id}
              onClick={() => setSelected(task)}
              className={`w-full rounded-[20px] border px-4 py-3.5 text-left transition-all ${
                selected?.id === task.id
                  ? "border-black/20 bg-white shadow-sm dark:border-white/20 dark:bg-white/10"
                  : "border-black/8 bg-white/70 hover:border-black/15 dark:border-white/10 dark:bg-white/[0.03]"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[task.priority]}`} />
                <span className="flex-1 text-sm font-medium text-gray-900 line-clamp-1 dark:text-gray-100">
                  {task.title}
                </span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CHIP[task.status]}`}>
                  {task.status === "processing" ? "running…" : task.status}
                </span>
              </div>
              {task.description && (
                <p className="mt-1 ml-5 text-xs text-gray-500 line-clamp-1">{task.description}</p>
              )}
            </button>
          ))}
        </div>

        {/* Task detail panel */}
        {selected && (
          <div className="rounded-[24px] border border-black/8 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.03] space-y-4 self-start">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-6">{selected.title}</h3>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CHIP[selected.status]}`}>
                {selected.status}
              </span>
            </div>

            {selected.description && (
              <p className="text-xs leading-6 text-gray-500">{selected.description}</p>
            )}

            {selected.status === "pending" && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">
                  {hasAgent ? "Task is queued." : "No agent assigned — assign one above to run this task."}
                </p>
                {hasAgent && (
                  <button
                    onClick={() => handleRetry(selected)}
                    className="rounded-full border border-black bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 dark:border-white dark:bg-white dark:text-black"
                  >
                    Run now
                  </button>
                )}
              </div>
            )}

            {selected.status === "processing" && (
              <div className="rounded-2xl border border-black/8 bg-black px-4 py-3 text-xs text-white dark:border-white/10 dark:bg-white dark:text-black">
                Agent is working on this task...
              </div>
            )}

            {selected.status === "blocked" && selected.blockers && selected.blockers.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Error</p>
                {selected.blockers.map((b, i) => (
                  <p key={i} className="text-xs leading-5 text-gray-700 dark:text-gray-300 font-mono bg-gray-50 dark:bg-white/5 rounded-lg px-3 py-2 break-all">
                    {b}
                  </p>
                ))}
                <button
                  onClick={() => handleRetry(selected)}
                  className="rounded-full border border-black bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 dark:border-white dark:bg-white dark:text-black"
                >
                  Retry
                </button>
              </div>
            )}

            {selected.output && Object.keys(selected.output).length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Agent Output</p>
                {Object.entries(selected.output).map(([key, value]) => (
                  <div key={key}>
                    <p className="text-xs font-medium text-gray-500 mb-0.5 capitalize">{key.replace(/_/g, " ")}</p>
                    <p className="text-xs leading-6 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => refreshTask(selected)}
              className="text-xs text-gray-400 underline hover:text-gray-600 dark:hover:text-gray-300"
            >
              Refresh
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

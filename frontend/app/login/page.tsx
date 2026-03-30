"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {
  const router  = useRouter()
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push("/agents")
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-24">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.24em] text-gray-400">Sign in</p>
        <h1 className="mt-2 text-3xl font-medium tracking-[-0.05em] text-gray-900 dark:text-gray-100">
          Welcome back
        </h1>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-2xl border border-black/8 bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:border-white/10 dark:bg-white/5 dark:text-gray-100 dark:focus:ring-white"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-2xl border border-black/8 bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:border-white/10 dark:bg-white/5 dark:text-gray-100 dark:focus:ring-white"
          />
        </div>

        {error && (
          <p className="rounded-2xl border border-black/8 bg-gray-100/80 px-4 py-3 text-sm text-gray-900 dark:border-white/10 dark:bg-gray-800 dark:text-gray-100">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full border border-black bg-black px-6 py-3 text-sm font-medium text-white hover:-translate-y-0.5 hover:bg-gray-800 disabled:opacity-50 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-200"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  )
}

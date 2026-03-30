"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

export function AuthNav() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-medium text-gray-700 hover:border-black/20 hover:text-black dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white"
      >
        Sign in
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-xs text-gray-400 sm:block">{user.email}</span>
      <button
        onClick={handleSignOut}
        className="rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-medium text-gray-700 hover:border-black/20 hover:text-black dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:border-white/20"
      >
        Sign out
      </button>
    </div>
  )
}

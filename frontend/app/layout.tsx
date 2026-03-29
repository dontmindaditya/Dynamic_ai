// ============================================================
// frontend/app/layout.tsx
// Root layout — ADD these to your existing layout.tsx
// Do NOT replace your entire layout — only add what is marked NEW
// ============================================================

import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Link from "next/link"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title:       "FairQuanta | AI Agent Factory",
  description: "Build, test, and deploy custom AI agents without code.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>

        {/*
          ── INSTRUCTION ─────────────────────────────────────
          If you already have a <nav> in your layout, just add
          these two links inside it:

          <Link href="/agents">Agents</Link>
          <Link href="/agents/new">Build Agent</Link>

          If you don't have a nav yet, use this one:
          ─────────────────────────────────────────────────── */}
        <nav className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">

            <Link href="/" className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
              FairQuanta
            </Link>

            <div className="flex items-center gap-6 text-sm">
              {/* ── Keep your existing nav links here ── */}

              {/* NEW: Agent Factory links */}
              <Link
                href="/agents"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                Agents
              </Link>

              <Link
                href="/agents/new"
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
              >
                Build Agent
              </Link>
            </div>

          </div>
        </nav>

        <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
          {children}
        </main>

      </body>
    </html>
  )
}
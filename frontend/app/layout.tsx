import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import Link from "next/link"
import { AuthNav } from "@/components/AuthNav"
import "./globals.css"

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

export const metadata: Metadata = {
  title: "FairQuanta | AI Agent Factory",
  description: "Build, test, and deploy custom AI agents without code.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${geistSans.className}`}>
        <nav className="sticky top-0 z-50 border-b border-black/5 bg-white/72 backdrop-blur-xl dark:border-white/10 dark:bg-black/70">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-3 text-sm font-medium tracking-[-0.02em] text-gray-950 dark:text-white">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-black/10 bg-black text-xs font-semibold text-white dark:border-white/15 dark:bg-white dark:text-black">
                F
              </span>
              <span>FairQuanta</span>
            </Link>

            <div className="flex items-center gap-3 sm:gap-6 text-sm">
              <Link
                href="/agents"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white"
              >
                Agents
              </Link>

              <Link
                href="/settings"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white"
              >
                Settings
              </Link>

              <Link
                href="/agents/new"
                className="rounded-full border border-black bg-black px-4 py-2 text-white shadow-[0_10px_30px_rgba(0,0,0,0.14)] hover:-translate-y-0.5 hover:bg-gray-800 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                Build Agent
              </Link>

              <AuthNav />
            </div>
          </div>
        </nav>

        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  )
}

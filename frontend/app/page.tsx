// ============================================================
// frontend/app/page.tsx
// Root home page — add Agent Factory section to existing page
// If you already have a home page, just add the hero section below
// ============================================================

import Link from "next/link"

export default function HomePage() {
  return (
    <div className="max-w-5xl mx-auto px-4">

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="py-20 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white text-xs font-medium">
          NEW — AI Agent Factory
        </div>

        <h1 className="text-4xl sm:text-5xl font-semibold text-gray-900 dark:text-gray-100 leading-tight">
          Build AI agents<br />without writing code
        </h1>

        <p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
          Describe what you want your agent to do in plain English.
          FairQuanta builds, tests, and deploys it in under 90 seconds.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link
            href="/agents/new"
            className="px-6 py-3 rounded-xl bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black font-medium transition-colors"
          >
            Build your first agent
          </Link>
          <Link
            href="/agents"
            className="px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 font-medium transition-colors"
          >
            View my agents
          </Link>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────── */}
      <section className="py-16 space-y-10">
        <h2 className="text-2xl font-semibold text-center text-gray-900 dark:text-gray-100">
          How it works
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              step: "1",
              title: "Describe",
              desc: "Type what you want your agent to do in plain English. No prompting skills needed.",
            },
            {
              step: "2",
              title: "Build",
              desc: "FairQuanta generates a config, runs it in a sandbox, and reviews the output automatically.",
            },
            {
              step: "3",
              title: "Deploy",
              desc: "Get an embed widget and REST API endpoint. Add it to any website with one script tag.",
            },
          ].map(({ step, title, desc }) => (
            <div
              key={step}
              className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 space-y-3"
            >
              <div className="w-8 h-8 rounded-lg bg-black dark:bg-white flex items-center justify-center text-white dark:text-black text-sm font-bold">
                {step}
              </div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">{title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="py-16 text-center">
        <div className="rounded-2xl bg-black dark:bg-white px-8 py-12 space-y-4">
          <h2 className="text-2xl font-semibold text-white dark:text-black">
            Ready to build your first agent?
          </h2>
          <p className="text-gray-300 dark:text-gray-700 text-sm">
            Free to start. No credit card required.
          </p>
          <Link
            href="/agents/new"
            className="inline-flex px-6 py-3 rounded-xl bg-white text-black dark:bg-black dark:text-white font-medium hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
          >
            Get started →
          </Link>
        </div>
      </section>

    </div>
  )
}

import Link from "next/link"

const stats = [
  { value: "< 90 sec", label: "Prompt to live agent" },
  { value: "1 script", label: "Embeddable on any site" },
  { value: "Full logs", label: "Runs, steps, and tokens" },
]

const features = [
  {
    title: "Describe",
    desc: "Start from plain language. The interface guides the prompt without making you think in config files.",
  },
  {
    title: "Validate",
    desc: "Each build moves through a visible pipeline so you can see progress, retries, and failures cleanly.",
  },
  {
    title: "Deploy",
    desc: "Once live, you get a playground, embed code, and request logs in a single workspace.",
  },
]

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6 lg:px-8">
      <section className="grid gap-8 pb-16 pt-8 lg:grid-cols-[1.25fr_0.9fr] lg:items-end">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
            <span className="h-2 w-2 rounded-full bg-black dark:bg-white" />
            AI Agent Factory
          </div>

          <div className="space-y-5">
            <h1 className="max-w-3xl text-5xl font-medium tracking-[-0.06em] text-gray-950 dark:text-white sm:text-6xl lg:text-7xl">
              Build and deploy AI agents with a product-grade interface.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-gray-500 dark:text-gray-400 sm:text-lg">
              FairQuanta turns a plain-English request into a tested agent, complete with a hosted endpoint,
              widget embed, and run history that feels ready for production from day one.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/agents/new"
              className="inline-flex items-center justify-center rounded-full border border-black bg-black px-6 py-3 text-sm font-medium text-white shadow-[0_20px_60px_rgba(0,0,0,0.16)] hover:-translate-y-0.5 hover:bg-gray-800 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-200"
            >
              Start building
            </Link>
            <Link
              href="/agents"
              className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/80 px-6 py-3 text-sm font-medium text-gray-700 hover:border-black/20 hover:text-black dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white"
            >
              View dashboard
            </Link>
          </div>

          <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-black/8 bg-white/72 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="text-xl font-medium tracking-[-0.04em] text-gray-950 dark:text-white">{stat.value}</div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="panel rounded-[28px] p-4 sm:p-5">
          <div className="rounded-[24px] border border-black/8 bg-white/92 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.12)] dark:border-white/10 dark:bg-black/80">
            <div className="flex items-center justify-between border-b border-black/8 pb-4 dark:border-white/10">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-gray-400">Factory Preview</p>
                <h2 className="mt-2 text-lg font-medium tracking-[-0.03em] text-gray-950 dark:text-white">Agent release pipeline</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-black/80 dark:bg-white/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-black/30 dark:bg-white/30" />
                <span className="h-2.5 w-2.5 rounded-full bg-black/15 dark:bg-white/15" />
              </div>
            </div>

            <div className="space-y-4 py-5">
              {[
                ["Prompt", "Research any company URL and write a tailored outbound email."],
                ["Model", "OpenAI GPT-4o"],
                ["Result", "Spec generated, sandbox validated, deploy package prepared."],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-black/8 bg-gray-50/90 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400">{label}</p>
                  <p className="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-300">{value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-3 border-t border-black/8 pt-4 text-sm dark:border-white/10">
              {[
                "Generate config from plain English",
                "Run sandbox validation before publish",
                "Ship widget and REST API output",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-black/10 text-xs dark:border-white/10">+</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 border-t border-black/8 py-16 dark:border-white/10 lg:grid-cols-3">
        {features.map((item, index) => (
          <div key={item.title} className="panel rounded-[24px] p-6">
            <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-sm font-medium dark:border-white/10">
              0{index + 1}
            </div>
            <h3 className="text-xl font-medium tracking-[-0.03em] text-gray-950 dark:text-white">{item.title}</h3>
            <p className="mt-3 text-sm leading-7 text-gray-500 dark:text-gray-400">{item.desc}</p>
          </div>
        ))}
      </section>

      <section className="panel rounded-[32px] px-6 py-8 sm:px-10 sm:py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.24em] text-gray-400">Launch Faster</p>
            <h2 className="mt-3 text-3xl font-medium tracking-[-0.05em] text-gray-950 dark:text-white sm:text-4xl">
              A dashboard that feels closer to shipping infrastructure than a toy demo.
            </h2>
            <p className="mt-3 text-sm leading-7 text-gray-500 dark:text-gray-400">
              Clean surfaces, sharp contrast, and a focused workspace inspired by modern developer tools.
            </p>
          </div>
          <Link
            href="/agents/new"
            className="inline-flex w-full items-center justify-center rounded-full border border-black bg-black px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-200 lg:w-auto"
          >
            Create your first agent
          </Link>
        </div>
      </section>
    </div>
  )
}

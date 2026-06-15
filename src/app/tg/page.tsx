import Link from "next/link"
import { getT } from "@/lib/i18n/server"
import { AGENTS } from "@/lib/agents/registry"
import { Aurora } from "@/components/landing/animations"
import { TgReady } from "@/components/tg/tg-ready"

export const dynamic = "force-dynamic"

export default async function TgHubPage() {
  const t = await getT()

  return (
    <main className="relative mx-auto max-w-md overflow-hidden px-4 pb-12 pt-5">
      <TgReady />
      <Aurora className="opacity-50" />

      <div className="brand-rule -mx-4 mb-4 h-[3px]" />

      <header className="relative mb-5">
        <p className="brand-eyebrow font-mono-label text-[var(--brand-red)]">AI ADMISSIONS COPILOT</p>
        <h1 className="font-display mt-2 text-3xl uppercase leading-[0.95]">
          <span className="text-[var(--brand-red)]">AI</span>-агенты
          <br />
          на поступление
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Выбери агента — он проведёт за руку</p>
      </header>

      <section className="relative grid grid-cols-2 gap-3">
        {AGENTS.map((a) => {
          const Icon = a.icon
          const meta = t.tools[a.slug]
          return (
            <Link
              key={a.slug}
              href={`/tg/agent/${a.slug}`}
              className="card-hover relative rounded-2xl border border-border bg-card p-3"
            >
              {a.isNew && (
                <span className="font-mono-label absolute right-2 top-2 rounded bg-[var(--brand-red)] px-1.5 py-0.5 text-white">
                  NEW
                </span>
              )}
              <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--brand-red-soft)] text-[var(--brand-red)]">
                <Icon className="h-5 w-5" />
              </span>
              <div className="mt-2 text-sm font-semibold leading-tight">{meta.title}</div>
              <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{meta.desc}</div>
            </Link>
          )
        })}
      </section>
    </main>
  )
}

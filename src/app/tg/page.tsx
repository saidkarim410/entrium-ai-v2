import Link from "next/link"
import { getT } from "@/lib/i18n/server"
import { AGENTS } from "@/lib/agents/registry"
import { Aurora } from "@/components/landing/animations"
import { TgReady } from "@/components/tg/tg-ready"
import { MISSIONS } from "@/lib/agent/missions"
import { Zap, Briefcase, ShieldCheck, Calendar, UserPen, type LucideIcon } from "lucide-react"

export const dynamic = "force-dynamic"

const MISSION_ICONS: Record<string, LucideIcon> = { Zap, Briefcase, ShieldCheck, Calendar }

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

      {/* Profile entry card */}
      <Link
        href="/tg/profile"
        className="card-hover mb-5 flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--brand-red-soft)] text-[var(--brand-red)]">
          <UserPen className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold leading-tight">Мой профиль</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Заполни о себе — агенты ответят персонально
          </div>
        </div>
        <span className="text-muted-foreground">→</span>
      </Link>

      <p className="brand-eyebrow font-mono-label mb-3 text-muted-foreground">Миссии</p>
      <section className="relative mb-6 space-y-3">
        {MISSIONS.map((m) => {
          const Icon = MISSION_ICONS[m.icon] ?? Zap
          return (
            <Link
              key={m.id}
              href={`/tg/mission/${m.id}`}
              className="card-hover flex items-start gap-3 rounded-2xl border border-border bg-card p-3"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--brand-red-soft)] text-[var(--brand-red)]">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold leading-tight">{m.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{m.subtitle}</div>
                <div className="font-mono-label mt-1 text-[10px] text-muted-foreground">
                  {m.steps.length} шага · {m.duration}
                </div>
              </div>
            </Link>
          )
        })}
      </section>

      <p className="brand-eyebrow font-mono-label mb-3 text-muted-foreground">Агенты</p>
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

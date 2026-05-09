import Link from "next/link"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/supabase/server"
import { listProfileSnapshots, type ProfileSnapshot } from "@/lib/profile-snapshots/actions"
import { profileCompleteness, type ApplicantProfile } from "@/lib/applicant/types"
import { ArrowLeft, TrendingUp, Calendar, ListChecks } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ProfileHistoryPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login?next=/profile/history")

  const snaps = await listProfileSnapshots(180)

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border/40 px-4 sm:px-6 shrink-0">
        <div className="min-w-0 flex-1 flex items-center gap-3">
          <Link href="/settings" className="text-cream-3 hover:text-gold transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-display text-base sm:text-lg tracking-tight truncate">
              Profile growth
            </h1>
            <p className="font-mono-label text-cream-3 mt-0.5 truncate">
              {snaps.length} snapshot{snaps.length === 1 ? "" : "s"} · автоматически каждый день когда меняешь профиль
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {snaps.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-card/20 p-10 text-center space-y-3">
              <TrendingUp className="h-10 w-10 text-cream-3 mx-auto" />
              <p className="font-display text-lg">История пока пустая</p>
              <p className="font-serif text-sm text-cream-2 max-w-md mx-auto">
                Снимки создаются автоматически когда ты сохраняешь профиль. Зайди
                в <Link href="/settings" className="text-gold hover:underline">/settings</Link>{" "}
                и сохрани изменения — увидишь первую точку.
              </p>
            </div>
          ) : (
            <>
              <CompletenessChart snapshots={snaps} />
              <Diff snapshots={snaps} />
              <SnapshotList snapshots={snaps} />
            </>
          )}
        </div>
      </div>
    </>
  )
}

function CompletenessChart({ snapshots }: { snapshots: ProfileSnapshot[] }) {
  const W = 720
  const H = 200
  const PAD = 24
  const data = snapshots.map((s) => ({
    date: s.snapshot_date,
    completeness: s.completeness ?? profileCompleteness(s.applicant_data),
    apps: s.apps_count,
  }))
  const maxC = 100
  const minDate = new Date(data[0]?.date ?? new Date())
  const maxDate = new Date(data[data.length - 1]?.date ?? new Date())
  const span = Math.max(1, maxDate.getTime() - minDate.getTime())

  function x(d: string): number {
    const t = new Date(d).getTime()
    return PAD + ((t - minDate.getTime()) / span) * (W - 2 * PAD)
  }
  function y(v: number): number {
    return H - PAD - (v / maxC) * (H - 2 * PAD)
  }

  const linePath =
    data.length === 1
      ? `M ${x(data[0].date)},${y(data[0].completeness)}`
      : data
          .map((d, i) => `${i === 0 ? "M" : "L"} ${x(d.date).toFixed(1)},${y(d.completeness).toFixed(1)}`)
          .join(" ")

  const areaPath = data.length > 1
    ? `${linePath} L ${x(data[data.length - 1].date).toFixed(1)},${H - PAD} L ${x(data[0].date).toFixed(1)},${H - PAD} Z`
    : ""

  const last = data[data.length - 1]
  const first = data[0]
  const delta = last.completeness - first.completeness

  return (
    <section className="rounded-xl border border-border bg-card/40 p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="font-mono-label text-[10px] text-cream-3 uppercase tracking-wider">
            Profile completeness
          </p>
          <p className="font-display text-2xl mt-0.5">
            {last.completeness}%
            {delta !== 0 && (
              <span className={delta > 0 ? "text-emerald-400 text-sm ml-2" : "text-rose-400 text-sm ml-2"}>
                {delta > 0 ? "+" : ""}{delta}% от {first.date}
              </span>
            )}
          </p>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Completeness over time">
        {/* Y grid */}
        {[0, 25, 50, 75, 100].map((g) => (
          <g key={g}>
            <line
              x1={PAD}
              y1={y(g)}
              x2={W - PAD}
              y2={y(g)}
              stroke="rgba(180,170,150,0.15)"
              strokeDasharray="2 4"
            />
            <text x={PAD - 6} y={y(g) + 3} textAnchor="end" className="fill-cream-3 text-[10px] font-mono">
              {g}
            </text>
          </g>
        ))}
        {/* Area */}
        {areaPath && <path d={areaPath} fill="rgba(217,176,116,0.10)" />}
        {/* Line */}
        <path d={linePath} fill="none" stroke="#d9b074" strokeWidth="2" strokeLinejoin="round" />
        {/* Points */}
        {data.map((d, i) => (
          <circle key={i} cx={x(d.date)} cy={y(d.completeness)} r="3" fill="#d9b074" />
        ))}
      </svg>
    </section>
  )
}

function Diff({ snapshots }: { snapshots: ProfileSnapshot[] }) {
  if (snapshots.length < 2) return null
  const first = snapshots[0]
  const last = snapshots[snapshots.length - 1]
  const days = Math.round((new Date(last.snapshot_date).getTime() - new Date(first.snapshot_date).getTime()) / 86_400_000)

  const deltas: Array<{ label: string; from: string; to: string }> = []

  function diff<K extends keyof ApplicantProfile>(section: K, key: keyof NonNullable<ApplicantProfile[K]>, label: string) {
    const a = ((first.applicant_data?.[section] as Record<string, unknown> | undefined)?.[key as string] ?? "") as string
    const b = ((last.applicant_data?.[section] as Record<string, unknown> | undefined)?.[key as string] ?? "") as string
    if ((a || b) && a !== b) deltas.push({ label, from: a || "—", to: b || "—" })
  }

  diff("academic", "gpa", "GPA")
  diff("academic", "sat", "SAT")
  diff("academic", "act", "ACT")
  diff("academic", "ielts", "IELTS")
  diff("academic", "toefl", "TOEFL")
  diff("academic", "duolingo", "Duolingo")
  diff("academic", "apIb", "AP/IB")
  diff("goals", "level", "Level")
  diff("goals", "major", "Major")
  diff("goals", "countries", "Countries")
  diff("goals", "targetUnis", "Target unis")

  if (last.apps_count !== first.apps_count) {
    deltas.push({ label: "Заявок", from: String(first.apps_count), to: String(last.apps_count) })
  }

  return (
    <section className="rounded-xl border border-border bg-card/40 p-4 sm:p-5 space-y-3">
      <p className="font-mono-label text-[10px] text-cream-3 uppercase tracking-wider">
        Что изменилось за {days} {days === 1 ? "день" : "дней"}
      </p>
      {deltas.length === 0 ? (
        <p className="text-sm font-serif text-cream-3">Никаких ключевых полей не менялось.</p>
      ) : (
        <ul className="space-y-1.5">
          {deltas.map((d, i) => (
            <li key={i} className="text-sm font-serif text-cream-2 flex items-start gap-2 flex-wrap">
              <span className="font-mono-label text-[10px] text-cream-3 uppercase mt-1 shrink-0 min-w-[80px]">
                {d.label}
              </span>
              <span className="text-cream-3 line-through">{d.from}</span>
              <span className="text-cream-3">→</span>
              <span className="text-gold font-medium">{d.to}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function SnapshotList({ snapshots }: { snapshots: ProfileSnapshot[] }) {
  // Newest first
  const reversed = [...snapshots].reverse()
  return (
    <section className="space-y-2">
      <p className="font-mono-label text-[10px] text-cream-3 uppercase tracking-wider">
        Все snapshots
      </p>
      <ul className="space-y-1.5">
        {reversed.map((s) => (
          <li
            key={s.id}
            className="rounded-lg border border-border bg-card/40 p-3 flex items-center gap-3"
          >
            <Calendar className="h-3.5 w-3.5 text-cream-3 shrink-0" />
            <span className="font-mono text-sm text-cream-2 tabular-nums w-[5.5rem]">
              {s.snapshot_date}
            </span>
            <span className="font-mono-label text-[11px] text-gold tabular-nums">
              {s.completeness}%
            </span>
            <span className="inline-flex items-center gap-1 font-mono-label text-[11px] text-cream-3 tabular-nums">
              <ListChecks className="h-3 w-3" />
              {s.apps_count}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

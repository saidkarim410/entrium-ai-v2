import { supabaseAdmin } from "@/lib/supabase/admin"
import { Award } from "lucide-react"
import { todayIso } from "@/lib/ai/temporal"

export const dynamic = "force-dynamic"

type Row = {
  id: string
  name: string
  provider: string | null
  provider_type: string | null
  country: string | null
  level: string | null
  status: string
  deadline: string | null
  edition_year: number | null
  source_url: string | null
  verified_at: string | null
  amount_usd: number | null
}

const STATUS_COLOR: Record<string, string> = {
  open: "bg-emerald-500/15 text-emerald-300",
  announced_soon: "bg-blue-500/15 text-blue-300",
  closed: "bg-slate-500/15 text-slate-300",
  archived: "bg-rose-500/15 text-rose-300",
  needs_review: "bg-amber-500/15 text-amber-300",
}

function normKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "")
}

/** Scholarship data quality (P1-01): statuses, duplicates, undated contests, verification coverage. */
export default async function AdminScholarshipsPage() {
  const { data, error } = await supabaseAdmin
    .from("scholarships")
    .select("id, name, provider, provider_type, country, level, status, deadline, edition_year, source_url, verified_at, amount_usd")
    .order("name")
    .limit(2000)
  const rows = (data ?? []) as Row[]
  const today = todayIso()

  const count = (f: (r: Row) => boolean) => rows.filter(f).length
  const byStatus = ["open", "announced_soon", "needs_review", "closed", "archived"].map((s) => [s, count((r) => r.status === s)] as const)
  const active = rows.filter((r) => r.status !== "archived")
  const dupGroups = Object.values(
    active.reduce<Record<string, Row[]>>((acc, r) => {
      ;(acc[normKey(r.name)] ??= []).push(r)
      return acc
    }, {})
  ).filter((g) => g.length > 1)
  const undated = active.filter((r) => !r.deadline)
  const staleOpen = active.filter((r) => r.status === "open" && r.deadline && r.deadline < today)
  const unverified = active.filter((r) => !r.verified_at).length
  const byType = ["government", "university", "international", "private", "other", null].map(
    (t) => [t ?? "—", count((r) => r.status !== "archived" && (r.provider_type ?? null) === t)] as const
  )
  const countries = Object.entries(
    active.reduce<Record<string, number>>((acc, r) => {
      const c = r.country ?? "—"
      acc[c] = (acc[c] ?? 0) + 1
      return acc
    }, {})
  ).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-gold/15">
          <Award className="h-5 w-5 text-gold" />
        </div>
        <div>
          <h1 className="font-display text-xl">Стипендии · качество данных</h1>
          <p className="font-mono-label text-[11px] text-cream-3">
            {active.length} активных записей · {unverified} без даты проверки · {countries.length} стран
          </p>
        </div>
      </div>
      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error.message}</div>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {byStatus.map(([s, n]) => (
          <div key={s} className="rounded-xl border border-border/60 bg-card/40 p-3">
            <span className={`rounded-full px-2 py-0.5 font-mono-label text-[10px] ${STATUS_COLOR[s] ?? ""}`}>{s}</span>
            <p className="font-display text-2xl mt-2">{n}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border/60 overflow-hidden">
          <div className="px-3 py-2 bg-card/60 font-display text-sm">Проверки</div>
          <table className="w-full text-xs">
            <tbody>
              <tr className="border-t border-border/40"><td className="px-3 py-1.5">Дубли по названию (активные)</td><td className="px-3 py-1.5 font-mono text-right">{dupGroups.length}</td></tr>
              <tr className="border-t border-border/40"><td className="px-3 py-1.5">«Открыт», но дедлайн уже прошёл</td><td className="px-3 py-1.5 font-mono text-right">{staleOpen.length}</td></tr>
              <tr className="border-t border-border/40"><td className="px-3 py-1.5">Без дедлайна (требуют проверки)</td><td className="px-3 py-1.5 font-mono text-right">{undated.length}</td></tr>
              <tr className="border-t border-border/40"><td className="px-3 py-1.5">Без источника</td><td className="px-3 py-1.5 font-mono text-right">{count((r) => r.status !== "archived" && !r.source_url)}</td></tr>
              <tr className="border-t border-border/40"><td className="px-3 py-1.5">Без даты проверки специалистом</td><td className="px-3 py-1.5 font-mono text-right">{unverified}</td></tr>
            </tbody>
          </table>
          {dupGroups.length > 0 && (
            <ul className="px-3 py-2 text-[11px] text-cream-2 space-y-1">
              {dupGroups.map((g) => (
                <li key={g[0].id}>{g[0].name} × {g.length}</li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-xl border border-border/60 overflow-hidden">
          <div className="px-3 py-2 bg-card/60 font-display text-sm">По типу организатора</div>
          <table className="w-full text-xs">
            <tbody>
              {byType.map(([t, n]) => (
                <tr key={t} className="border-t border-border/40"><td className="px-3 py-1.5 font-mono">{t}</td><td className="px-3 py-1.5 font-mono text-right">{n}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="rounded-xl border border-border/60 overflow-hidden lg:col-span-2">
          <div className="px-3 py-2 bg-card/60 font-display text-sm">Без дедлайна — очередь на проверку ({undated.length})</div>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="font-mono-label text-[10px] uppercase text-cream-3"><tr><th className="px-3 py-1.5 text-left">Стипендия</th><th className="px-3 py-1.5 text-left">Организатор</th><th className="px-3 py-1.5 text-left">Страна</th><th className="px-3 py-1.5 text-left">Ур.</th><th className="px-3 py-1.5 text-left">Источник</th></tr></thead>
              <tbody>
                {undated.map((r) => (
                  <tr key={r.id} className="border-t border-border/40">
                    <td className="px-3 py-1.5">{r.name}</td>
                    <td className="px-3 py-1.5 text-cream-2">{r.provider ?? "—"}</td>
                    <td className="px-3 py-1.5">{r.country ?? "—"}</td>
                    <td className="px-3 py-1.5 font-mono">{r.level ?? "—"}</td>
                    <td className="px-3 py-1.5">{r.source_url ? <a className="text-gold hover:underline" href={r.source_url} target="_blank" rel="noreferrer">открыть</a> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="rounded-xl border border-border/60 overflow-hidden lg:col-span-2">
          <div className="px-3 py-2 bg-card/60 font-display text-sm">Страны ({countries.length})</div>
          <p className="px-3 py-2 text-[11px] font-mono text-cream-2 leading-relaxed">
            {countries.map(([c, n]) => `${c} (${n})`).join(" · ")}
          </p>
        </section>
      </div>
    </div>
  )
}

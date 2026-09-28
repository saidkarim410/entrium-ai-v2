import { supabaseAdmin } from "@/lib/supabase/admin"
import { estimateCostUsd, isPricedModel, formatUsd, USD_TO_UZS } from "@/lib/ai/pricing"
import { Coins } from "lucide-react"

export const dynamic = "force-dynamic"

type Row = {
  user_id: string
  tool: string
  model: string
  input_tokens: number
  output_tokens: number
  cost_usd: number
  created_at: string
}

const WINDOW_DAYS = 30
const ROW_CAP = 20000

/** Start of the reporting window (kept out of the component body for the purity lint rule). */
function windowStartIso(): string {
  return new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString()
}

/** Cost = stored cost when present, else recomputed from tokens × current price (old rows stored 0). */
function rowCost(r: Row): number {
  const stored = Number(r.cost_usd) || 0
  return stored > 0 ? stored : estimateCostUsd(r.model, r.input_tokens, r.output_tokens)
}

function sum<T>(items: T[], f: (t: T) => number): number {
  return items.reduce((a, t) => a + f(t), 0)
}

/** AI cost analytics (CTO TZ §5 — «себестоимость активного пользователя»). */
export default async function AdminCostsPage() {
  const since = windowStartIso()
  const [{ data, error }, { data: pro }] = await Promise.all([
    supabaseAdmin
      .from("usage_events")
      .select("user_id, tool, model, input_tokens, output_tokens, cost_usd, created_at")
      .gte("created_at", since)
      .neq("tool", "__reserved__")
      .order("created_at", { ascending: false })
      .limit(ROW_CAP),
    supabaseAdmin.from("profiles").select("id").eq("tier", "pro"),
  ])
  const rows = (data ?? []) as Row[]
  const proIds = new Set((pro ?? []).map((p) => p.id as string))

  const total = sum(rows, rowCost)
  const inTok = sum(rows, (r) => r.input_tokens)
  const outTok = sum(rows, (r) => r.output_tokens)
  const users = new Set(rows.map((r) => r.user_id))
  const proUsers = [...users].filter((u) => proIds.has(u))
  const freeUsers = [...users].filter((u) => !proIds.has(u))
  const costOf = (ids: string[]) => sum(rows.filter((r) => ids.includes(r.user_id)), rowCost)
  const perActive = users.size ? total / users.size : 0
  const perPro = proUsers.length ? costOf(proUsers) / proUsers.length : 0
  const perFree = freeUsers.length ? costOf(freeUsers) / freeUsers.length : 0
  const unpriced = rows.filter((r) => !isPricedModel(r.model) && !(Number(r.cost_usd) > 0)).length

  const byTool = Object.entries(
    rows.reduce<Record<string, { calls: number; cost: number; out: number }>>((acc, r) => {
      const t = (acc[r.tool] ??= { calls: 0, cost: 0, out: 0 })
      t.calls += 1
      t.cost += rowCost(r)
      t.out += r.output_tokens
      return acc
    }, {})
  ).sort((a, b) => b[1].cost - a[1].cost)

  const byModel = Object.entries(
    rows.reduce<Record<string, { calls: number; cost: number }>>((acc, r) => {
      const m = (acc[r.model] ??= { calls: 0, cost: 0 })
      m.calls += 1
      m.cost += rowCost(r)
      return acc
    }, {})
  ).sort((a, b) => b[1].cost - a[1].cost)

  const byDay = Object.entries(
    rows.reduce<Record<string, { calls: number; cost: number; users: Set<string> }>>((acc, r) => {
      const d = r.created_at.slice(0, 10)
      const day = (acc[d] ??= { calls: 0, cost: 0, users: new Set() })
      day.calls += 1
      day.cost += rowCost(r)
      day.users.add(r.user_id)
      return acc
    }, {})
  ).sort((a, b) => (a[0] < b[0] ? 1 : -1))

  const topUsers = Object.entries(
    rows.reduce<Record<string, { calls: number; cost: number }>>((acc, r) => {
      const u = (acc[r.user_id] ??= { calls: 0, cost: 0 })
      u.calls += 1
      u.cost += rowCost(r)
      return acc
    }, {})
  )
    .sort((a, b) => b[1].cost - a[1].cost)
    .slice(0, 10)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-gold/15">
          <Coins className="h-5 w-5 text-gold" />
        </div>
        <div>
          <h1 className="font-display text-xl">Себестоимость AI · последние {WINDOW_DAYS} дней</h1>
          <p className="font-mono-label text-[11px] text-cream-3">
            {rows.length} вызовов{rows.length >= ROW_CAP ? ` (показаны первые ${ROW_CAP} — выборка усечена)` : ""} · {users.size} активных
            пользователей · курс {USD_TO_UZS.toLocaleString("ru-RU")} сум/$ (env USD_TO_UZS)
          </p>
        </div>
      </div>

      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error.message}</div>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Всего за период" value={formatUsd(total)} sub={`${Math.round(total * USD_TO_UZS).toLocaleString("ru-RU")} сум`} />
        <Stat label="На активного пользователя" value={formatUsd(perActive)} sub={`${Math.round(perActive * USD_TO_UZS).toLocaleString("ru-RU")} сум · ${users.size} чел.`} />
        <Stat label="На Pro-пользователя" value={formatUsd(perPro)} sub={`${proUsers.length} чел. · Pro $18/мес`} />
        <Stat label="На Free-пользователя" value={formatUsd(perFree)} sub={`${freeUsers.length} чел.`} />
      </div>
      <p className="font-mono-label text-[11px] text-cream-3">
        Токены: {inTok.toLocaleString("ru-RU")} вход · {outTok.toLocaleString("ru-RU")} выход.
        {unpriced > 0 && ` Без цены (модель неизвестна): ${unpriced} вызовов.`} Цены: Haiku 4.5 $1/$5, Sonnet 4.6 $3/$15, Sonnet 5 $2/$10 за 1M токенов.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <Table title="По инструментам" head={["Инструмент", "Вызовов", "Выход, ток.", "Стоимость"]}
          rows={byTool.map(([t, v]) => [t, String(v.calls), v.out.toLocaleString("ru-RU"), formatUsd(v.cost)])} />
        <Table title="По моделям" head={["Модель", "Вызовов", "Стоимость"]}
          rows={byModel.map(([m, v]) => [m, String(v.calls), formatUsd(v.cost)])} />
        <Table title="По дням" head={["День", "Вызовов", "Пользователей", "Стоимость"]}
          rows={byDay.map(([d, v]) => [d, String(v.calls), String(v.users.size), formatUsd(v.cost)])} />
        <Table title="Топ-10 пользователей по расходу" head={["user_id", "Вызовов", "Стоимость", "Tier"]}
          rows={topUsers.map(([u, v]) => [u.slice(0, 8) + "…", String(v.calls), formatUsd(v.cost), proIds.has(u) ? "pro" : "free"])} />
      </div>
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <p className="font-mono-label text-[10px] uppercase tracking-wider text-cream-3">{label}</p>
      <p className="font-display text-2xl mt-1">{value}</p>
      {sub && <p className="text-[11px] text-cream-3 mt-0.5">{sub}</p>}
    </div>
  )
}

function Table({ title, head, rows }: { title: string; head: string[]; rows: string[][] }) {
  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      <div className="px-3 py-2 bg-card/60 font-display text-sm">{title}</div>
      <table className="w-full text-xs">
        <thead className="font-mono-label text-[10px] uppercase text-cream-3">
          <tr>{head.map((h) => <th key={h} className="px-3 py-1.5 text-left">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border/40">
              {r.map((c, j) => <td key={j} className="px-3 py-1.5 font-mono">{c}</td>)}
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={head.length} className="px-3 py-4 text-center text-cream-3">нет данных</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

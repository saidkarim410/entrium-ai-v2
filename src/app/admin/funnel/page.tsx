import { supabaseAdmin } from "@/lib/supabase/admin"
import { Filter } from "lucide-react"

export const dynamic = "force-dynamic"

const WINDOW_DAYS = 30
const ROW_CAP = 20000

function since(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

type Ev = { user_id: string | null; event: string; created_at: string }

/**
 * Product funnel (CTO TZ §5): onboarding → first useful result → saved
 * programme / application / task → pricing → payment, plus 7/30-day return.
 * Derived metrics come from the tables that already exist; explicit events
 * come from entrium.product_events (0027).
 */
export default async function AdminFunnelPage() {
  const from = since(WINDOW_DAYS)
  const [profiles, events, firstRuns, apps, tasks, favs, usage] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, created_at, tier, applicant_data").gte("created_at", from).limit(ROW_CAP),
    supabaseAdmin.from("product_events").select("user_id, event, created_at").gte("created_at", from).limit(ROW_CAP),
    supabaseAdmin.from("tool_runs").select("user_id, created_at, status").eq("status", "success").gte("created_at", from).limit(ROW_CAP),
    supabaseAdmin.from("applications").select("user_id, created_at").gte("created_at", from).limit(ROW_CAP),
    supabaseAdmin.from("plan_tasks").select("user_id, created_at").gte("created_at", from).limit(ROW_CAP),
    supabaseAdmin.from("favorites").select("user_id, created_at").gte("created_at", from).limit(ROW_CAP),
    supabaseAdmin.from("usage_events").select("user_id, created_at").neq("tool", "__reserved__").gte("created_at", since(60)).limit(ROW_CAP),
  ])

  const eventsMissing = events.error && (events.error.code === "42P01" || events.error.code === "PGRST205")
  const evs = (events.data ?? []) as Ev[]
  const newUsers = (profiles.data ?? []) as Array<{ id: string; created_at: string; tier: string; applicant_data: { _completed?: boolean } | null }>

  const usersWith = (rows: Array<{ user_id: string | null }> | null | undefined) => new Set((rows ?? []).map((r) => r.user_id).filter(Boolean) as string[])
  const byEvent = (name: string) => usersWith(evs.filter((e) => e.event === name))

  const signedUp = new Set(newUsers.map((u) => u.id))
  const onboarded = new Set(newUsers.filter((u) => u.applicant_data?._completed).map((u) => u.id))
  const firstResult = usersWith(firstRuns.data)
  const savedApp = usersWith(apps.data)
  const savedTask = usersWith(tasks.data)
  const savedFav = usersWith(favs.data)
  const pricing = byEvent("pricing_viewed")
  const checkout = byEvent("checkout_started")
  const activated = byEvent("subscription_activated")
  const canceled = byEvent("subscription_canceled")

  // Return: of users who signed up ≥7 / ≥30 days ago, how many used an AI tool at least once after day 7 / day 30
  const activity = (usage.data ?? []) as Array<{ user_id: string; created_at: string }>
  const activeAfter = (days: number) => {
    const cohort = newUsers.filter((u) => Date.now() - new Date(u.created_at).getTime() >= days * 86_400_000)
    const returned = cohort.filter((u) =>
      activity.some((a) => a.user_id === u.id && new Date(a.created_at).getTime() >= new Date(u.created_at).getTime() + days * 86_400_000)
    )
    return { cohort: cohort.length, returned: returned.length }
  }
  const d7 = activeAfter(7)
  const d30 = activeAfter(30)

  const stepsAll = [
    ["Регистрация (новые за период)", signedUp.size],
    ["Онбординг завершён", onboarded.size],
    ["Первый полезный результат (успешный AI-запуск)", firstResult.size],
    ["Сохранил программу / заявку / задачу", new Set([...savedApp, ...savedTask, ...savedFav]).size],
    ["— заявка", savedApp.size],
    ["— задача плана", savedTask.size],
    ["— в shortlist", savedFav.size],
    ["Смотрел тарифы", pricing.size],
    ["Начал оплату", checkout.size],
    ["Оплатил (подписка активирована)", activated.size],
    ["Отменил подписку", canceled.size],
  ] as const

  const eventCounts = Object.entries(
    evs.reduce<Record<string, number>>((acc, e) => {
      acc[e.event] = (acc[e.event] ?? 0) + 1
      return acc
    }, {})
  ).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-gold/15">
          <Filter className="h-5 w-5 text-gold" />
        </div>
        <div>
          <h1 className="font-display text-xl">Воронка · последние {WINDOW_DAYS} дней</h1>
          <p className="font-mono-label text-[11px] text-cream-3">
            уникальные пользователи на каждом шаге · возврат считается по AI-активности после 7 и 30 дней с регистрации
          </p>
        </div>
      </div>

      {eventsMissing && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          Таблица <code>entrium.product_events</code> не создана — примените миграцию <code>0027_product_events.sql</code>. Производные шаги (результат, заявки, задачи) считаются и без неё.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <div className="px-3 py-2 bg-card/60 font-display text-sm">Шаги</div>
          <table className="w-full text-xs">
            <tbody>
              {stepsAll.map(([label, n]) => (
                <tr key={label} className="border-t border-border/40">
                  <td className="px-3 py-1.5">{label}</td>
                  <td className="px-3 py-1.5 font-mono text-right">{n}</td>
                  <td className="px-3 py-1.5 font-mono text-right text-cream-3">
                    {signedUp.size ? `${Math.round((n / signedUp.size) * 100)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-3">
          <div className="rounded-xl border border-border/60 overflow-hidden">
            <div className="px-3 py-2 bg-card/60 font-display text-sm">Возврат</div>
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-t border-border/40"><td className="px-3 py-1.5">Через 7 дней</td><td className="px-3 py-1.5 font-mono text-right">{d7.returned} / {d7.cohort}</td><td className="px-3 py-1.5 font-mono text-right text-cream-3">{d7.cohort ? `${Math.round((d7.returned / d7.cohort) * 100)}%` : "—"}</td></tr>
                <tr className="border-t border-border/40"><td className="px-3 py-1.5">Через 30 дней</td><td className="px-3 py-1.5 font-mono text-right">{d30.returned} / {d30.cohort}</td><td className="px-3 py-1.5 font-mono text-right text-cream-3">{d30.cohort ? `${Math.round((d30.returned / d30.cohort) * 100)}%` : "—"}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="rounded-xl border border-border/60 overflow-hidden">
            <div className="px-3 py-2 bg-card/60 font-display text-sm">События (все, не уникальные)</div>
            <table className="w-full text-xs">
              <tbody>
                {eventCounts.map(([e, n]) => (
                  <tr key={e} className="border-t border-border/40"><td className="px-3 py-1.5 font-mono">{e}</td><td className="px-3 py-1.5 font-mono text-right">{n}</td></tr>
                ))}
                {eventCounts.length === 0 && <tr><td className="px-3 py-4 text-center text-cream-3" colSpan={2}>событий пока нет</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { Repeat } from "lucide-react"

export const dynamic = "force-dynamic"

const STATUS_COLOR: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-300",
  trialing: "bg-emerald-500/15 text-emerald-300",
  past_due: "bg-amber-500/15 text-amber-300",
  canceled: "bg-slate-500/15 text-slate-300",
  unpaid: "bg-rose-500/15 text-rose-300",
  incomplete: "bg-amber-500/15 text-amber-300",
  incomplete_expired: "bg-slate-500/15 text-slate-300",
}

export default async function AdminSubscriptionsPage() {
  const { data: subs } = await supabaseAdmin
    .from("subscriptions")
    .select("id, user_id, stripe_subscription_id, stripe_price_id, status, current_period_end, cancel_at_period_end, created_at")
    .order("created_at", { ascending: false })
    .limit(200)

  // Fetch profile emails for the user_ids in subs (best-effort)
  const userIds = Array.from(new Set((subs ?? []).map((s) => s.user_id as string)))
  const { data: profiles } = userIds.length
    ? await supabaseAdmin.from("profiles").select("id, email, first_name, last_name").in("id", userIds)
    : { data: [] as Array<{ id: string; email: string; first_name: string | null; last_name: string | null }> }
  const emailById = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      {
        email: p.email,
        name: [p.first_name, p.last_name].filter(Boolean).join(" "),
      },
    ]),
  )

  const grouped = {
    active: (subs ?? []).filter((s) => s.status === "active" || s.status === "trialing").length,
    canceled: (subs ?? []).filter((s) => s.status === "canceled").length,
    pastDue: (subs ?? []).filter((s) => s.status === "past_due").length,
  }

  return (
    <div className="space-y-5 max-w-7xl">
      <div>
        <p className="font-mono-label text-[10px] tracking-[0.16em] text-white/45 uppercase mb-1">
          Admin Console
        </p>
        <h1 className="font-display text-2xl tracking-tight inline-flex items-center gap-2">
          <Repeat className="h-5 w-5 text-[var(--brand-red)]" />
          Подписки
        </h1>
        <p className="font-mono-label text-white/45 text-[11px] mt-1">
          АКТИВНЫХ {grouped.active} · ОТМЕНЁННЫХ {grouped.canceled} · PAST DUE {grouped.pastDue}
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10">
            <tr className="font-mono-label text-[10px] uppercase text-white/55">
              <th className="text-left px-3 py-2.5">Пользователь</th>
              <th className="text-left px-3 py-2.5">Subscription ID</th>
              <th className="text-left px-3 py-2.5">Статус</th>
              <th className="text-left px-3 py-2.5">До</th>
              <th className="text-left px-3 py-2.5">Cancel?</th>
              <th className="text-left px-3 py-2.5">Создан</th>
            </tr>
          </thead>
          <tbody>
            {(subs ?? []).map((row) => {
              const profile = emailById.get(row.user_id as string)
              return (
                <tr key={row.id as string} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/users/${row.user_id}`}
                      className="text-white hover:text-[var(--brand-red)]"
                    >
                      {profile?.name || profile?.email || (row.user_id as string).slice(0, 8) + "…"}
                    </Link>
                  </td>
                  <td className="px-3 py-2 font-mono-label text-[10px] text-white/55 truncate max-w-[180px]">
                    {row.stripe_subscription_id as string}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-mono-label uppercase ${
                        STATUS_COLOR[row.status as string] ?? "bg-white/10 text-white/65"
                      }`}
                    >
                      {row.status as string}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono-label text-[10px] text-white/55">
                    {(row.current_period_end as string).slice(0, 10)}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {row.cancel_at_period_end ? "✓" : ""}
                  </td>
                  <td className="px-3 py-2 font-mono-label text-[10px] text-white/55">
                    {(row.created_at as string).slice(0, 10)}
                  </td>
                </tr>
              )
            })}
            {(!subs || subs.length === 0) && (
              <tr>
                <td colSpan={6} className="px-3 py-12 text-center text-white/40 font-mono-label text-xs">
                  Подписок нет
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

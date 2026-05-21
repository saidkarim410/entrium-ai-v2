import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { Users, CreditCard, TrendingUp, DollarSign, Download } from "lucide-react"

export const dynamic = "force-dynamic"

async function loadStats() {
  const [
    { count: totalUsers },
    { count: proUsers },
    { count: paidCount },
    paymentsSumRes,
    last7daysRes,
  ] = await Promise.all([
    supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).eq("tier", "pro"),
    supabaseAdmin.from("payments").select("id", { count: "exact", head: true }).eq("payment_status", "succeeded"),
    supabaseAdmin
      .from("payments")
      .select("amount.sum()")
      .eq("payment_status", "succeeded")
      .maybeSingle(),
    supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("registration_date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
  ])

  const totalRevenue = ((paymentsSumRes.data as unknown as { sum?: number } | null)?.sum) ?? 0

  return {
    totalUsers: totalUsers ?? 0,
    proUsers: proUsers ?? 0,
    paidCount: paidCount ?? 0,
    totalRevenue,
    newLast7days: last7daysRes.count ?? 0,
  }
}

export default async function AdminOverviewPage() {
  const stats = await loadStats()

  const cards = [
    { label: "Всего пользователей", value: stats.totalUsers.toLocaleString("ru"), icon: Users },
    { label: "Pro-подписчики", value: stats.proUsers.toLocaleString("ru"), icon: TrendingUp },
    { label: "Успешных оплат", value: stats.paidCount.toLocaleString("ru"), icon: CreditCard },
    { label: "Всего получено, $", value: stats.totalRevenue.toLocaleString("ru", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), icon: DollarSign },
    { label: "Новых за 7 дней", value: stats.newLast7days.toLocaleString("ru"), icon: Users },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Обзор</h1>
          <p className="font-mono-label text-foreground/60 text-[11px] mt-1">
            ENTRIUM AI · ADMIN DASHBOARD
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/admin/export/users"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-mono-label hover:border-[var(--brand-red)]/40 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            users.xlsx
          </a>
          <a
            href="/api/admin/export/payments"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-mono-label hover:border-[var(--brand-red)]/40 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            payments.xlsx
          </a>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4 card-hover">
            <div className="flex items-center justify-between mb-3">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--brand-red-soft)] text-[var(--brand-red)]">
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="font-display text-2xl tracking-tight">{value}</div>
            <div className="font-mono-label text-foreground/60 text-[10px] mt-1 uppercase tracking-wider">
              {label}
            </div>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Link
          href="/admin/users"
          className="rounded-xl border border-border bg-card p-5 hover:border-[var(--brand-red)]/40 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="font-display text-lg">Пользователи</div>
            <Users className="h-4 w-4 text-foreground/60" />
          </div>
          <p className="text-sm text-foreground/70">
            Поиск, фильтры по возрасту/городу/университету/оплатам/дате регистрации.
          </p>
        </Link>
        <Link
          href="/admin/payments"
          className="rounded-xl border border-border bg-card p-5 hover:border-[var(--brand-red)]/40 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="font-display text-lg">Оплаты</div>
            <CreditCard className="h-4 w-4 text-foreground/60" />
          </div>
          <p className="text-sm text-foreground/70">
            История транзакций · фильтры · экспорт в .xlsx.
          </p>
        </Link>
      </div>
    </div>
  )
}

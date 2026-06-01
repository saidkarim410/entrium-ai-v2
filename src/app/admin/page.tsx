import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase/admin"
import {
  Users, CreditCard, TrendingUp, DollarSign, Download,
  Repeat, Bot, ArrowUpRight, HeartPulse, Send,
} from "lucide-react"

export const dynamic = "force-dynamic"

async function loadStats() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalUsers },
    { count: proUsers },
    { count: paidCount },
    paymentsSumRes,
    { count: newLast7days },
    { count: newLast30days },
    { count: aiRunsToday },
    { count: activeSubs },
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
      .gte("registration_date", sevenDaysAgo),
    supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("registration_date", thirtyDaysAgo),
    supabaseAdmin
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", last24h),
    supabaseAdmin
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
  ])

  const totalRevenue = ((paymentsSumRes.data as unknown as { sum?: number } | null)?.sum) ?? 0

  return {
    totalUsers: totalUsers ?? 0,
    proUsers: proUsers ?? 0,
    paidCount: paidCount ?? 0,
    totalRevenue,
    newLast7days: newLast7days ?? 0,
    newLast30days: newLast30days ?? 0,
    aiRunsToday: aiRunsToday ?? 0,
    activeSubs: activeSubs ?? 0,
  }
}

export default async function AdminOverviewPage() {
  const stats = await loadStats()

  const cards = [
    { label: "Всего пользователей", value: stats.totalUsers.toLocaleString("ru"), icon: Users, accent: "blue" },
    { label: "Pro-подписчики", value: stats.proUsers.toLocaleString("ru"), icon: TrendingUp, accent: "amber" },
    { label: "Активных подписок", value: stats.activeSubs.toLocaleString("ru"), icon: Repeat, accent: "blue" },
    { label: "Успешных оплат", value: stats.paidCount.toLocaleString("ru"), icon: CreditCard, accent: "green" },
    { label: "Всего получено, $", value: stats.totalRevenue.toLocaleString("ru", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), icon: DollarSign, accent: "green" },
    { label: "Новых за 7 дней", value: stats.newLast7days.toLocaleString("ru"), icon: Users, accent: "blue" },
    { label: "Новых за 30 дней", value: stats.newLast30days.toLocaleString("ru"), icon: Users, accent: "blue" },
    { label: "AI runs за 24ч", value: stats.aiRunsToday.toLocaleString("ru"), icon: Bot, accent: "red" },
  ]

  const quickLinks = [
    { href: "/admin/users", label: "Пользователи", desc: "Поиск, фильтры по возрасту / городу / университету / оплатам / дате.", icon: Users },
    { href: "/admin/payments", label: "Оплаты", desc: "История транзакций, фильтры по статусу, refund.", icon: CreditCard },
    { href: "/admin/subscriptions", label: "Подписки", desc: "Активные Pro-подписки и статус Stripe.", icon: Repeat },
    { href: "/admin/runs", label: "AI runs", desc: "Что пользователи спрашивают AI — для отладки промптов.", icon: Bot },
    { href: "/admin/broadcasts", label: "Рассылки", desc: "Отправить уведомление через Telegram-бота.", icon: Send },
    { href: "/admin/health", label: "Состояние системы", desc: "Supabase, AI-provider, Stripe, Telegram bot.", icon: HeartPulse },
  ]

  return (
    <div className="space-y-8 max-w-7xl">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="font-mono-label text-[10px] tracking-[0.16em] text-white/45 uppercase mb-1">
            Admin Console
          </p>
          <h1 className="font-display text-3xl tracking-tight">Обзор</h1>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/admin/export/users"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 text-xs font-mono-label text-white/85 hover:bg-white/[0.06] hover:border-white/25 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            users.xlsx
          </a>
          <a
            href="/api/admin/export/payments"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 text-xs font-mono-label text-white/85 hover:bg-white/[0.06] hover:border-white/25 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            payments.xlsx
          </a>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(({ label, value, icon: Icon, accent }) => (
          <div
            key={label}
            className="rounded-xl border border-white/10 bg-white/[0.02] p-5 hover:border-white/20 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={`grid h-9 w-9 place-items-center rounded-lg ${
                  accent === "red"
                    ? "bg-[var(--brand-red-soft)] text-[var(--brand-red)]"
                    : accent === "green"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : accent === "amber"
                    ? "bg-amber-500/15 text-amber-400"
                    : "bg-blue-500/15 text-blue-400"
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="font-display text-3xl tracking-tight">{value}</div>
            <div className="font-mono-label text-white/55 text-[10px] mt-1 uppercase tracking-wider">
              {label}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <p className="font-mono-label text-[10px] tracking-[0.16em] text-white/45 uppercase">
          Быстрый доступ
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickLinks.map(({ href, label, desc, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-xl border border-white/10 bg-white/[0.02] p-5 hover:border-[var(--brand-red)]/50 hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/[0.04] text-white/70 group-hover:bg-[var(--brand-red-soft)] group-hover:text-[var(--brand-red)] transition-colors">
                  <Icon className="h-4 w-4" />
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-white/30 group-hover:text-[var(--brand-red)] transition-colors" />
              </div>
              <div className="font-display text-base">{label}</div>
              <p className="text-xs text-white/55 mt-1.5 leading-relaxed">{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

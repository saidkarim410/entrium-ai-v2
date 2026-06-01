import Link from "next/link"
import { notFound } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase/admin"
import {
  ArrowLeft, Mail, Phone, MapPin, GraduationCap, Calendar,
  CreditCard, Bot, Activity, Crown, Shield,
} from "lucide-react"

export const dynamic = "force-dynamic"

type ProfileFull = {
  id: string
  email: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  age: number | null
  gender: string | null
  country: string | null
  city: string | null
  school_or_university: string | null
  class_or_course: string | null
  avatar_url: string | null
  tier: string
  role: string
  pro_until: string | null
  bonus_credits: number
  stripe_customer_id: string | null
  auth_provider: string | null
  google_id: string | null
  telegram_id: string | null
  yandex_id: string | null
  whatsapp_phone: string | null
  whatsapp_verified: boolean
  registration_date: string | null
  created_at: string
  updated_at: string
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (!profile) notFound()
  const p = profile as ProfileFull

  const [
    { data: payments },
    { data: usage },
    { data: runs },
    { data: subs },
  ] = await Promise.all([
    supabaseAdmin
      .from("payments")
      .select("id, amount, currency, payment_method, payment_status, payment_date")
      .eq("user_id", id)
      .order("payment_date", { ascending: false })
      .limit(20),
    supabaseAdmin
      .from("usage_events")
      .select("id, tool, model, input_tokens, output_tokens, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabaseAdmin
      .from("tool_runs")
      .select("id, tool, status, duration_ms, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabaseAdmin
      .from("subscriptions")
      .select("id, status, stripe_subscription_id, current_period_end, cancel_at_period_end")
      .eq("user_id", id)
      .order("created_at", { ascending: false }),
  ])

  const totalPaid = (payments ?? [])
    .filter((row) => row.payment_status === "succeeded")
    .reduce((acc, row) => acc + Number(row.amount), 0)

  const fullName =
    [p.first_name, p.last_name].filter(Boolean).join(" ") || p.full_name || p.email

  return (
    <div className="space-y-6 max-w-7xl">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1.5 text-xs text-white/55 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-3 w-3" /> Все пользователи
      </Link>

      {/* Hero */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 flex items-start gap-5">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[var(--brand-red)] text-white text-2xl font-display font-extrabold shrink-0">
          {fullName.slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="font-display text-2xl tracking-tight">{fullName}</h1>
            {p.tier === "pro" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 text-[10px] font-mono-label uppercase tracking-wider">
                <Crown className="h-2.5 w-2.5" /> Pro
              </span>
            )}
            {p.role === "admin" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--brand-red-soft)] text-[var(--brand-red)] text-[10px] font-mono-label uppercase tracking-wider">
                <Shield className="h-2.5 w-2.5" /> Admin
              </span>
            )}
          </div>
          <p className="text-sm text-white/55 font-mono-label tracking-wider">
            USER_ID · {p.id}
          </p>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 mt-4 text-sm">
            <InfoRow icon={Mail} value={p.email} />
            {p.phone && <InfoRow icon={Phone} value={p.phone} />}
            {(p.city || p.country) && (
              <InfoRow icon={MapPin} value={[p.city, p.country].filter(Boolean).join(", ")} />
            )}
            {p.school_or_university && (
              <InfoRow icon={GraduationCap} value={`${p.school_or_university}${p.class_or_course ? " · " + p.class_or_course : ""}`} />
            )}
            <InfoRow
              icon={Calendar}
              value={`Регистрация: ${(p.registration_date ?? p.created_at).slice(0, 10)}`}
            />
            {p.auth_provider && (
              <InfoRow
                icon={Activity}
                value={`Через: ${p.auth_provider}${p.whatsapp_verified ? " · WhatsApp ✓" : ""}`}
              />
            )}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid sm:grid-cols-4 gap-3">
        <SummaryCard label="Всего оплат, $" value={totalPaid.toFixed(2)} icon={CreditCard} />
        <SummaryCard label="Успешных оплат" value={String((payments ?? []).filter((p) => p.payment_status === "succeeded").length)} icon={CreditCard} />
        <SummaryCard label="Подписок" value={String(subs?.length ?? 0)} icon={Crown} />
        <SummaryCard label="Bonus credits" value={String(p.bonus_credits)} icon={Bot} />
      </div>

      {/* Tabs as side-by-side panels for now */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Последние оплаты" icon={CreditCard}>
          {(payments ?? []).length === 0 ? (
            <Empty>Нет оплат</Empty>
          ) : (
            <table className="w-full text-xs">
              <tbody>
                {(payments ?? []).map((row) => (
                  <tr key={row.id as string} className="border-b border-white/5 last:border-0">
                    <td className="py-2 pr-3 font-mono-label text-white/50">
                      {(row.payment_date as string).slice(0, 10)}
                    </td>
                    <td className="py-2 pr-3 tabular-nums text-white">
                      {Number(row.amount).toFixed(2)} {(row.currency as string).toUpperCase()}
                    </td>
                    <td className="py-2 pr-3 text-white/65">{(row.payment_method as string) ?? "—"}</td>
                    <td className="py-2 text-right">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-mono-label uppercase ${
                          row.payment_status === "succeeded"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : row.payment_status === "failed"
                            ? "bg-rose-500/15 text-rose-300"
                            : row.payment_status === "refunded"
                            ? "bg-slate-500/15 text-slate-300"
                            : "bg-amber-500/15 text-amber-300"
                        }`}
                      >
                        {row.payment_status as string}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel title="AI usage (последние 20)" icon={Bot}>
          {(usage ?? []).length === 0 ? (
            <Empty>Нет AI-запросов</Empty>
          ) : (
            <table className="w-full text-xs">
              <tbody>
                {(usage ?? []).map((row) => (
                  <tr key={row.id as string} className="border-b border-white/5 last:border-0">
                    <td className="py-2 pr-3 font-mono-label text-white/50 whitespace-nowrap">
                      {new Date(row.created_at as string).toISOString().slice(5, 16).replace("T", " ")}
                    </td>
                    <td className="py-2 pr-3 text-white">{row.tool as string}</td>
                    <td className="py-2 pr-3 font-mono-label text-[9px] text-white/55">
                      {(row.model as string)?.split("-").slice(-2).join(" ")}
                    </td>
                    <td className="py-2 text-right tabular-nums text-white/65 text-[10px]">
                      {row.input_tokens as number} → {row.output_tokens as number}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel title="Подписки Stripe" icon={Crown}>
          {(subs ?? []).length === 0 ? (
            <Empty>Нет подписок</Empty>
          ) : (
            <table className="w-full text-xs">
              <tbody>
                {(subs ?? []).map((row) => (
                  <tr key={row.id as string} className="border-b border-white/5 last:border-0">
                    <td className="py-2 pr-3 font-mono-label text-[10px] text-white/55 truncate max-w-[140px]">
                      {row.stripe_subscription_id as string}
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-mono-label uppercase ${
                          row.status === "active" || row.status === "trialing"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-slate-500/15 text-slate-300"
                        }`}
                      >
                        {row.status as string}
                      </span>
                    </td>
                    <td className="py-2 font-mono-label text-[10px] text-white/55 text-right">
                      до {(row.current_period_end as string).slice(0, 10)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel title="Tool runs" icon={Activity}>
          {(runs ?? []).length === 0 ? (
            <Empty>Нет runs</Empty>
          ) : (
            <table className="w-full text-xs">
              <tbody>
                {(runs ?? []).map((row) => (
                  <tr key={row.id as string} className="border-b border-white/5 last:border-0">
                    <td className="py-2 pr-3 font-mono-label text-white/50 whitespace-nowrap">
                      {new Date(row.created_at as string).toISOString().slice(5, 16).replace("T", " ")}
                    </td>
                    <td className="py-2 pr-3 text-white">{row.tool as string}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-mono-label uppercase ${
                          row.status === "success"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : row.status === "error"
                            ? "bg-rose-500/15 text-rose-300"
                            : "bg-amber-500/15 text-amber-300"
                        }`}
                      >
                        {row.status as string}
                      </span>
                    </td>
                    <td className="py-2 text-right text-white/55 text-[10px]">
                      {row.duration_ms ? `${row.duration_ms} ms` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
    </div>
  )
}

function InfoRow({ icon: Icon, value }: { icon: React.ComponentType<{ className?: string }>; value: string }) {
  return (
    <div className="flex items-center gap-2 text-white/80">
      <Icon className="h-3.5 w-3.5 text-white/45 shrink-0" />
      <span className="truncate">{value}</span>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between mb-2">
        <Icon className="h-4 w-4 text-white/45" />
      </div>
      <div className="font-display text-2xl tracking-tight">{value}</div>
      <div className="font-mono-label text-white/55 text-[10px] mt-1 uppercase tracking-wider">{label}</div>
    </div>
  )
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-3.5 w-3.5 text-[var(--brand-red)]" />
        <h2 className="font-display text-sm">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-6 text-center text-xs text-white/40 font-mono-label">{children}</div>
}

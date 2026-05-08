import Link from "next/link"
import { redirect } from "next/navigation"
import { getCurrentProfile } from "@/lib/supabase/server"
import { getApplicantProfile } from "@/lib/applicant/actions"
import { listApplications } from "@/lib/applications/actions"
import {
  daysUntil,
  STATUS_LABELS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  summarizeApplications,
} from "@/lib/applications/types"
import { checkUsage } from "@/lib/rate-limit"
import { profileCompleteness } from "@/lib/applicant/types"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getT } from "@/lib/i18n/server"
import { Badge } from "@/components/ui/badge"
import {
  Sparkles, Brain, Map, FileText, MessageSquare, Award, GraduationCap, Mail,
  FileUser, Wallet, ShieldCheck, Bot, Calendar, AlertCircle, Zap,
  TrendingUp, History as HistoryIcon, ListChecks,
  Wand2, ArrowRight, Crown,
} from "lucide-react"
import { cn } from "@/lib/utils"

const ICONS = {
  profile: Brain,
  analyzer: Sparkles,
  tracker: Map,
  university: GraduationCap,
  scholarship: Award,
  essay: FileText,
  humanizer: Wand2,
  interview: MessageSquare,
  recommendation: Mail,
  cv: FileUser,
  cost: Wallet,
  reviewer: ShieldCheck,
} as const

type ToolKey = keyof typeof ICONS

const FEATURED_ORDER: ToolKey[] = ["analyzer", "tracker", "university", "essay"]

export default async function DashboardPage() {
  const profile = await getCurrentProfile()
  if (!profile) return null

  // First-time visitor → onboarding
  const applicant = await getApplicantProfile()
  if (!applicant._completed) redirect("/onboarding")

  const t = await getT()
  const [usage, apps, recentRuns] = await Promise.all([
    checkUsage(profile.id),
    listApplications(),
    getRecentRuns(profile.id, 5),
  ])

  const stats = summarizeApplications(apps)
  const completeness = profileCompleteness(applicant)
  const upcomingApp = apps.find((a) => {
    const d = daysUntil(a.deadline)
    return d !== null && d >= 0 && !["accepted", "rejected", "submitted", "withdrew"].includes(a.status)
  })
  const upcomingDays = upcomingApp ? daysUntil(upcomingApp.deadline) : null

  const tools = (Object.keys(ICONS) as ToolKey[]).map((k) => ({
    slug: k,
    name: t.tools[k].title,
    desc: t.tools[k].desc,
    Icon: ICONS[k],
  }))

  const featured = FEATURED_ORDER.map((k) => tools.find((t) => t.slug === k)!).filter(Boolean)
  const others = tools.filter((t) => !FEATURED_ORDER.includes(t.slug))

  const firstName = profile.full_name?.split(" ")[0] ?? applicant.personal.name?.split(" ")[0] ?? "👋"

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 lg:py-10 space-y-8">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-2xl sm:text-3xl tracking-tight">
                Привет, {firstName} 👋
              </h1>
              <p className="font-serif text-cream-2 mt-1 text-sm sm:text-base">
                {greetingSub(stats.total, completeness, upcomingDays)}
              </p>
            </div>
            {profile.tier !== "pro" && (
              <Link
                href="/pricing"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-mono-label text-gold hover:bg-gold/20 transition-colors"
              >
                <Crown className="h-3.5 w-3.5" />
                Открыть Pro
              </Link>
            )}
          </div>
        </section>

        {/* ── Today's focus ───────────────────────────────────────────── */}
        <FocusCard
          upcomingApp={upcomingApp}
          upcomingDays={upcomingDays}
          completeness={completeness}
          totalApps={stats.total}
        />

        {/* ── Stats row ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Профиль"
            value={`${completeness}%`}
            icon={Brain}
            href="/settings"
            highlight={completeness < 50}
          />
          <StatCard
            label="Заявки"
            value={stats.total}
            sub={stats.accepted ? `+${stats.accepted} accept` : stats.submitted ? `${stats.submitted} подано` : ""}
            icon={ListChecks}
            href="/applications"
          />
          <StatCard
            label={usage.tier === "pro" ? "План" : "Запросы"}
            value={usage.tier === "pro" ? "Pro" : `${usage.remaining}/10`}
            sub={profile.bonus_credits ? `+${profile.bonus_credits} bonus` : ""}
            icon={usage.tier === "pro" ? Crown : Zap}
            highlight={usage.tier === "pro"}
            href="/pricing"
          />
          <StatCard
            label="Дедлайн"
            value={
              stats.nextDeadline ? `${daysUntil(stats.nextDeadline)} дн.` : "—"
            }
            sub={stats.nextDeadline ? formatDate(stats.nextDeadline) : "добавь заявку"}
            icon={Calendar}
            href="/applications"
            highlight={Boolean(stats.nextDeadline && daysUntil(stats.nextDeadline)! <= 14)}
          />
        </div>

        {/* ── Agent CTA ───────────────────────────────────────────────── */}
        <Link
          href="/agent"
          className="group block rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 via-card/40 to-transparent p-5 sm:p-6 hover:border-gold/50 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-gold/20 shrink-0">
              <Bot className="h-6 w-6 text-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg sm:text-xl">AI Agent</h3>
                <Badge className="text-[9px] py-0 px-1.5 bg-gold/20 text-gold border-gold/30">
                  RECOMMENDED
                </Badge>
              </div>
              <p className="font-serif text-sm text-cream-2 leading-relaxed mt-0.5">
                Запусти полный pipeline: шансы → подбор универов → стипендии → план. Один клик.
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-gold shrink-0 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* ── Featured tools ──────────────────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl sm:text-2xl tracking-tight">Быстрый старт</h2>
            <Link
              href="/applications"
              className="text-xs font-mono-label text-cream-3 hover:text-gold transition-colors"
            >
              Все 11 инструментов →
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {featured.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} featured />
            ))}
          </div>
        </section>

        {/* ── Recent + Tools grid ─────────────────────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent activity */}
          <section className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg tracking-tight">Недавняя активность</h2>
              <Link
                href="/history"
                className="text-xs font-mono-label text-cream-3 hover:text-gold transition-colors"
              >
                Вся история →
              </Link>
            </div>
            {recentRuns.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 bg-card/20 p-6 text-center">
                <HistoryIcon className="h-6 w-6 text-cream-3 mx-auto mb-2" />
                <p className="font-serif text-sm text-cream-3">
                  Ещё ничего не запускал. Открой инструмент справа →
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {recentRuns.map((r) => (
                  <li key={r.id}>
                    <Link
                      href="/history"
                      className="flex items-center gap-3 rounded-lg border border-border bg-card/40 p-3 hover:border-gold/40 hover:bg-card transition-colors"
                    >
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-card border border-border shrink-0">
                        {(() => {
                          const Icon = ICONS[r.tool as ToolKey] ?? Sparkles
                          return <Icon className="h-3.5 w-3.5 text-gold" />
                        })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-sm truncate">
                          {t.tools[r.tool as ToolKey]?.title ?? r.tool}
                        </p>
                        <p className="font-mono-label text-[10px] text-cream-3 truncate">
                          {timeAgo(r.created_at)}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Upcoming applications panel */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg tracking-tight">Ближайшие заявки</h2>
              <Link
                href="/applications"
                className="text-xs font-mono-label text-cream-3 hover:text-gold transition-colors"
              >
                Все →
              </Link>
            </div>
            {apps.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 bg-card/20 p-5 text-center space-y-2">
                <ListChecks className="h-6 w-6 text-cream-3 mx-auto" />
                <p className="font-serif text-sm text-cream-3">Ни одной заявки ещё.</p>
                <Link href="/applications" className="text-xs font-mono-label text-gold hover:underline">
                  Добавить первую →
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {apps.slice(0, 4).map((a) => {
                  const days = daysUntil(a.deadline)
                  return (
                    <li
                      key={a.id}
                      className="rounded-lg border border-border bg-card/40 p-3 space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-display text-sm truncate flex-1 min-w-0">
                          {a.university_name}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn("text-[9px] py-0 px-1.5 shrink-0", PRIORITY_COLORS[a.priority])}
                        >
                          {PRIORITY_LABELS[a.priority]}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono-label text-cream-3 truncate">
                          {STATUS_LABELS[a.status]}
                        </span>
                        {a.deadline && (
                          <span
                            className={cn(
                              "text-[10px] font-mono-label",
                              days !== null && days <= 14 && days >= 0 ? "text-rose-400" : "text-cream-3"
                            )}
                          >
                            {days !== null && days < 0
                              ? "прошло"
                              : days === 0
                                ? "сегодня"
                                : `${days} дн.`}
                          </span>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>

        {/* ── All tools ───────────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="font-display text-xl tracking-tight">Все инструменты</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {others.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

// ── Subcomponents ──────────────────────────────────────────────────────────

function FocusCard({
  upcomingApp,
  upcomingDays,
  completeness,
  totalApps,
}: {
  upcomingApp: { id: string; university_name: string; status: string } | undefined
  upcomingDays: number | null
  completeness: number
  totalApps: number
}) {
  // Pick most relevant focus
  if (upcomingApp && upcomingDays !== null && upcomingDays <= 30) {
    return (
      <div
        className={cn(
          "rounded-2xl border p-5 sm:p-6 space-y-3",
          upcomingDays <= 7 ? "border-rose-500/40 bg-rose-500/5" : "border-gold/30 bg-gold/5"
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "grid h-10 w-10 place-items-center rounded-xl shrink-0",
              upcomingDays <= 7 ? "bg-rose-500/20" : "bg-gold/20"
            )}
          >
            {upcomingDays <= 7 ? (
              <AlertCircle className="h-5 w-5 text-rose-400" />
            ) : (
              <Calendar className="h-5 w-5 text-gold" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-mono-label text-[11px] uppercase tracking-wide text-cream-3 mb-1">
              FOCUS · {upcomingDays === 0 ? "СЕГОДНЯ" : `${upcomingDays} ДН.`} ДО ДЕДЛАЙНА
            </p>
            <h3 className="font-display text-lg sm:text-xl truncate">
              {upcomingApp.university_name}
            </h3>
            <p className="font-serif text-sm text-cream-2 mt-1">
              {upcomingDays <= 7
                ? "Финишная прямая. Запусти Reviewer, чтобы найти последние слабости."
                : "Время финализировать эссе и проверить заявку перед подачей."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            href="/tools/reviewer"
            className="inline-flex items-center gap-1.5 rounded-md bg-gold text-background px-3 py-1.5 text-xs font-medium hover:bg-gold-soft transition-colors"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Reviewer
          </Link>
          <Link
            href="/tools/essay"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            Эссе
          </Link>
          <Link
            href="/applications"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
          >
            <ListChecks className="h-3.5 w-3.5" />
            Открыть заявку
          </Link>
        </div>
      </div>
    )
  }

  if (completeness < 60) {
    return (
      <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-5 sm:p-6 space-y-3">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/20 shrink-0">
            <Brain className="h-5 w-5 text-blue-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-mono-label text-[11px] uppercase tracking-wide text-cream-3 mb-1">
              FOCUS · ПРОФИЛЬ {completeness}%
            </p>
            <h3 className="font-display text-lg sm:text-xl">Заполни профиль</h3>
            <p className="font-serif text-sm text-cream-2 mt-1">
              AI работает точнее, когда знает GPA, тесты и цели. Загрузи transcript — заполнится автоматически.
            </p>
          </div>
        </div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 px-3 py-1.5 text-xs font-medium text-blue-200 transition-colors"
        >
          Открыть настройки
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    )
  }

  if (totalApps === 0) {
    return (
      <div className="rounded-2xl border border-gold/30 bg-gold/5 p-5 sm:p-6 space-y-3">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gold/20 shrink-0">
            <TrendingUp className="h-5 w-5 text-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-mono-label text-[11px] uppercase tracking-wide text-cream-3 mb-1">
              FOCUS · СЛЕДУЮЩИЙ ШАГ
            </p>
            <h3 className="font-display text-lg sm:text-xl">Подбери университеты</h3>
            <p className="font-serif text-sm text-cream-2 mt-1">
              Запусти AI Agent → "Полный admission package" — за 5 минут получишь шорт-лист универов под профиль и стипендии.
            </p>
          </div>
        </div>
        <Link
          href="/agent"
          className="inline-flex items-center gap-1.5 rounded-md bg-gold text-background px-3 py-1.5 text-xs font-medium hover:bg-gold-soft transition-colors"
        >
          <Bot className="h-3.5 w-3.5" />
          Запустить Agent
        </Link>
      </div>
    )
  }

  // All set — gentle nudge
  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/20 shrink-0">
          <Sparkles className="h-5 w-5 text-emerald-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-mono-label text-[11px] uppercase tracking-wide text-cream-3 mb-1">
            FOCUS · ВСЁ ПОД КОНТРОЛЕМ
          </p>
          <h3 className="font-display text-lg sm:text-xl">Хороший прогресс</h3>
          <p className="font-serif text-sm text-cream-2 mt-1">
            Заявки добавлены, профиль заполнен. Используй Counselor (золотая кнопка ↘) для быстрых вопросов.
          </p>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  href,
  highlight,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ComponentType<{ className?: string }>
  href?: string
  highlight?: boolean
}) {
  const Inner = (
    <div
      className={cn(
        "rounded-xl border bg-card/40 p-3 sm:p-4 transition-colors",
        href && "hover:bg-card hover:border-gold/40 cursor-pointer",
        highlight ? "border-gold/30" : "border-border"
      )}
    >
      <div className="flex items-center gap-2 text-cream-3 mb-1.5">
        <Icon className={cn("h-3.5 w-3.5", highlight && "text-gold")} />
        <span className="text-[10px] sm:text-[11px] font-mono-label uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p
        className={cn(
          "font-display tracking-tight text-xl sm:text-2xl",
          highlight && "text-gold"
        )}
      >
        {value}
      </p>
      {sub && <p className="text-[10px] font-mono-label text-cream-3 mt-0.5 truncate">{sub}</p>}
    </div>
  )
  return href ? <Link href={href}>{Inner}</Link> : Inner
}

function ToolCard({
  tool,
  featured,
}: {
  tool: { slug: string; name: string; desc: string; Icon: React.ComponentType<{ className?: string }> }
  featured?: boolean
}) {
  const { slug, name, desc, Icon } = tool
  return (
    <Link
      href={`/tools/${slug}`}
      className={cn(
        "group block rounded-xl border bg-card/40 p-4 hover:bg-card hover:border-gold/40 transition-all",
        featured ? "border-gold/20 sm:p-5" : "border-border"
      )}
    >
      <div
        className={cn(
          "grid place-items-center rounded-lg bg-gold/10 group-hover:bg-gold/20 transition-colors mb-3",
          featured ? "h-10 w-10" : "h-8 w-8"
        )}
      >
        <Icon className={cn("text-gold", featured ? "h-5 w-5" : "h-4 w-4")} />
      </div>
      <p className={cn("font-display tracking-tight", featured ? "text-base" : "text-sm")}>
        {name}
      </p>
      {featured && (
        <p className="font-serif text-[12px] sm:text-xs text-cream-3 leading-relaxed mt-1 line-clamp-2">
          {desc}
        </p>
      )}
    </Link>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────

function greetingSub(totalApps: number, completeness: number, upcomingDays: number | null): string {
  if (upcomingDays !== null && upcomingDays <= 7) {
    return `${upcomingDays === 0 ? "Дедлайн сегодня" : `Дедлайн через ${upcomingDays} дн.`} — финальный спринт.`
  }
  if (totalApps === 0) {
    return completeness < 50
      ? "Заполни профиль и подбери первые университеты."
      : "Подбери первые университеты."
  }
  if (completeness < 60) {
    return "Дозаполни профиль для точных AI-рекомендаций."
  }
  return `Активных заявок: ${totalApps}. Продолжай в том же духе.`
}

async function getRecentRuns(userId: string, limit: number) {
  const { data } = await supabaseAdmin
    .from("tool_runs")
    .select("id, tool, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)
  return (data ?? []) as Array<{ id: string; tool: string; created_at: string }>
}

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime()
  const diff = Date.now() - t
  const min = Math.floor(diff / 60_000)
  if (min < 1) return "только что"
  if (min < 60) return `${min} мин назад`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `${hrs} ч назад`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days} дн. назад`
  return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" })
}

"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Bell, CheckCheck, CalendarClock, Sparkles, Lightbulb, Zap, Gift, ArrowLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { markRead, markAllRead } from "@/lib/notifications/actions"
import type { Notification, NotificationType } from "@/lib/notifications/types"
import { TYPE_LABEL } from "@/lib/notifications/types"
import { EmptyState } from "@/components/empty-state"
import { cn } from "@/lib/utils"

/**
 * Notifications inbox v2 (F-11 from TZ_FULLSTACK.md).
 *
 * Three filter axes:
 *   1. Read state — Все / Непрочитанные / Прочитанные
 *   2. Type — chips for deadline / agent_done / tip / system / referral
 *   3. (Implicit) sorted newest-first
 *
 * Optimistic mark-read on row click and on "Mark all read" button.
 * State-rollback on server error since the server actions are
 * fire-and-forget but we already moved the row.
 */

const ICONS: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  deadline: CalendarClock,
  agent_done: Sparkles,
  tip: Lightbulb,
  system: Zap,
  referral: Gift,
}

const COLORS: Record<NotificationType, string> = {
  deadline: "text-rose-300 bg-rose-500/15 border-rose-500/30",
  agent_done: "text-gold bg-gold/15 border-gold/30",
  tip: "text-blue-300 bg-blue-500/15 border-blue-500/30",
  system: "text-cream-2 bg-cream-3/15 border-cream-3/30",
  referral: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
}

type ReadFilter = "all" | "unread" | "read"

export function NotificationsInbox({ initial }: { initial: Notification[] }) {
  const router = useRouter()
  const [items, setItems] = useState<Notification[]>(initial)
  const [readFilter, setReadFilter] = useState<ReadFilter>("all")
  const [typeFilter, setTypeFilter] = useState<NotificationType | "all">("all")
  const [, startTransition] = useTransition()

  // Capture render-time "now" once at mount so age calculations in the
  // list rows don't call Date.now() during render (react-hooks/purity).
  // Refresh-staleness on inbox is fine — re-mount restarts the clock.
  const [renderNow] = useState(() => Date.now())

  const filtered = useMemo(() => {
    return items.filter((n) => {
      if (readFilter === "unread" && n.read_at) return false
      if (readFilter === "read" && !n.read_at) return false
      if (typeFilter !== "all" && n.type !== typeFilter) return false
      return true
    })
  }, [items, readFilter, typeFilter])

  // Type counts for chips — only include types that actually exist in the inbox
  const typeCounts = useMemo(() => {
    const counts: Partial<Record<NotificationType, number>> = {}
    for (const n of items) {
      counts[n.type] = (counts[n.type] ?? 0) + 1
    }
    return counts
  }, [items])

  const unreadTotal = items.filter((n) => !n.read_at).length

  // Event handlers — Date.now() here is fine, they're called from
  // user interactions, not during render.
  function clickRow(n: Notification) {
    if (!n.read_at) {
      const stamp = new Date().toISOString()
      const prev = items
      setItems((current) =>
        current.map((it) => (it.id === n.id ? { ...it, read_at: stamp } : it)),
      )
      startTransition(async () => {
        const res = await markRead(n.id)
        if (!res.ok) setItems(prev)
      })
    }
    if (n.link) router.push(n.link)
  }

  function clickMarkAllRead() {
    if (unreadTotal === 0) return
    const prev = items
    const stamp = new Date().toISOString()
    setItems((current) => current.map((it) => (it.read_at ? it : { ...it, read_at: stamp })))
    startTransition(async () => {
      const res = await markAllRead()
      if (!res.ok) setItems(prev)
    })
  }

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border/40 px-4 sm:px-6 shrink-0 overflow-hidden gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link
            href="/dashboard"
            className="text-cream-3 hover:text-gold transition-colors shrink-0"
            aria-label="Назад на главную"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="font-display text-base sm:text-lg tracking-tight truncate">Inbox</h1>
            <p className="font-mono-label text-cream-3 mt-0.5 truncate">
              {items.length} всего
              {unreadTotal > 0 && ` · ${unreadTotal} непрочитанных`}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={clickMarkAllRead}
          disabled={unreadTotal === 0}
          className="gap-1.5 shrink-0"
        >
          <CheckCheck className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Прочитать всё</span>
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="container max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-5">
          {/* Read-state filter */}
          <div className="inline-flex rounded-lg border border-border bg-card/40 p-0.5" role="tablist" aria-label="Фильтр по статусу прочтения">
            {([
              { v: "all" as const, label: "Все", count: items.length },
              { v: "unread" as const, label: "Непрочитанные", count: unreadTotal },
              { v: "read" as const, label: "Прочитанные", count: items.length - unreadTotal },
            ]).map((f) => (
              <button
                key={f.v}
                type="button"
                role="tab"
                aria-selected={readFilter === f.v}
                onClick={() => setReadFilter(f.v)}
                className={cn(
                  "px-3 py-1 text-xs font-mono-label uppercase tracking-wider rounded-md transition-colors",
                  readFilter === f.v ? "bg-gold/15 text-gold" : "text-cream-3 hover:text-cream-2",
                )}
              >
                {f.label} <span className="opacity-70">· {f.count}</span>
              </button>
            ))}
          </div>

          {/* Type filter chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono-label text-[10px] text-cream-3 uppercase tracking-wider mr-1">
              Тип:
            </span>
            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] font-mono-label transition-colors",
                typeFilter === "all"
                  ? "border-gold/50 bg-gold/10 text-gold"
                  : "border-border bg-card/30 text-cream-3 hover:text-cream-2",
              )}
            >
              Все
            </button>
            {(Object.keys(TYPE_LABEL) as NotificationType[]).map((t) => {
              const count = typeCounts[t] ?? 0
              if (count === 0) return null
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[11px] font-mono-label transition-colors",
                    typeFilter === t
                      ? "border-gold/50 bg-gold/10 text-gold"
                      : "border-border bg-card/30 text-cream-3 hover:text-cream-2",
                  )}
                >
                  {TYPE_LABEL[t]} · {count}
                </button>
              )
            })}
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <EmptyState
              icon={Bell}
              title={items.length === 0 ? "Inbox пустой" : "Ничего не найдено"}
              description={
                items.length === 0
                  ? "Сюда попадут напоминания о дедлайнах, AI-инсайты и другие уведомления. Настрой типы в Settings → Оповещения."
                  : "Попробуй сменить фильтры выше."
              }
              action={
                items.length === 0
                  ? { label: "Настройки оповещений", href: "/settings#notifications", variant: "outline" }
                  : undefined
              }
              variant="default"
            />
          ) : (
            <ol className="space-y-2">
              {filtered.map((n) => {
                const Icon = ICONS[n.type] ?? Bell
                const isUnread = !n.read_at
                const ageMin = Math.max(0, Math.floor((renderNow - new Date(n.created_at).getTime()) / 60_000))
                const ageLabel =
                  ageMin < 60 ? `${ageMin} мин` :
                  ageMin < 24 * 60 ? `${Math.floor(ageMin / 60)} ч` :
                  `${Math.floor(ageMin / (60 * 24))} д`
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => clickRow(n)}
                      aria-label={`${TYPE_LABEL[n.type]}: ${n.title}${isUnread ? " (непрочитано)" : ""}`}
                      className={cn(
                        "group w-full flex items-start gap-3 rounded-xl border p-3 sm:p-4 text-left transition-colors hover:border-gold/30",
                        isUnread ? "border-border bg-card/40" : "border-border/40 bg-card/20",
                      )}
                    >
                      <div className={cn("grid place-items-center h-9 w-9 rounded-lg border shrink-0", COLORS[n.type])}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            "font-display text-sm leading-snug",
                            isUnread ? "text-cream" : "text-cream-2",
                          )}>
                            {n.title}
                          </p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="font-mono-label text-[10px] text-cream-3">{ageLabel}</span>
                            {isUnread && (
                              <span
                                className="block h-2 w-2 rounded-full bg-gold shrink-0"
                                aria-label="Непрочитано"
                              />
                            )}
                          </div>
                        </div>
                        {n.body && (
                          <p className="font-serif text-[12.5px] text-cream-3 leading-relaxed line-clamp-2">
                            {n.body}
                          </p>
                        )}
                        <p className="font-mono-label text-[9px] text-cream-3/70 uppercase tracking-wider">
                          {TYPE_LABEL[n.type]}
                          {n.link && " · "}
                          {n.link && <span className="text-gold/80 group-hover:text-gold">открыть →</span>}
                        </p>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ol>
          )}

          {/* Footer hint */}
          {items.length > 0 && (
            <div className="text-center pt-2">
              <Link
                href="/settings#notifications"
                className="font-mono-label text-[11px] text-cream-3 hover:text-gold transition-colors"
              >
                Настроить какие уведомления приходят →
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

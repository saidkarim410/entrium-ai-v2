"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Clock, AlertCircle, CalendarPlus, Copy, Check, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, type AppStatus, type AppPriority,
} from "@/lib/applications/types"
import { cn } from "@/lib/utils"

export type CalEvent = {
  id: string
  date: string // ISO YYYY-MM-DD
  title: string
  subtitle?: string
  status: AppStatus
  priority: AppPriority
}

const MONTHS_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
]
const WEEKDAYS_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]

type FeedUrls = { https: string; webcal: string } | null

type ViewMode = "month" | "week" | "list"

export function CalendarClient({ events, feed }: { events: CalEvent[]; feed?: FeedUrls }) {
  const today = useMemo(() => stripTime(new Date()), [])
  const [cursor, setCursor] = useState(() => firstDayOfMonth(today))
  const [view, setView] = useState<ViewMode>("month") // U-4 (TZ): Month / Week / List
  const [showSub, setShowSub] = useState(false)
  const [copied, setCopied] = useState(false)

  function copyFeed() {
    if (!feed) return
    navigator.clipboard?.writeText(feed.https)
    setCopied(true)
    toast.success("Ссылка скопирована")
    setTimeout(() => setCopied(false), 2000)
  }

  const grid = useMemo(() => buildGrid(cursor), [cursor])
  const eventsByDate = useMemo(() => {
    const m = new Map<string, CalEvent[]>()
    for (const e of events) {
      const arr = m.get(e.date) ?? []
      arr.push(e)
      m.set(e.date, arr)
    }
    return m
  }, [events])

  // Upcoming list (next 60 days, future first)
  const upcoming = useMemo(() => {
    return events
      .filter((e) => new Date(e.date) >= today)
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .slice(0, 8)
  }, [events, today])

  const monthLabel = `${MONTHS_RU[cursor.getMonth()]} ${cursor.getFullYear()}`

  function nav(delta: number) {
    if (view === "week") {
      setCursor((c) => new Date(c.getFullYear(), c.getMonth(), c.getDate() + delta * 7))
      return
    }
    if (view === "month") {
      setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1))
      return
    }
    // List view: scroll by month
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1))
  }
  function jumpToday() {
    setCursor(firstDayOfMonth(today))
  }

  // U-4 (TZ): week view computes 7 consecutive days starting on the Monday
  // of the cursor week. Cursor switches to the cursor's Monday when entering
  // week mode — keeps visible focus on "the week the user was looking at".
  const weekDays = useMemo(() => {
    const dow = (cursor.getDay() + 6) % 7
    const monday = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - dow)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
      return { date: d, iso: toIso(d) }
    })
  }, [cursor])

  // U-4 list view: chronological future-first events grouped by month
  const listGroups = useMemo(() => {
    const future = events
      .filter((e) => new Date(e.date) >= today)
      .sort((a, b) => (a.date < b.date ? -1 : 1))
    const groups = new Map<string, CalEvent[]>()
    for (const e of future) {
      const d = new Date(e.date)
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`
      const arr = groups.get(key) ?? []
      arr.push(e)
      groups.set(key, arr)
    }
    return Array.from(groups.entries()).map(([key, items]) => {
      const [y, m] = key.split("-").map(Number)
      return {
        key,
        label: `${MONTHS_RU[m]} ${y}`,
        items,
      }
    })
  }, [events, today])

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon-sm" onClick={() => nav(-1)} aria-label="Предыдущий месяц">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="font-display text-xl sm:text-2xl tracking-tight min-w-[180px] text-center">
              {monthLabel}
            </h2>
            <Button variant="ghost" size="icon-sm" onClick={() => nav(1)} aria-label="Следующий месяц">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* U-4 (TZ): view toggle — Month / Week / List */}
            <div role="tablist" aria-label="Режим отображения" className="inline-flex rounded-lg border border-border bg-card/40 p-0.5">
              {(["month", "week", "list"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => setView(v)}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-mono-label uppercase tracking-wider rounded-md transition-colors",
                    view === v ? "bg-gold/15 text-gold" : "text-cream-3 hover:text-cream-2",
                  )}
                >
                  {v === "month" ? "Месяц" : v === "week" ? "Неделя" : "Список"}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={jumpToday}>
              Сегодня
            </Button>
            {feed && (
              <Button variant="outline" size="sm" onClick={() => setShowSub(!showSub)} className="gap-1.5">
                <CalendarPlus className="h-3.5 w-3.5" />
                Подписаться
              </Button>
            )}
            <Link href="/applications">
              <Button size="sm" className="gap-1.5">
                <CalIcon className="h-3.5 w-3.5" />
                Заявки
              </Button>
            </Link>
          </div>
        </div>

        {showSub && feed && (
          <div className="rounded-xl border border-gold/30 bg-gradient-to-br from-gold/5 to-transparent p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-gold/15 shrink-0">
                <CalendarPlus className="h-5 w-5 text-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-lg">Подпишись на свой календарь</h3>
                <p className="font-serif text-sm text-cream-2 leading-relaxed">
                  Все дедлайны заявок появятся в Google Calendar / Apple Calendar / Outlook —
                  с автонапоминаниями за 7 и 1 день. Календарь обновляется когда меняешь заявки.
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <a
                href={feed.webcal}
                className="rounded-lg border border-border bg-card/40 hover:bg-card hover:border-gold/40 transition-colors p-3 group"
              >
                <p className="font-display text-sm group-hover:text-gold transition-colors">📱 Apple Calendar / iOS</p>
                <p className="font-mono-label text-[10px] text-cream-3 mt-0.5">Один клик · webcal://</p>
              </a>
              <a
                href={`https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(feed.https)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-border bg-card/40 hover:bg-card hover:border-gold/40 transition-colors p-3 group"
              >
                <p className="font-display text-sm group-hover:text-gold transition-colors">📅 Google Calendar</p>
                <p className="font-mono-label text-[10px] text-cream-3 mt-0.5">Открыть → «Добавить календарь»</p>
              </a>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
              <code className="text-xs font-mono text-cream-3 truncate flex-1 min-w-0">{feed.https}</code>
              <Button variant="ghost" size="sm" onClick={copyFeed} className="gap-1.5 shrink-0">
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                {copied ? "OK" : "Копировать"}
              </Button>
              <a
                href={feed.https}
                download="entrium-deadlines.ics"
                className="inline-flex h-8 px-2 items-center gap-1.5 rounded-md hover:bg-accent transition-colors text-xs font-mono-label text-cream-3"
              >
                <Download className="h-3 w-3" />
                .ics
              </a>
            </div>

            <p className="text-[10px] font-mono-label text-cream-3">
              Outlook / другие: добавь URL вручную как «Internet Calendar Subscription». Ссылка включает HMAC-токен — отозвать нельзя, поэтому не делись ей.
            </p>
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_280px] gap-6">
          {/* Main view — switches between Month / Week / List based on `view` */}
          {view === "month" && (
          <div className="rounded-xl border border-border bg-card/40 overflow-hidden">
            <div className="grid grid-cols-7 border-b border-border/60 bg-card/60">
              {WEEKDAYS_RU.map((d) => (
                <div
                  key={d}
                  className="px-2 py-2 text-center text-[10px] font-mono-label text-cream-3 uppercase tracking-wider"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {grid.map((d, i) => {
                const iso = d.iso
                const dayEvents = eventsByDate.get(iso) ?? []
                const inMonth = d.month === cursor.getMonth()
                const isToday = isSameDay(d.date, today)
                const isPast = d.date < today
                return (
                  <div
                    key={i}
                    className={cn(
                      "min-h-[88px] border-b border-r border-border/40 p-1.5 sm:p-2 last:border-r-0",
                      i >= 35 && "border-b-0",
                      !inMonth && "bg-card/20"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={cn(
                          "inline-flex items-center justify-center text-xs font-mono-label",
                          isToday
                            ? "h-5 w-5 rounded-full bg-gold text-background"
                            : inMonth
                              ? "text-cream-2"
                              : "text-cream-3/50"
                        )}
                      >
                        {d.date.getDate()}
                      </span>
                      {dayEvents.length > 1 && (
                        <span className="text-[9px] font-mono-label text-cream-3">
                          +{dayEvents.length}
                        </span>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 2).map((e) => (
                        <Link
                          key={e.id}
                          href="/applications"
                          className={cn(
                            "block truncate rounded px-1.5 py-0.5 text-[10px] sm:text-[11px] font-medium border transition-colors",
                            isPast
                              ? "bg-cream-3/10 text-cream-3/60 border-cream-3/20 line-through"
                              : e.priority === "reach"
                                ? "bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25"
                                : e.priority === "match"
                                  ? "bg-gold/15 text-gold border-gold/30 hover:bg-gold/25"
                                  : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                          )}
                          title={`${e.title}${e.subtitle ? " · " + e.subtitle : ""}`}
                        >
                          {e.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          )}

          {/* U-4: Week view — 7 day-columns of the cursor's week */}
          {view === "week" && (
            <div className="rounded-xl border border-border bg-card/40 overflow-hidden">
              <div className="grid grid-cols-7 border-b border-border/60 bg-card/60">
                {weekDays.map((d) => {
                  const isToday = isSameDay(d.date, today)
                  return (
                    <div
                      key={d.iso}
                      className={cn(
                        "px-2 py-2 text-center",
                        isToday && "bg-gold/10",
                      )}
                    >
                      <p className="text-[10px] font-mono-label text-cream-3 uppercase tracking-wider">
                        {WEEKDAYS_RU[(d.date.getDay() + 6) % 7]}
                      </p>
                      <p className={cn(
                        "font-display text-base mt-0.5",
                        isToday ? "text-gold" : "text-cream-2",
                      )}>
                        {d.date.getDate()}
                      </p>
                    </div>
                  )
                })}
              </div>
              <div className="grid grid-cols-7 min-h-[420px]">
                {weekDays.map((d) => {
                  const dayEvents = eventsByDate.get(d.iso) ?? []
                  const isPast = d.date < today
                  return (
                    <div
                      key={d.iso}
                      className="border-r border-border/40 last:border-r-0 p-2 space-y-1.5"
                    >
                      {dayEvents.length === 0 ? (
                        <div className="h-full grid place-items-center text-[10px] font-mono-label text-cream-3/40">
                          —
                        </div>
                      ) : (
                        dayEvents.map((e) => (
                          <Link
                            key={e.id}
                            href="/applications"
                            className={cn(
                              "block rounded-md border p-1.5 text-[11px] transition-colors",
                              isPast
                                ? "bg-cream-3/10 text-cream-3/60 border-cream-3/20"
                                : e.priority === "reach"
                                  ? "bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25"
                                  : e.priority === "match"
                                    ? "bg-gold/15 text-gold border-gold/30 hover:bg-gold/25"
                                    : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                            )}
                            title={e.title}
                          >
                            <p className="font-display truncate">{e.title}</p>
                            {e.subtitle && (
                              <p className="font-mono-label text-[9px] opacity-80 truncate">{e.subtitle}</p>
                            )}
                          </Link>
                        ))
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* U-4: List view — chronological events grouped by month */}
          {view === "list" && (
            <div className="rounded-xl border border-border bg-card/40 p-4 sm:p-5">
              {listGroups.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <CalIcon className="h-8 w-8 text-cream-3 mx-auto" />
                  <p className="font-display text-base">Нет грядущих дедлайнов</p>
                  <Link href="/applications" className="font-mono-label text-xs text-gold hover:underline">
                    Добавить заявку →
                  </Link>
                </div>
              ) : (
                <ol className="space-y-5">
                  {listGroups.map((g) => (
                    <li key={g.key}>
                      <h3 className="font-mono-label text-[10px] text-gold uppercase tracking-[0.2em] mb-2 pb-1 border-b border-gold/20">
                        {g.label} · {g.items.length}
                      </h3>
                      <ul className="space-y-1.5">
                        {g.items.map((e) => {
                          const days = daysBetween(today, new Date(e.date))
                          const urgent = days <= 7
                          return (
                            <li key={e.id}>
                              <Link
                                href="/applications"
                                className={cn(
                                  "flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors hover:border-gold/30",
                                  urgent ? "border-rose-500/30 bg-rose-500/5" : "border-border bg-card/30",
                                )}
                              >
                                <div className="grid place-items-center h-9 w-9 rounded-md bg-card/60 shrink-0">
                                  <span className="font-display text-base text-cream-2">
                                    {new Date(e.date).getDate()}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-display text-sm truncate">{e.title}</p>
                                  <p className="font-mono-label text-[10px] text-cream-3 truncate">
                                    {STATUS_LABELS[e.status]} · {PRIORITY_LABELS[e.priority]}
                                    {e.subtitle ? ` · ${e.subtitle}` : ""}
                                  </p>
                                </div>
                                <span
                                  className={cn(
                                    "font-mono-label text-[10px] shrink-0",
                                    urgent ? "text-rose-400" : "text-cream-3",
                                  )}
                                >
                                  {days === 0 ? "сегодня" : days === 1 ? "завтра" : `${days} дн`}
                                </span>
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {/* Side: upcoming */}
          <aside className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gold" />
              <h3 className="font-display text-base">Ближайшие</h3>
            </div>
            {upcoming.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 bg-card/20 p-5 text-center space-y-2">
                <CalIcon className="h-6 w-6 text-cream-3 mx-auto" />
                <p className="font-serif text-sm text-cream-3">Нет грядущих дедлайнов.</p>
                <Link href="/applications" className="text-xs font-mono-label text-gold hover:underline">
                  Добавить заявку →
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {upcoming.map((e) => {
                  const days = daysBetween(today, new Date(e.date))
                  const urgent = days <= 7
                  return (
                    <li key={e.id}>
                      <Link
                        href="/applications"
                        className={cn(
                          "block rounded-lg border p-3 hover:bg-card transition-colors",
                          urgent ? "border-rose-500/40 bg-rose-500/5" : "border-border bg-card/40"
                        )}
                      >
                        <div className="flex items-start gap-2 mb-1">
                          {urgent ? (
                            <AlertCircle className="h-3.5 w-3.5 text-rose-400 mt-0.5 shrink-0" />
                          ) : (
                            <CalIcon className="h-3.5 w-3.5 text-cream-3 mt-0.5 shrink-0" />
                          )}
                          <p className="font-display text-sm flex-1 min-w-0 truncate">{e.title}</p>
                        </div>
                        <div className="flex items-center justify-between gap-2 ml-5">
                          <span className="text-[10px] font-mono-label text-cream-3 truncate">
                            {STATUS_LABELS[e.status]}
                            {e.subtitle ? ` · ${e.subtitle}` : ""}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-mono-label shrink-0",
                              urgent ? "text-rose-400" : "text-cream-3"
                            )}
                          >
                            {days === 0 ? "сегодня" : days === 1 ? "завтра" : `${days} дн.`}
                          </span>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}

            {/* Legend */}
            <div className="rounded-xl border border-border bg-card/30 p-3 space-y-2">
              <p className="font-mono-label text-[10px] text-cream-3 uppercase tracking-wider">Цвет = приоритет</p>
              <ul className="space-y-1.5 text-xs font-serif text-cream-2">
                <li className="flex items-center gap-2">
                  <span className={cn("inline-block h-3 w-3 rounded border", PRIORITY_COLORS.reach)} />
                  {PRIORITY_LABELS.reach}
                </li>
                <li className="flex items-center gap-2">
                  <span className={cn("inline-block h-3 w-3 rounded border", PRIORITY_COLORS.match)} />
                  {PRIORITY_LABELS.match}
                </li>
                <li className="flex items-center gap-2">
                  <span className={cn("inline-block h-3 w-3 rounded border", PRIORITY_COLORS.safety)} />
                  {PRIORITY_LABELS.safety}
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

// ── Date helpers ───────────────────────────────────────────────────────────

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function firstDayOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((stripTime(to).getTime() - stripTime(from).getTime()) / 86_400_000)
}

function buildGrid(monthFirst: Date): Array<{ date: Date; iso: string; month: number }> {
  // Russian week starts Monday — shift so Monday=0
  const dow = (monthFirst.getDay() + 6) % 7
  const start = new Date(monthFirst.getFullYear(), monthFirst.getMonth(), 1 - dow)
  const cells: Array<{ date: Date; iso: string; month: number }> = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    cells.push({
      date: d,
      iso: toIso(d),
      month: d.getMonth(),
    })
  }
  return cells
}

function toIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Clock, AlertCircle } from "lucide-react"
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

export function CalendarClient({ events }: { events: CalEvent[] }) {
  const today = useMemo(() => stripTime(new Date()), [])
  const [cursor, setCursor] = useState(() => firstDayOfMonth(today))

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
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1))
  }
  function jumpToday() {
    setCursor(firstDayOfMonth(today))
  }

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
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={jumpToday}>
              Сегодня
            </Button>
            <Link href="/applications">
              <Button size="sm" className="gap-1.5">
                <CalIcon className="h-3.5 w-3.5" />
                Заявки
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_280px] gap-6">
          {/* Month grid */}
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

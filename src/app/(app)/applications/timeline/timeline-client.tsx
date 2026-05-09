"use client"

import { useMemo, useState } from "react"
import { CalendarDays, GraduationCap } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_LABELS,
  daysUntil,
  deadlineUrgency,
  URGENCY_STYLES,
  type Application,
  type AppStatus,
} from "@/lib/applications/types"
import { EmptyState } from "@/components/empty-state"

const MONTHS_RU = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"]

/**
 * Visual gantt-like timeline (F-3 from TZ_FULLSTACK.md).
 *
 * Each application becomes one horizontal bar at its deadline date.
 * The X-axis spans 14 months — from "today minus 1 month" to "today
 * plus 13 months" — covering one full admission cycle. Apps without
 * deadlines float in a separate "no deadline" group above the axis.
 */
export function ApplicationsTimeline({ initial }: { initial: Application[] }) {
  const [statusFilter, setStatusFilter] = useState<AppStatus | "all">("all")

  const filtered = useMemo(
    () => initial.filter((a) => statusFilter === "all" || a.status === statusFilter),
    [initial, statusFilter],
  )

  const withDeadline = filtered.filter((a) => a.deadline)
  const withoutDeadline = filtered.filter((a) => !a.deadline)

  // Build the X-axis: 14 months from start
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const axisStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const axisEnd = new Date(today.getFullYear(), today.getMonth() + 13, 0)
  const totalDays = Math.round((axisEnd.getTime() - axisStart.getTime()) / 86_400_000)

  function leftPercent(dateIso: string | null): number {
    if (!dateIso) return 0
    const d = new Date(dateIso)
    const offset = Math.round((d.getTime() - axisStart.getTime()) / 86_400_000)
    return Math.max(0, Math.min(100, (offset / totalDays) * 100))
  }

  // Build month tick marks
  const monthTicks: { label: string; left: number }[] = []
  let cursor = new Date(axisStart)
  while (cursor <= axisEnd) {
    const offset = Math.round((cursor.getTime() - axisStart.getTime()) / 86_400_000)
    monthTicks.push({
      label: `${MONTHS_RU[cursor.getMonth()]} ${cursor.getFullYear().toString().slice(2)}`,
      left: (offset / totalDays) * 100,
    })
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  }

  const todayLeft = leftPercent(today.toISOString())

  // Group bars by month so visually similar deadlines stack vertically
  const sorted = [...withDeadline].sort((a, b) => {
    if (!a.deadline || !b.deadline) return 0
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  })

  if (initial.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="container max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <EmptyState
            icon={CalendarDays}
            title="Пока нет заявок"
            description="Добавь хотя бы одну заявку с дедлайном — появится визуальный таймлайн всего цикла поступления."
            action={{ label: "Открыть список заявок", href: "/applications" }}
            variant="hero"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono-label text-[10px] text-cream-3 uppercase tracking-wider">
            Статус:
          </span>
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[11px] font-mono-label transition-colors",
              statusFilter === "all"
                ? "border-gold/50 bg-gold/10 text-gold"
                : "border-border bg-card/30 text-cream-3 hover:text-cream-2",
            )}
          >
            Все · {filtered.length}
          </button>
          {(Object.keys(STATUS_LABELS) as AppStatus[]).map((s) => {
            const count = initial.filter((a) => a.status === s).length
            if (count === 0) return null
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[11px] font-mono-label transition-colors",
                  statusFilter === s
                    ? "border-gold/50 bg-gold/10 text-gold"
                    : "border-border bg-card/30 text-cream-3 hover:text-cream-2",
                )}
              >
                {STATUS_LABELS[s]} · {count}
              </button>
            )
          })}
        </div>

        {/* Apps without deadline */}
        {withoutDeadline.length > 0 && (
          <section className="rounded-xl border border-dashed border-border bg-card/20 p-4">
            <p className="font-mono-label text-[10px] text-cream-3 uppercase tracking-wider mb-2">
              Без даты · {withoutDeadline.length}
            </p>
            <div className="flex flex-wrap gap-2">
              {withoutDeadline.map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg border border-border bg-card/40 px-2.5 py-1 font-serif text-xs text-cream-2"
                >
                  {a.university_name}
                  {a.round && <span className="text-cream-3"> · {a.round}</span>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Timeline */}
        <section className="rounded-xl border border-border bg-card/40 p-3 sm:p-5 overflow-hidden">
          <div className="relative overflow-x-auto">
            <div className="min-w-[900px]">
              {/* Axis */}
              <div className="relative h-7 border-b border-border mb-1">
                {monthTicks.map((t) => (
                  <div
                    key={t.label}
                    className="absolute -translate-x-1/2 font-mono-label text-[9px] text-cream-3 uppercase tracking-wider"
                    style={{ left: `${t.left}%`, top: 0 }}
                  >
                    {t.label}
                    <div className="absolute left-1/2 top-3 h-3 w-px bg-border" />
                  </div>
                ))}
                {/* Today marker */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-gold/60"
                  style={{ left: `${todayLeft}%` }}
                  aria-label="Сегодня"
                />
                <div
                  className="absolute -translate-x-1/2 font-mono-label text-[9px] text-gold font-bold"
                  style={{ left: `${todayLeft}%`, top: -10 }}
                >
                  ↓ today
                </div>
              </div>

              {/* Bars */}
              <ol className="space-y-1.5 pt-2">
                {sorted.map((a) => {
                  const left = leftPercent(a.deadline)
                  const days = daysUntil(a.deadline)
                  const urgency = deadlineUrgency(a.deadline)
                  return (
                    <li key={a.id} className="relative h-7 group">
                      {/* Track */}
                      <div className="absolute inset-x-0 inset-y-2 rounded-full bg-border/30" />
                      {/* Bar */}
                      <div
                        className={cn(
                          "absolute -translate-x-1/2 inset-y-0.5 rounded-md border px-2 flex items-center gap-1.5 min-w-[20px] truncate transition-all hover:z-10 hover:scale-105",
                          STATUS_COLORS[a.status],
                          urgency === "overdue" && "ring-1 ring-rose-500/50",
                        )}
                        style={{ left: `${left}%`, maxWidth: "26%" }}
                        title={`${a.university_name}${a.program ? " · " + a.program : ""}${a.round ? " · " + a.round : ""} · ${STATUS_LABELS[a.status]} · ${PRIORITY_LABELS[a.priority]}${days !== null ? ` · ${days >= 0 ? days + " дн" : "просрочено " + Math.abs(days) + " дн"}` : ""}`}
                      >
                        <GraduationCap className="h-3 w-3 shrink-0 opacity-70" />
                        <span className="font-serif text-[11px] truncate">
                          {a.university_name}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </div>
          </div>
        </section>

        {/* Legend */}
        <section className="rounded-xl border border-border bg-card/30 p-3 flex flex-wrap gap-2 items-center text-xs">
          <span className="font-mono-label text-[10px] text-cream-3 uppercase tracking-wider mr-1">
            Срочность:
          </span>
          {(["overdue", "critical", "soon", "approaching", "comfortable", "far"] as const).map((u) => (
            <span
              key={u}
              className={cn("rounded-full border px-2 py-0.5 font-mono text-[10px]", URGENCY_STYLES[u].chip)}
            >
              {URGENCY_STYLES[u].label}
            </span>
          ))}
        </section>
      </div>
    </div>
  )
}

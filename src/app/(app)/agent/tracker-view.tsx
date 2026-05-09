"use client"

import { useState } from "react"
import { Calendar, Clock, AlertCircle, ChevronDown, ChevronRight, BookOpen, FileText, Languages, FlaskConical, Users2, Send, GraduationCap, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Render the tracker tool's structured JSON output as a beautiful
 * roadmap UI instead of a raw JSON dump.
 *
 * The tracker prompt forces strict JSON `{ diagnosis, score, months[] }`
 * — so when the AI streams it, the agent step displays the raw JSON
 * blob in a code block, which is technically correct but unreadable.
 *
 * This component:
 *   1. Tries to parse the streamed text as JSON (gracefully — partial
 *      output during streaming would fail JSON.parse and we fall
 *      back to a "генерирую..." state).
 *   2. Renders score as a big number, diagnosis as a quote, months as
 *      collapsible cards with task lists categorised by icon.
 */

export type TrackerTask = {
  id: string
  title: string
  description?: string
  priority: "high" | "medium" | "low"
  category: string
  deadline?: string
  duration?: string
}

export type TrackerMonth = {
  month: string
  emoji?: string
  color?: string
  tasks: TrackerTask[]
}

export type TrackerOutput = {
  diagnosis: string
  score: number
  months: TrackerMonth[]
}

const CATEGORY_ICONS: Record<string, typeof BookOpen> = {
  tests: FlaskConical,
  essay: FileText,
  docs: FileText,
  research: BookOpen,
  activity: Users2,
  application: Send,
  language: Languages,
  prep: GraduationCap,
}

const PRIORITY_STYLES: Record<TrackerTask["priority"], { chip: string; ring: string; label: string }> = {
  high:   { chip: "bg-rose-500/15 text-rose-300 border-rose-500/40",     ring: "border-l-rose-500/60",     label: "high" },
  medium: { chip: "bg-yellow-500/15 text-yellow-300 border-yellow-500/40", ring: "border-l-yellow-500/60", label: "med" },
  low:    { chip: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40", ring: "border-l-emerald-500/60", label: "low" },
}

/**
 * Try to extract a TrackerOutput from raw streamed text.
 * The AI can wrap JSON in ```json fences despite our prompt saying
 * not to, or include leading whitespace — try both strict and loose.
 */
export function parseTracker(text: string): TrackerOutput | null {
  if (!text) return null
  const trimmed = text.trim()

  // Strip ```json ... ``` fences if present
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1].trim() : trimmed

  // Find the first { and last } — robust to leading/trailing chatter
  const start = candidate.indexOf("{")
  const end = candidate.lastIndexOf("}")
  if (start === -1 || end === -1 || end < start) return null
  const slice = candidate.slice(start, end + 1)

  try {
    const obj = JSON.parse(slice) as Partial<TrackerOutput>
    if (!obj || typeof obj !== "object") return null
    if (!Array.isArray(obj.months)) return null
    return {
      diagnosis: typeof obj.diagnosis === "string" ? obj.diagnosis : "",
      score: typeof obj.score === "number" ? obj.score : 0,
      months: obj.months,
    }
  } catch {
    return null
  }
}

export function TrackerView({ data }: { data: TrackerOutput }) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set([data.months[0]?.month ?? ""]))

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-4">
      {/* Diagnosis + score */}
      <div className="rounded-xl border border-gold/30 bg-gradient-to-br from-gold/10 via-card/40 to-transparent p-4 sm:p-5 flex items-start gap-4">
        <div className="grid place-items-center h-14 w-14 rounded-2xl bg-gold/20 shrink-0">
          <span className="font-display text-2xl text-gold">{data.score}</span>
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <p className="font-mono-label text-[10px] text-gold uppercase tracking-[0.2em]">
            Готовность профиля
          </p>
          <p className="font-serif text-sm sm:text-base text-cream-2 leading-relaxed">
            {data.diagnosis || "Анализ профиля..."}
          </p>
        </div>
      </div>

      {/* Months */}
      <ol className="space-y-2.5">
        {data.months.map((m) => {
          const isOpen = openIds.has(m.month)
          const high = m.tasks.filter((t) => t.priority === "high").length
          return (
            <li
              key={m.month}
              className="rounded-xl border border-border bg-card/40 overflow-hidden"
              style={m.color ? { borderLeftColor: m.color, borderLeftWidth: 3 } : undefined}
            >
              <button
                type="button"
                onClick={() => toggle(m.month)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-card/60 transition-colors text-left"
                aria-expanded={isOpen}
              >
                {m.emoji && <span className="text-xl shrink-0">{m.emoji}</span>}
                <div className="flex-1 min-w-0">
                  <p className="font-display text-base">{m.month}</p>
                  <p className="font-mono-label text-[10px] text-cream-3">
                    {m.tasks.length} задач{m.tasks.length === 1 ? "а" : m.tasks.length < 5 ? "и" : ""}
                    {high > 0 && ` · ${high} high`}
                  </p>
                </div>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-cream-3 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-cream-3 shrink-0" />
                )}
              </button>

              {isOpen && (
                <ol className="border-t border-border/40 p-3 space-y-2">
                  {m.tasks.map((t) => {
                    const Icon = CATEGORY_ICONS[t.category] ?? Sparkles
                    const pri = PRIORITY_STYLES[t.priority] ?? PRIORITY_STYLES.medium
                    return (
                      <li
                        key={t.id}
                        className={cn(
                          "rounded-lg border bg-card/30 p-3 border-l-[3px]",
                          pri.ring,
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="grid place-items-center h-7 w-7 rounded-md bg-card/60 shrink-0 mt-0.5">
                            <Icon className="h-3.5 w-3.5 text-cream-3" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <p className="font-display text-sm leading-snug">{t.title}</p>
                              <span className={cn("rounded-full border px-1.5 py-0 text-[10px] font-mono-label uppercase tracking-wider shrink-0", pri.chip)}>
                                {pri.label}
                              </span>
                            </div>
                            {t.description && (
                              <p className="font-serif text-[12.5px] text-cream-2 leading-relaxed">
                                {t.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 flex-wrap pt-0.5">
                              {t.deadline && (
                                <span className="inline-flex items-center gap-1 font-mono-label text-[10px] text-cream-3">
                                  <Calendar className="h-3 w-3" />
                                  {t.deadline}
                                </span>
                              )}
                              {t.duration && (
                                <span className="inline-flex items-center gap-1 font-mono-label text-[10px] text-cream-3">
                                  <Clock className="h-3 w-3" />
                                  {t.duration}
                                </span>
                              )}
                              <span className="font-mono-label text-[9px] text-cream-3/60 uppercase tracking-wider">
                                {t.category}
                              </span>
                            </div>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/**
 * Streaming-aware fallback: when JSON is mid-stream and unparseable,
 * show a small loader + the raw partial text in a small mono box so
 * the user sees progress without seeing a disaster of unclosed braces.
 */
export function TrackerStreaming({ partial }: { partial: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/20 p-4 space-y-2">
      <div className="flex items-center gap-2 text-cream-3">
        <AlertCircle className="h-4 w-4 text-gold" />
        <span className="font-mono-label text-[11px]">Генерирую план... парсинг JSON в процессе</span>
      </div>
      <pre className="font-mono text-[10px] text-cream-3/70 max-h-32 overflow-hidden whitespace-pre-wrap">
        {partial.slice(-400)}
      </pre>
    </div>
  )
}

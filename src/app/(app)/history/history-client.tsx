"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Markdown } from "@/components/markdown"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Search, X, Copy, Check, Calendar, Filter,
  Brain, Sparkles, Map, FileText, MessageSquare, Award, GraduationCap, Mail, FileUser, Wallet, ShieldCheck, Wand2, Bot,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type Run = {
  id: string
  tool: string
  output: { text: string } | null
  input: Record<string, unknown> | null
  duration_ms: number | null
  created_at: string
}

const TOOL_META: Record<string, { label: string; icon: LucideIcon }> = {
  profile: { label: "Профиль", icon: Brain },
  analyzer: { label: "Шансы", icon: Sparkles },
  tracker: { label: "Roadmap", icon: Map },
  university: { label: "Универы", icon: GraduationCap },
  scholarship: { label: "Стипендии", icon: Award },
  essay: { label: "Эссе", icon: FileText },
  humanizer: { label: "Humanizer", icon: Wand2 },
  interview: { label: "Interview", icon: MessageSquare },
  recommendation: { label: "Recommend.", icon: Mail },
  cv: { label: "CV", icon: FileUser },
  cost: { label: "Cost calc", icon: Wallet },
  reviewer: { label: "Reviewer", icon: ShieldCheck },
  counselor: { label: "Counselor", icon: Bot },
  app_suggest: { label: "App AI", icon: Sparkles },
  uni_insights: { label: "Uni AI", icon: Sparkles },
  doc_parse: { label: "Doc parse", icon: FileText },
  activity_rewrite: { label: "Activity AI", icon: Sparkles },
  interview_voice: { label: "Voice interview", icon: MessageSquare },
}

type DateFilter = "all" | "today" | "week" | "month"
const DATE_LABELS: Record<DateFilter, string> = {
  all: "Все",
  today: "Сегодня",
  week: "Неделя",
  month: "Месяц",
}

export function HistoryClient({ runs }: { runs: Run[] }) {
  const [search, setSearch] = useState("")
  const [activeTools, setActiveTools] = useState<Set<string>>(new Set())
  const [dateFilter, setDateFilter] = useState<DateFilter>("all")
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Distinct tools that actually appear in this user's history
  const toolCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of runs) m.set(r.tool, (m.get(r.tool) ?? 0) + 1)
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1])
  }, [runs])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const now = Date.now()
    const cutoff =
      dateFilter === "today" ? new Date().setHours(0, 0, 0, 0)
      : dateFilter === "week" ? now - 7 * 86_400_000
      : dateFilter === "month" ? now - 30 * 86_400_000
      : 0

    return runs.filter((r) => {
      if (activeTools.size > 0 && !activeTools.has(r.tool)) return false
      if (cutoff > 0 && new Date(r.created_at).getTime() < cutoff) return false
      if (q) {
        const txt = (r.output?.text ?? "").toLowerCase()
        const meta = (TOOL_META[r.tool]?.label ?? r.tool).toLowerCase()
        if (!txt.includes(q) && !meta.includes(q)) return false
      }
      return true
    })
  }, [runs, search, activeTools, dateFilter])

  function toggleTool(tool: string) {
    setActiveTools((prev) => {
      const next = new Set(prev)
      if (next.has(tool)) next.delete(tool)
      else next.add(tool)
      return next
    })
  }

  function clearFilters() {
    setSearch("")
    setActiveTools(new Set())
    setDateFilter("all")
  }

  async function copyOutput(id: string, text: string) {
    await navigator.clipboard?.writeText(text)
    setCopiedId(id)
    toast.success("Скопировано")
    setTimeout(() => setCopiedId(null), 2000)
  }

  const hasFilter = search.trim() || activeTools.size > 0 || dateFilter !== "all"

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Search + filters */}
        <div className="rounded-xl border border-border bg-card/40 p-4 space-y-4 sticky top-0 z-10 backdrop-blur">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream-3 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по результатам..."
              className="pl-9 pr-9"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-3 hover:text-cream"
                aria-label="Очистить"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Date filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="h-3.5 w-3.5 text-cream-3" />
            {(["all", "today", "week", "month"] as DateFilter[]).map((d) => (
              <button
                key={d}
                onClick={() => setDateFilter(d)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-mono-label transition-colors",
                  dateFilter === d
                    ? "bg-gold text-background"
                    : "bg-card border border-border text-cream-3 hover:text-cream"
                )}
              >
                {DATE_LABELS[d]}
              </button>
            ))}
          </div>

          {/* Tool filter chips */}
          {toolCounts.length > 1 && (
            <div className="flex items-start gap-2 flex-wrap">
              <Filter className="h-3.5 w-3.5 text-cream-3 mt-1.5 shrink-0" />
              {toolCounts.map(([tool, count]) => {
                const meta = TOOL_META[tool] ?? { label: tool, icon: Sparkles }
                const Icon = meta.icon
                const on = activeTools.has(tool)
                return (
                  <button
                    key={tool}
                    onClick={() => toggleTool(tool)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono-label transition-colors",
                      on
                        ? "bg-gold/15 text-gold border border-gold/40"
                        : "bg-card border border-border text-cream-3 hover:text-cream"
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {meta.label}
                    <span className={cn("text-[10px]", on ? "text-gold/80" : "text-cream-3")}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {hasFilter && (
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/40">
              <p className="font-mono-label text-[11px] text-cream-3">
                Показано: {filtered.length} из {runs.length}
              </p>
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5">
                <X className="h-3 w-3" />
                Сбросить
              </Button>
            </div>
          )}
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-card/20 p-10 text-center">
            <Search className="h-6 w-6 text-cream-3 mx-auto mb-3" />
            <p className="font-display text-base mb-1">Ничего не найдено</p>
            <p className="font-serif text-sm text-cream-3">Попробуй другие фильтры или сбрось их</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((run) => {
              const meta = TOOL_META[run.tool] ?? { label: run.tool, icon: Sparkles }
              const Icon = meta.icon
              const text = run.output?.text ?? ""
              return (
                <details
                  key={run.id}
                  className="group rounded-xl border border-border bg-card/40 overflow-hidden"
                >
                  <summary className="flex items-start gap-3 p-4 cursor-pointer hover:bg-card/60 transition-colors list-none">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-gold/10 shrink-0">
                      <Icon className="h-4 w-4 text-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-display text-sm">{meta.label}</span>
                        {run.duration_ms ? (
                          <span className="font-mono-label text-[10px] text-cream-3">
                            {(run.duration_ms / 1000).toFixed(1)}s
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm font-serif text-cream-2 line-clamp-1">
                        {text.slice(0, 200) || "(нет результата)"}
                      </p>
                      <p className="mt-1 font-mono-label text-[10px] text-cream-3">
                        {timeAgo(run.created_at)}
                      </p>
                    </div>
                    <span className="font-display text-xl text-gold shrink-0 transition-transform group-open:rotate-180 self-center">
                      ↓
                    </span>
                  </summary>
                  <div className="border-t border-border bg-background/40 p-5 accent-strip">
                    <div className="flex items-center justify-end gap-2 mb-3 print-hide">
                      {text && (
                        <Button variant="ghost" size="sm" onClick={() => copyOutput(run.id, text)} className="gap-1.5">
                          {copiedId === run.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          {copiedId === run.id ? "OK" : "Копировать"}
                        </Button>
                      )}
                    </div>
                    {text ? (
                      <Markdown>{text}</Markdown>
                    ) : (
                      <p className="font-mono-label text-cream-3">Нет данных</p>
                    )}
                  </div>
                </details>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
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
  return new Date(iso).toLocaleDateString("ru-RU", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

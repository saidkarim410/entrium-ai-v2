"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sparkles, Loader2, Trophy, AlertTriangle, Lightbulb, RotateCw, MapPin, ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type CompareUni = {
  id: string
  name: string
  country: string
  city: string | null
  qs_rank: number | null
  rank_display: string | null
  overall_score: number | null
  website: string | null
  metadata: Record<string, unknown> | null
}

type Analysis = {
  recommended_id: string
  recommended_reason: string
  rankings: Array<{
    id: string
    rank: number
    verdict: string
    category: "reach" | "match" | "safety"
  }>
  risks: string[]
  blind_spots: string[]
}

const CAT_COLORS: Record<"reach" | "match" | "safety", string> = {
  reach: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  match: "bg-gold/15 text-gold border-gold/30",
  safety: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
}

const METRICS: Array<{ key: string; label: string }> = [
  { key: "overall_score", label: "Overall" },
  { key: "academic_reputation", label: "Academic" },
  { key: "employer_reputation", label: "Employer" },
  { key: "research", label: "Research" },
  { key: "faculty_student", label: "Faculty/Student" },
  { key: "international_students", label: "International" },
]

export function CompareClient({ unis }: { unis: CompareUni[] }) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [pending, setPending] = useState(false)

  async function generate() {
    setPending(true)
    try {
      const res = await fetch("/api/universities/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: unis.map((u) => u.id) }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.message ?? json.error ?? "AI не смог")
        return
      }
      setAnalysis(json.analysis)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка")
    } finally {
      setPending(false)
    }
  }

  function getMetric(u: CompareUni, key: string): string {
    if (key === "overall_score") {
      return u.overall_score !== null ? Number(u.overall_score).toFixed(1) : "—"
    }
    const v = u.metadata?.[key]
    if (v === null || v === undefined || v === "") return "—"
    return String(v)
  }

  function rankFor(id: string): { rank: number; verdict: string; category: "reach" | "match" | "safety" } | null {
    return analysis?.rankings.find((r) => r.id === id) ?? null
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Comparison table */}
        <div className="rounded-xl border border-border bg-card/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card/60">
                  <th className="text-left px-4 py-3 font-mono-label text-[10px] text-cream-3 uppercase tracking-wider sticky left-0 bg-card/60 z-10 min-w-[120px]">
                    Metric
                  </th>
                  {unis.map((u) => {
                    const ranking = rankFor(u.id)
                    const isTop = analysis?.recommended_id === u.id
                    return (
                      <th
                        key={u.id}
                        className={cn(
                          "px-4 py-3 text-left min-w-[200px]",
                          isTop && "bg-gold/5"
                        )}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {isTop && <Trophy className="h-3.5 w-3.5 text-gold" />}
                            <Link
                              href={`/universities/${u.id}`}
                              className="font-display text-sm text-cream hover:text-gold transition-colors"
                            >
                              {u.name}
                            </Link>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-mono-label text-cream-3">
                            <MapPin className="h-2.5 w-2.5" />
                            {u.city ? `${u.city}, ` : ""}{u.country}
                          </div>
                          {ranking && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <Badge
                                variant="outline"
                                className="text-[9px] py-0 px-1.5 bg-card border-border"
                              >
                                #{ranking.rank} pick
                              </Badge>
                              <Badge
                                variant="outline"
                                className={cn("text-[9px] py-0 px-1.5", CAT_COLORS[ranking.category])}
                              >
                                {ranking.category.toUpperCase()}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {/* QS Rank row */}
                <tr className="border-b border-border/40">
                  <td className="px-4 py-3 font-mono-label text-[10px] text-cream-3 uppercase tracking-wider sticky left-0 bg-card/40 z-10">
                    QS Rank 2026
                  </td>
                  {unis.map((u) => (
                    <td key={u.id} className="px-4 py-3 font-display text-lg text-gold tabular-nums">
                      #{u.rank_display ?? u.qs_rank ?? "—"}
                    </td>
                  ))}
                </tr>
                {/* Metrics rows */}
                {METRICS.map((m) => (
                  <tr key={m.key} className="border-b border-border/40 last:border-0">
                    <td className="px-4 py-3 font-mono-label text-[10px] text-cream-3 uppercase tracking-wider sticky left-0 bg-card/40 z-10">
                      {m.label}
                    </td>
                    {unis.map((u) => (
                      <td key={u.id} className="px-4 py-3 font-mono text-cream-2 tabular-nums">
                        {getMetric(u, m.key)}
                      </td>
                    ))}
                  </tr>
                ))}
                {/* AI verdict row */}
                {analysis && (
                  <tr className="bg-card/20">
                    <td className="px-4 py-3 font-mono-label text-[10px] text-gold uppercase tracking-wider sticky left-0 bg-card/40 z-10">
                      AI verdict
                    </td>
                    {unis.map((u) => {
                      const ranking = rankFor(u.id)
                      return (
                        <td key={u.id} className="px-4 py-3 text-xs font-serif text-cream-2 leading-relaxed align-top">
                          {ranking?.verdict ?? "—"}
                        </td>
                      )
                    })}
                  </tr>
                )}
                {/* Website row */}
                <tr>
                  <td className="px-4 py-3 font-mono-label text-[10px] text-cream-3 uppercase tracking-wider sticky left-0 bg-card/40 z-10">
                    Website
                  </td>
                  {unis.map((u) => (
                    <td key={u.id} className="px-4 py-3 text-xs">
                      {u.website ? (
                        <a
                          href={u.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gold hover:underline inline-flex items-center gap-1"
                        >
                          Открыть <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : "—"}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* AI cohort analysis */}
        {!analysis ? (
          <section className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 to-transparent p-5 sm:p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-gold/20 shrink-0">
                <Sparkles className="h-5 w-5 text-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-lg sm:text-xl">AI ranks the cohort</h3>
                <p className="font-serif text-sm text-cream-2 leading-relaxed mt-0.5">
                  Учитывая твой профиль, AI отранжирует {unis.length} вузов по приоритету,
                  объяснит почему, найдёт стратегические риски (например «всё reach») и
                  предложит универы, которые ты пропустил.
                </p>
              </div>
            </div>
            <Button onClick={generate} disabled={pending} className="gap-2">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
              {pending ? "AI ранжирует..." : "Получить AI ranking"}
            </Button>
          </section>
        ) : (
          <div className="space-y-4">
            {/* Top pick */}
            <section className="rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/15 to-transparent p-5 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Trophy className="h-5 w-5 text-gold" />
                <p className="font-mono-label text-[10px] text-gold uppercase tracking-wider">Топ-приоритет</p>
                <Button variant="ghost" size="sm" onClick={generate} disabled={pending} className="ml-auto gap-1.5">
                  {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCw className="h-3 w-3" />}
                  Обновить
                </Button>
              </div>
              <p className="font-display text-2xl">
                {unis.find((u) => u.id === analysis.recommended_id)?.name ?? "—"}
              </p>
              <p className="font-serif text-base text-cream-2 leading-relaxed">
                {analysis.recommended_reason}
              </p>
            </section>

            {/* Risks + Blind spots */}
            <div className="grid sm:grid-cols-2 gap-4">
              {analysis.risks.length > 0 && (
                <section className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-rose-400" />
                    <p className="font-mono-label text-[10px] text-rose-300 uppercase tracking-wider">
                      Стратегические риски
                    </p>
                  </div>
                  <ul className="space-y-1.5 text-sm font-serif text-cream-2">
                    {analysis.risks.map((r, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-rose-400 mt-0.5 shrink-0">→</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {analysis.blind_spots.length > 0 && (
                <section className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-blue-300" />
                    <p className="font-mono-label text-[10px] text-blue-300 uppercase tracking-wider">
                      Что ещё рассмотреть
                    </p>
                  </div>
                  <ul className="space-y-1.5 text-sm font-serif text-cream-2">
                    {analysis.blind_spots.map((s, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-blue-300 mt-0.5 shrink-0">+</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

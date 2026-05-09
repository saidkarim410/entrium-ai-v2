"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sparkles, Loader2, Target, RotateCw, CheckCircle2, AlertTriangle, TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"

type Match = {
  match_score: number
  category: "strong" | "viable" | "stretch"
  verdict: string
  fits: string[]
  gaps: string[]
  apply_strategy: string
  next_actions: string[]
}

const CAT_COLORS: Record<Match["category"], string> = {
  strong: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  viable: "bg-gold/15 text-gold border-gold/30",
  stretch: "bg-rose-500/15 text-rose-300 border-rose-500/30",
}

const CAT_LABELS: Record<Match["category"], string> = {
  strong: "STRONG",
  viable: "VIABLE",
  stretch: "STRETCH",
}

export function ScholarshipMatchClient({
  scholarshipId,
  scholarshipName,
}: {
  scholarshipId: string
  scholarshipName: string
}) {
  const [match, setMatch] = useState<Match | null>(null)
  const [pending, setPending] = useState(false)

  async function generate() {
    setPending(true)
    try {
      const res = await fetch(`/api/scholarships/${scholarshipId}/match`, { method: "POST" })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.message ?? json.error ?? "AI не смог")
        return
      }
      setMatch(json.match)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка")
    } finally {
      setPending(false)
    }
  }

  if (!match) {
    return (
      <section className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 to-transparent p-5 sm:p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-gold/20 shrink-0">
            <Sparkles className="h-5 w-5 text-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-lg sm:text-xl">AI match-анализ</h3>
            <p className="font-serif text-sm text-cream-2 leading-relaxed mt-0.5">
              Сравню твой профиль с критериями {scholarshipName}: реалистичные шансы получить
              стипендию, конкретные fits/gaps, стратегия подачи и список действий до дедлайна.
            </p>
          </div>
        </div>
        <Button onClick={generate} disabled={pending} className="gap-2">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
          {pending ? "AI анализирует..." : "Получить AI match"}
        </Button>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/5 to-transparent p-5 sm:p-6 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-gold/20 shrink-0">
            <Sparkles className="h-6 w-6 text-gold" />
          </div>
          <div>
            <p className="font-mono-label text-[10px] text-cream-3 uppercase tracking-wider">AI Match Score</p>
            <div className="flex items-center gap-2.5">
              <span className="font-display text-3xl sm:text-4xl text-gold">{match.match_score}</span>
              <span className="font-display text-base text-cream-3">/100</span>
              <Badge className={cn("text-[10px] py-0 px-2", CAT_COLORS[match.category])}>
                {CAT_LABELS[match.category]}
              </Badge>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={generate} disabled={pending} className="gap-1.5">
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
          Обновить
        </Button>
      </div>

      <p className="font-serif text-base text-cream-2 leading-relaxed border-l-2 border-gold/40 pl-3 italic">
        {match.verdict}
      </p>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <p className="font-mono-label text-[10px] text-emerald-300 uppercase tracking-wider">Подходит</p>
          </div>
          <ul className="space-y-1.5 text-sm font-serif text-cream-2">
            {match.fits.map((f, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-emerald-400 mt-0.5 shrink-0">→</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400" />
            <p className="font-mono-label text-[10px] text-rose-300 uppercase tracking-wider">Пробелы</p>
          </div>
          <ul className="space-y-1.5 text-sm font-serif text-cream-2">
            {match.gaps.map((g, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-rose-400 mt-0.5 shrink-0">→</span>
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-lg bg-card/40 border border-border p-4">
        <p className="font-mono-label text-[10px] text-cream-3 uppercase tracking-wider mb-1">Стратегия подачи</p>
        <p className="font-serif text-sm text-cream-2 leading-relaxed">{match.apply_strategy}</p>
      </div>

      <div className="rounded-lg border border-gold/20 bg-gold/5 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-gold" />
          <p className="font-mono-label text-[10px] text-gold uppercase tracking-wider">До дедлайна</p>
        </div>
        <ul className="space-y-1.5 text-sm font-serif text-cream-2">
          {match.next_actions.map((a, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-gold mt-0.5 shrink-0">{i + 1}.</span>
              <span>{a}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

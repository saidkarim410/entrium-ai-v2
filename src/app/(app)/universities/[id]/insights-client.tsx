"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sparkles, Loader2, Target, AlertTriangle, CheckCircle2, ArrowRight, RotateCw, TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"

type Insights = {
  match_score: number
  category: "reach" | "match" | "safety"
  verdict: string
  strengths: string[]
  weaknesses: string[]
  focus_areas: string[]
  application_strategy: string
}

const CAT_COLORS: Record<Insights["category"], string> = {
  reach: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  match: "bg-gold/15 text-gold border-gold/30",
  safety: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
}

const CAT_LABELS: Record<Insights["category"], string> = {
  reach: "REACH",
  match: "MATCH",
  safety: "SAFETY",
}

export function UniInsightsClient({ universityId, universityName }: { universityId: string; universityName: string }) {
  const [data, setData] = useState<Insights | null>(null)
  const [pending, setPending] = useState(false)

  async function generate() {
    setPending(true)
    try {
      const res = await fetch(`/api/universities/${universityId}/insights`, { method: "POST" })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.message ?? json.error ?? "AI не смог")
        return
      }
      setData(json.insights)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка")
    } finally {
      setPending(false)
    }
  }

  if (!data) {
    return (
      <section className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 to-transparent p-5 sm:p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-gold/20 shrink-0">
            <Sparkles className="h-5 w-5 text-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-lg sm:text-xl">AI fit-анализ</h3>
            <p className="font-serif text-sm text-cream-2 leading-relaxed mt-0.5">
              Сравню твой профиль с {universityName}: реалистичную вероятность поступления (reach/match/safety),
              сильные стороны, конкретные слабости и список действий ДО подачи.
            </p>
          </div>
        </div>
        <Button onClick={generate} disabled={pending} className="gap-2">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
          {pending ? "AI анализирует профиль..." : "Получить AI fit-анализ"}
        </Button>
        <p className="font-mono-label text-[10px] text-cream-3">
          Использует профиль из /settings · 1 запрос из дневной квоты
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/5 to-transparent p-5 sm:p-6 space-y-5">
      {/* Score header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-gold/20 shrink-0">
            <Sparkles className="h-6 w-6 text-gold" />
          </div>
          <div>
            <p className="font-mono-label text-[10px] text-cream-3 uppercase tracking-wider">AI Match Score</p>
            <div className="flex items-center gap-2.5">
              <span className="font-display text-3xl sm:text-4xl text-gold">{data.match_score}</span>
              <span className="font-display text-base text-cream-3">/100</span>
              <Badge className={cn("text-[10px] py-0 px-2", CAT_COLORS[data.category])}>
                {CAT_LABELS[data.category]}
              </Badge>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={generate} disabled={pending} className="gap-1.5">
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
          Обновить
        </Button>
      </div>

      {/* Verdict */}
      <p className="font-serif text-base text-cream-2 leading-relaxed border-l-2 border-gold/40 pl-3 italic">
        {data.verdict}
      </p>

      {/* Strengths + Weaknesses */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <p className="font-mono-label text-[10px] text-emerald-300 uppercase tracking-wider">Сильные стороны</p>
          </div>
          <ul className="space-y-1.5 text-sm font-serif text-cream-2">
            {data.strengths.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-emerald-400 mt-0.5 shrink-0">→</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400" />
            <p className="font-mono-label text-[10px] text-rose-300 uppercase tracking-wider">Слабые места</p>
          </div>
          <ul className="space-y-1.5 text-sm font-serif text-cream-2">
            {data.weaknesses.map((w, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-rose-400 mt-0.5 shrink-0">→</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Focus areas */}
      <div className="rounded-lg border border-gold/20 bg-gold/5 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-gold" />
          <p className="font-mono-label text-[10px] text-gold uppercase tracking-wider">
            Что сделать ДО подачи
          </p>
        </div>
        <ul className="space-y-1.5 text-sm font-serif text-cream-2">
          {data.focus_areas.map((f, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-gold mt-0.5 shrink-0">{i + 1}.</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Strategy */}
      <div className="rounded-lg bg-card/40 border border-border p-4">
        <p className="font-mono-label text-[10px] text-cream-3 uppercase tracking-wider mb-1">Стратегия подачи</p>
        <p className="font-serif text-sm text-cream-2 leading-relaxed">{data.application_strategy}</p>
      </div>

      <p className="font-mono-label text-[10px] text-cream-3 flex items-center gap-1.5">
        <ArrowRight className="h-3 w-3" />
        Анализ работает с твоим текущим профилем — обнови /settings для точности
      </p>
    </section>
  )
}

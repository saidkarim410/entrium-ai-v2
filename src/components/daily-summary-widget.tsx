"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2, RotateCw, ArrowRight, Lightbulb, ListChecks, Heart } from "lucide-react"
import { AiLoadingSkeleton, AiErrorCard, AiEmptyCta } from "@/components/ai-state"

type Summary = {
  greeting: string
  focus_title: string
  focus_body: string
  focus_href: string
  insight: string
  todos: Array<{ label: string; href: string }>
  motivation: string
}

export function DailySummaryWidget() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/daily-summary")
      .then((r) => r.json())
      .then((j) => setSummary(j.summary ?? null))
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])

  async function generate(force = false) {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch("/api/daily-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.message ?? json.error ?? "AI не ответил — попробуй ещё раз")
        return
      }
      setSummary(json.summary)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Сетевая ошибка")
    } finally {
      setGenerating(false)
    }
  }

  // Initial fetch in flight: show shape-matched skeleton, not a one-liner spinner
  if (loading) return <AiLoadingSkeleton />

  // First-time generation also uses the shimmer
  if (generating && !summary) return <AiLoadingSkeleton />

  if (error && !summary) {
    return <AiErrorCard message={error} onRetry={() => generate(false)} retrying={generating} />
  }

  if (!summary) {
    return (
      <AiEmptyCta
        title="Сгенерировать AI-фокус дня"
        description="Каждое утро AI смотрит на твои заявки и профиль и формирует одно главное действие на сегодня + 2-4 поддерживающих. На основе реального состояния, не общие советы."
        buttonLabel="Получить фокус на сегодня"
        onClick={() => generate(false)}
        pending={generating}
      />
    )
  }

  return (
    <section className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 via-card/40 to-transparent p-5 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-gold/20 shrink-0">
            <Sparkles className="h-5 w-5 text-gold" />
          </div>
          <div className="min-w-0">
            <p className="font-mono-label text-[11px] text-gold uppercase tracking-wider">DAILY FOCUS · AI</p>
            <p className="font-display text-base text-cream-2">{summary.greeting}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => generate(true)}
          disabled={generating}
          className="gap-1.5 shrink-0"
          aria-label="Обновить"
        >
          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
          Обновить
        </Button>
      </div>

      {/* Main focus */}
      <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 space-y-2">
        <h3 className="font-display text-lg sm:text-xl">{summary.focus_title}</h3>
        <p className="font-serif text-sm text-cream-2 leading-relaxed">{summary.focus_body}</p>
        <Link
          href={summary.focus_href}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gold hover:underline"
        >
          Перейти
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Insight + Todos */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 space-y-1">
          <div className="flex items-center gap-1.5">
            <Lightbulb className="h-3.5 w-3.5 text-blue-300" />
            <p className="font-mono-label text-[10px] text-blue-300 uppercase tracking-wider">Inseright</p>
          </div>
          <p className="font-serif text-sm text-cream-2 leading-relaxed">{summary.insight}</p>
        </div>

        <div className="rounded-lg border border-border bg-card/40 p-3 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <ListChecks className="h-3.5 w-3.5 text-cream-3" />
            <p className="font-mono-label text-[10px] text-cream-3 uppercase tracking-wider">Today</p>
          </div>
          <ul className="space-y-1">
            {summary.todos.map((t, i) => (
              <li key={i}>
                <Link
                  href={t.href}
                  className="flex items-start gap-2 text-sm font-serif text-cream-2 hover:text-gold transition-colors group"
                >
                  <span className="text-cream-3 mt-0.5 shrink-0">{i + 1}.</span>
                  <span className="flex-1 min-w-0">{t.label}</span>
                  <ArrowRight className="h-3 w-3 text-cream-3/50 group-hover:text-gold shrink-0 mt-1" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Motivation */}
      <div className="flex items-start gap-2 text-xs font-serif text-cream-3 italic border-t border-border/40 pt-3">
        <Heart className="h-3.5 w-3.5 text-cream-3 shrink-0 mt-0.5" />
        <span>{summary.motivation}</span>
      </div>
    </section>
  )
}

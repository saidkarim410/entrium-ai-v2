"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Markdown } from "@/components/markdown"
import { MISSIONS, type Mission, type MissionId } from "@/lib/agent/missions"
import {
  Bot, Zap, Briefcase, ShieldCheck, Calendar,
  Loader2, CheckCircle2, AlertCircle, Square, Play, Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"

const ICONS = { Zap, Briefcase, ShieldCheck, Calendar } as const

type StepState = {
  step: number
  tool: string
  title: string
  description: string
  text: string
  status: "running" | "done" | "error"
}

type RunState = {
  missionId: MissionId
  totalSteps: number
  steps: StepState[]
  status: "running" | "done" | "error" | "aborted"
  errorMessage?: string
}

export function AgentClient({ profileCompleteness }: { profileCompleteness: number }) {
  const [run, setRun] = useState<RunState | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const isRunning = run?.status === "running"

  async function startMission(mission: Mission) {
    if (isRunning) return

    if (profileCompleteness < 30) {
      toast.error("Заполни профиль хотя бы на 30% — открой Настройки или пройди онбординг")
      return
    }

    const controller = new AbortController()
    abortRef.current = controller

    setRun({
      missionId: mission.id,
      totalSteps: mission.steps.length,
      steps: [],
      status: "running",
    })

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missionId: mission.id }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const msg = err.message || err.error || `HTTP ${res.status}`
        toast.error(msg)
        setRun((r) => (r ? { ...r, status: "error", errorMessage: msg } : r))
        return
      }

      if (!res.body) throw new Error("Пустой ответ от сервера")

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const evt = JSON.parse(line)
            handleEvent(evt)
          } catch (e) {
            console.error("Bad NDJSON line:", line, e)
          }
        }
      }
    } catch (err) {
      if (controller.signal.aborted) {
        setRun((r) => (r ? { ...r, status: "aborted" } : r))
        return
      }
      const msg = err instanceof Error ? err.message : "Ошибка"
      toast.error(msg)
      setRun((r) => (r ? { ...r, status: "error", errorMessage: msg } : r))
    }
  }

  function handleEvent(evt: {
    type: string
    step?: number
    tool?: string
    title?: string
    description?: string
    text?: string
    totalSteps?: number
    message?: string
  }) {
    setRun((prev) => {
      if (!prev) return prev

      switch (evt.type) {
        case "meta":
          return prev

        case "step_start":
          if (evt.step === undefined) return prev
          return {
            ...prev,
            steps: [
              ...prev.steps,
              {
                step: evt.step,
                tool: evt.tool ?? "",
                title: evt.title ?? `Шаг ${evt.step}`,
                description: evt.description ?? "",
                text: "",
                status: "running",
              },
            ],
          }

        case "delta":
          if (evt.step === undefined || !evt.text) return prev
          return {
            ...prev,
            steps: prev.steps.map((s) =>
              s.step === evt.step ? { ...s, text: s.text + evt.text } : s
            ),
          }

        case "step_end":
          return {
            ...prev,
            steps: prev.steps.map((s) =>
              s.step === evt.step ? { ...s, status: "done" } : s
            ),
          }

        case "done":
          return { ...prev, status: "done" }

        case "error":
          toast.error(evt.message ?? "Pipeline прервался")
          return { ...prev, status: "error", errorMessage: evt.message }

        default:
          return prev
      }
    })
  }

  function abort() {
    abortRef.current?.abort()
  }

  function reset() {
    setRun(null)
  }

  // ── Mission picker ──────────────────────────────────────────────────────
  if (!run) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
          {/* Hero */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-xs font-mono-label text-gold">
              <Sparkles className="h-3 w-3" />
              BETA · Автономный pipeline
            </div>
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight">
              Один клик — несколько инструментов
            </h2>
            <p className="font-serif text-cream-2 text-base max-w-2xl mx-auto leading-relaxed">
              Agent сам запустит нужные tools в правильном порядке, передавая контекст
              профиля между шагами. Получи комплексный ответ, а не отдельные кусочки.
            </p>
          </div>

          {/* Profile completeness warning */}
          {profileCompleteness < 50 && (
            <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1 min-w-0">
                <p className="font-display text-sm">Профиль заполнен на {profileCompleteness}%</p>
                <p className="font-serif text-sm text-cream-2">
                  Чем полнее профиль, тем точнее работает Agent.{" "}
                  <Link href="/settings" className="text-gold hover:underline">
                    Заполни профиль →
                  </Link>
                </p>
              </div>
            </div>
          )}

          {/* Mission cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MISSIONS.map((m) => {
              const Icon = ICONS[m.icon]
              return (
                <button
                  key={m.id}
                  onClick={() => startMission(m)}
                  className="group text-left rounded-xl border border-border bg-card/40 hover:bg-card hover:border-gold/40 transition-all p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-gold/15 group-hover:bg-gold/25 transition-colors">
                      <Icon className="h-5 w-5 text-gold" />
                    </div>
                    <div className="font-mono-label text-[10px] text-cream-3 shrink-0">
                      {m.steps.length} шага · {m.duration}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-display text-lg">{m.title}</h3>
                    <p className="font-serif text-sm text-cream-2 leading-relaxed">{m.subtitle}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {m.steps.map((s, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-mono-label px-2 py-0.5 rounded border border-border/60 text-cream-3"
                      >
                        {i + 1}. {s.tool}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-mono-label text-gold pt-1 group-hover:translate-x-0.5 transition-transform">
                    <Play className="h-3 w-3" />
                    Запустить
                  </div>
                </button>
              )
            })}
          </div>

          {/* Footer note */}
          <div className="text-center pt-4">
            <p className="font-mono-label text-[11px] text-cream-3">
              Каждый шаг = 1 запрос. Free tier: проверь лимит перед запуском.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Mission running / done view ─────────────────────────────────────────
  const mission = MISSIONS.find((m) => m.id === run.missionId)!
  const Icon = ICONS[mission.icon]
  const finishedSteps = run.steps.filter((s) => s.status === "done").length

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Run header */}
        <div className="rounded-xl border border-border bg-card/40 p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-gold/15">
              <Icon className="h-5 w-5 text-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-lg truncate">{mission.title}</h2>
              <p className="font-mono-label text-[11px] text-cream-3">
                {finishedSteps} / {run.totalSteps} шагов
                {run.status === "done" && " · готово"}
                {run.status === "error" && " · ошибка"}
                {run.status === "aborted" && " · отменено"}
              </p>
            </div>
            <div className="flex gap-2">
              {isRunning && (
                <Button variant="outline" size="sm" onClick={abort}>
                  <Square className="h-3.5 w-3.5 mr-1.5" />
                  Стоп
                </Button>
              )}
              {!isRunning && (
                <Button variant="outline" size="sm" onClick={reset}>
                  Новая миссия
                </Button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-border/40 overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-500",
                run.status === "error" ? "bg-destructive" : "bg-gold"
              )}
              style={{ width: `${(finishedSteps / run.totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {run.steps.map((s) => (
            <StepCard key={s.step} step={s} />
          ))}

          {/* Pending steps placeholder */}
          {run.status === "running" &&
            mission.steps
              .slice(run.steps.length + (run.steps.at(-1)?.status === "running" ? 0 : 0))
              .map((s, i) => {
                const stepNum = run.steps.length + 1 + i
                if (stepNum <= (run.steps.at(-1)?.step ?? 0)) return null
                return (
                  <div
                    key={`pending-${stepNum}`}
                    className="rounded-xl border border-dashed border-border/60 bg-card/20 p-4 flex items-center gap-3 opacity-50"
                  >
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-card border border-border text-xs font-mono-label text-cream-3">
                      {stepNum}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-sm truncate">{s.title}</p>
                      <p className="font-mono-label text-[10px] text-cream-3 truncate">{s.description}</p>
                    </div>
                  </div>
                )
              })}
        </div>

        {run.status === "error" && run.errorMessage && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm text-destructive">{run.errorMessage}</div>
          </div>
        )}

        {run.status === "done" && (
          <div className="rounded-xl border border-gold/30 bg-gold/5 p-5 text-center space-y-2">
            <CheckCircle2 className="h-8 w-8 text-gold mx-auto" />
            <p className="font-display text-lg">Миссия выполнена</p>
            <p className="font-serif text-sm text-cream-2">
              Все результаты сохранены в{" "}
              <Link href="/history" className="text-gold hover:underline">
                Истории
              </Link>
              . Можешь запустить ещё одну миссию или открыть отдельный tool для глубокого dive.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function StepCard({ step }: { step: StepState }) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card/40 p-4 sm:p-5 space-y-3",
        step.status === "done" && "border-gold/30",
        step.status === "running" && "border-gold/40 shadow-[0_0_0_1px_rgb(217,176,116,0.15)]",
        step.status === "error" && "border-destructive/40"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gold/15 shrink-0">
          {step.status === "running" ? (
            <Loader2 className="h-4 w-4 text-gold animate-spin" />
          ) : step.status === "done" ? (
            <CheckCircle2 className="h-4 w-4 text-gold" />
          ) : (
            <Bot className="h-4 w-4 text-gold" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-base truncate">
            <span className="text-cream-3 mr-1.5">#{step.step}</span>
            {step.title}
          </h3>
          <p className="font-mono-label text-[10px] text-cream-3 truncate">
            tool · {step.tool}
          </p>
        </div>
      </div>

      {step.text ? (
        <div className="border-t border-border/40 pt-3">
          <Markdown>{step.text}</Markdown>
        </div>
      ) : step.status === "running" ? (
        <p className="font-mono-label text-[11px] text-cream-3 italic border-t border-border/40 pt-3">
          {step.description || "генерирую ответ..."}
        </p>
      ) : null}
    </div>
  )
}

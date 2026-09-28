"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Markdown } from "@/components/markdown"
import { MISSIONS, type Mission, type MissionId } from "@/lib/agent/missions"
import type { MissionRunRecord, MissionRunStatus } from "@/lib/agent/run-state"
import { describeStepFailure, type StepFailReason } from "@/lib/agent/run-step"
import { parseTracker, TrackerView, TrackerStreaming } from "./tracker-view"
import {
  Bot, Zap, Briefcase, ShieldCheck, Calendar,
  Loader2, CheckCircle2, AlertCircle, Square, Play, Sparkles, RotateCcw, XCircle, ListChecks,
} from "lucide-react"
import { savePlanFromRun } from "@/lib/plan/actions"
import { cn } from "@/lib/utils"

const ICONS = { Zap, Briefcase, ShieldCheck, Calendar } as const
const LAST_RUN_KEY = "entrium:agent:lastRunId"
/** A failed/partial mission is offered for retry on reload for this long. */
const RESTORE_WINDOW_MS = 24 * 60 * 60 * 1000

type StepStatus = "pending" | "running" | "completed" | "failed"

type StepState = {
  step: number
  tool: string
  title: string
  description: string
  text: string
  status: StepStatus
  reason?: StepFailReason
  attempt?: number
  warnings?: string[]
}

type RunState = {
  runId: string | null
  missionId: MissionId
  totalSteps: number
  steps: StepState[]
  status: "running" | MissionRunStatus | "aborted" | "error"
  errorMessage?: string
}

type UsageProps = { tier: "free" | "pro"; remaining: number; bonus: number; limit: number }

type AgentEvent = {
  type: string
  runId?: string
  step?: number
  tool?: string
  title?: string
  description?: string
  text?: string
  totalSteps?: number
  message?: string
  reason?: StepFailReason
  attempt?: number
  status?: MissionRunStatus
  warnings?: string[]
  steps?: MissionRunRecord["steps"]
}

function fromRecord(run: MissionRunRecord): RunState {
  return {
    runId: run.id,
    missionId: run.missionId,
    totalSteps: run.steps.length,
    status: run.status,
    steps: run.steps.map((s) => ({
      step: s.step,
      tool: s.tool,
      title: s.title,
      description: s.description,
      text: s.text ?? "",
      status: s.status,
      reason: s.reason,
      attempt: s.attempts,
      warnings: s.warnings,
    })),
  }
}

function rememberRun(id: string | null) {
  try {
    if (id) localStorage.setItem(LAST_RUN_KEY, id)
    else localStorage.removeItem(LAST_RUN_KEY)
  } catch {
    /* private mode etc. — restore is a convenience only */
  }
}

function statusLabel(status: RunState["status"]): string {
  switch (status) {
    case "completed": return " · готово"
    case "partial": return " · завершено с ошибками"
    case "failed": return " · не удалось"
    case "aborted": return " · остановлено"
    case "error": return " · ошибка"
    default: return ""
  }
}

export function AgentClient({
  profileCompleteness,
  missingFields,
  usage,
  initialRunId,
}: {
  profileCompleteness: number
  missingFields: string[]
  usage: UsageProps
  initialRunId: string | null
}) {
  const [run, setRun] = useState<RunState | null>(null)
  const [restoring, setRestoring] = useState(true)
  const [planSaved, setPlanSaved] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  // Set once the user starts a mission — a slow restore must not overwrite it.
  const startedRef = useRef(false)

  const isRunning = run?.status === "running"

  // ── Restore after refresh (P0-01) ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function restore() {
      let id = initialRunId
      if (!id) {
        try {
          id = localStorage.getItem(LAST_RUN_KEY)
        } catch {
          id = null
        }
      }
      if (!id) {
        setRestoring(false)
        return
      }
      try {
        const res = await fetch(`/api/agent/runs/${id}`, { cache: "no-store" })
        if (res.ok) {
          const data = (await res.json()) as { run: MissionRunRecord }
          // Only an interrupted or recently failed mission is worth putting back on
          // screen. A completed run belongs to History — restoring yesterday's result
          // as the "current mission" (found by the manual regression run) is confusing,
          // especially when the prompts have changed since. An explicit ?run= link
          // always shows the run.
          const rec = data.run
          const ageMs = rec ? Date.now() - new Date(rec.updatedAt || rec.createdAt).getTime() : Infinity
          const worthRestoring =
            Boolean(initialRunId) ||
            rec?.status === "running" ||
            ((rec?.status === "partial" || rec?.status === "failed") && ageMs < RESTORE_WINDOW_MS)
          if (!rec || !worthRestoring) {
            rememberRun(null)
          } else if (!cancelled && !startedRef.current) {
            setRun(fromRecord(rec))
          }
        } else if (res.status === 404) {
          rememberRun(null)
        }
      } catch {
        /* offline — show the picker */
      } finally {
        if (!cancelled) setRestoring(false)
      }
    }
    restore()
    return () => {
      cancelled = true
    }
  }, [initialRunId])

  // ── Event handling ─────────────────────────────────────────────────────
  const handleEvent = useCallback((evt: AgentEvent) => {
    if (evt.type === "run" && evt.runId) rememberRun(evt.runId)
    setRun((prev) => {
      if (!prev) return prev
      switch (evt.type) {
        case "run":
          return { ...prev, runId: evt.runId ?? prev.runId }

        case "meta":
          // Server sends the full step list so pending steps render with real titles.
          if (Array.isArray(evt.steps) && prev.steps.length === 0) {
            return {
              ...prev,
              totalSteps: evt.steps.length,
              steps: evt.steps.map((s) => ({
                step: s.step,
                tool: s.tool,
                title: s.title,
                description: s.description,
                text: s.text ?? "",
                status: s.status,
                reason: s.reason,
              })),
            }
          }
          return prev

        case "step_start":
          if (evt.step === undefined) return prev
          return {
            ...prev,
            steps: prev.steps.map((s) =>
              s.step === evt.step
                ? { ...s, status: "running", text: "", reason: undefined, attempt: 1, warnings: undefined }
                : s
            ),
          }

        case "delta":
          if (evt.step === undefined || !evt.text) return prev
          return {
            ...prev,
            steps: prev.steps.map((s) => (s.step === evt.step ? { ...s, text: s.text + evt.text } : s)),
          }

        case "step_retry":
          // The first attempt was rejected — drop the partial text, show attempt #2
          return {
            ...prev,
            steps: prev.steps.map((s) =>
              s.step === evt.step ? { ...s, text: "", attempt: evt.attempt ?? 2 } : s
            ),
          }

        case "step_end":
          return {
            ...prev,
            steps: prev.steps.map((s) =>
              s.step === evt.step
                ? { ...s, status: "completed", text: evt.text ?? s.text, warnings: evt.warnings }
                : s
            ),
          }

        case "step_failed":
          return {
            ...prev,
            steps: prev.steps.map((s) =>
              s.step === evt.step ? { ...s, status: "failed", text: "", reason: evt.reason } : s
            ),
          }

        case "done":
          return { ...prev, status: evt.status ?? "completed" }

        case "error":
          toast.error("Pipeline прервался — незавершённые шаги можно повторить")
          return {
            ...prev,
            status: "error",
            errorMessage: evt.message,
            steps: prev.steps.map((s) =>
              s.status === "running" ? { ...s, status: "failed", reason: "model_error", text: "" } : s
            ),
          }

        default:
          return prev
      }
    })
  }, [])

  async function consume(res: Response, controller: AbortController) {
    if (!res.body) throw new Error("Пустой ответ от сервера")
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            handleEvent(JSON.parse(line))
          } catch (e) {
            console.error("Bad NDJSON line:", line, e)
          }
        }
      }
    } catch (err) {
      if (controller.signal.aborted) {
        setRun((r) =>
          r
            ? {
                ...r,
                status: "aborted",
                steps: r.steps.map((s) =>
                  s.status === "running" || s.status === "pending"
                    ? { ...s, status: "failed", reason: "aborted", text: "" }
                    : s
                ),
              }
            : r
        )
        return
      }
      throw err
    }
  }

  async function post(body: Record<string, unknown>): Promise<Response | null> {
    const controller = new AbortController()
    abortRef.current = controller
    const res = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      const msg = err.message || err.error || `HTTP ${res.status}`
      toast.error(msg)
      setRun((r) => (r ? { ...r, status: "error", errorMessage: msg } : r))
      return null
    }
    await consume(res, controller)
    return res
  }

  async function startMission(mission: Mission) {
    if (isRunning) return
    if (profileCompleteness < 30) {
      toast.error("Заполни профиль хотя бы на 30% — открой Настройки или пройди онбординг")
      return
    }
    const cost = mission.steps.length
    const available = usage.remaining + usage.bonus
    if (usage.tier === "free" && available < cost) {
      toast.error(`Эта миссия стоит ${cost} запроса, доступно ${available}. Выбери миссию короче или обнови до Pro.`)
      return
    }

    startedRef.current = true
    setRun({
      runId: null,
      missionId: mission.id,
      totalSteps: mission.steps.length,
      steps: mission.steps.map((s, i) => ({
        step: i + 1,
        tool: s.tool,
        title: s.title,
        description: s.description,
        text: "",
        status: "pending",
      })),
      status: "running",
    })

    try {
      await post({ missionId: mission.id })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ошибка"
      toast.error(msg)
      setRun((r) => (r ? { ...r, status: "error", errorMessage: msg } : r))
    }
  }

  async function retryStep(stepNum: number) {
    if (!run?.runId || isRunning) return
    setRun((r) =>
      r
        ? {
            ...r,
            status: "running",
            errorMessage: undefined,
            steps: r.steps.map((s) =>
              s.step === stepNum ? { ...s, status: "running", text: "", reason: undefined, attempt: 1 } : s
            ),
          }
        : r
    )
    try {
      await post({ runId: run.runId, step: stepNum })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ошибка"
      toast.error(msg)
      setRun((r) => (r ? { ...r, status: "error", errorMessage: msg } : r))
    }
  }

  function abort() {
    abortRef.current?.abort()
  }

  // P1-03: the plan step becomes editable tasks in /plan
  function savePlan() {
    if (!run?.runId) return
    const runId = run.runId
    savePlanFromRun(runId).then((res) => {
      if (!res.ok) {
        toast.error(res.error === "plan_table_missing" ? "Раздел «План» ещё не активирован (миграция 0026)" : res.error)
        return
      }
      setPlanSaved(true)
      toast.success(res.already ? "План уже сохранён — открой раздел «План»" : `Сохранено задач: ${res.inserted}. Открой раздел «План».`)
    })
  }

  function reset() {
    rememberRun(null)
    setRun(null)
  }

  // ── Mission picker ──────────────────────────────────────────────────────
  if (!run) {
    const available = usage.tier === "pro" ? Infinity : usage.remaining + usage.bonus
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
            {restoring && (
              <p className="font-mono-label text-[11px] text-cream-3 inline-flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" /> проверяю прошлую миссию…
              </p>
            )}
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
                {missingFields.length > 0 && (
                  <p className="font-mono-label text-[11px] text-cream-3">
                    Не хватает: {missingFields.join(" · ")}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Quota line (P1-04: the same number the server enforces) */}
          <div className="rounded-xl border border-border/60 bg-card/30 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono-label text-[11px] text-cream-3">
              Каждый шаг миссии = 1 запрос.
            </p>
            <p className="font-mono-label text-[11px]">
              {usage.tier === "pro" ? (
                <span className="text-gold">Pro · без лимита</span>
              ) : (
                <span className={cn(available === 0 ? "text-destructive" : "text-cream-2")}>
                  Сегодня доступно {usage.remaining} из {usage.limit}
                  {usage.bonus > 0 && ` + ${usage.bonus} бонусных`}
                </span>
              )}
            </p>
          </div>

          {/* Mission cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MISSIONS.map((m) => {
              const Icon = ICONS[m.icon]
              const cost = m.steps.length
              const affordable = available >= cost
              return (
                <button
                  key={m.id}
                  onClick={() => startMission(m)}
                  disabled={restoring}
                  className={cn(
                    "group text-left rounded-xl border border-border bg-card/40 hover:bg-card hover:border-gold/40 transition-all p-5 space-y-3 disabled:opacity-60",
                    !affordable && "opacity-70 hover:border-border"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-gold/15 group-hover:bg-gold/25 transition-colors">
                      <Icon className="h-5 w-5 text-gold" />
                    </div>
                    <div className="font-mono-label text-[10px] text-cream-3 shrink-0 text-right">
                      {m.steps.length} шага · {m.duration}
                      <br />
                      <span className={cn(affordable ? "text-cream-3" : "text-destructive")}>
                        стоимость: {cost} запрос{cost === 1 ? "" : cost < 5 ? "а" : "ов"}
                      </span>
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
                    {affordable ? "Запустить" : "Не хватает запросов на сегодня"}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ── Mission running / done view ─────────────────────────────────────────
  const mission = MISSIONS.find((m) => m.id === run.missionId)!
  const Icon = ICONS[mission.icon]
  const finishedSteps = run.steps.filter((s) => s.status === "completed").length
  const failedSteps = run.steps.filter((s) => s.status === "failed").length

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
                {finishedSteps} / {run.totalSteps} шагов готово
                {failedSteps > 0 && ` · ${failedSteps} с ошибкой`}
                {statusLabel(run.status)}
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
                run.status === "error" || run.status === "failed" ? "bg-destructive" : "bg-gold"
              )}
              style={{ width: `${(finishedSteps / run.totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {run.steps.map((s) => (
            <StepCard
              key={s.step}
              step={s}
              canRetry={!isRunning && Boolean(run.runId) && s.status === "failed"}
              onRetry={() => retryStep(s.step)}
              canSavePlan={!isRunning && Boolean(run.runId) && s.tool === "tracker" && s.status === "completed" && !planSaved}
              onSavePlan={savePlan}
            />
          ))}
        </div>

        {run.status === "error" && run.errorMessage && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm text-destructive">{run.errorMessage}</div>
          </div>
        )}

        {run.status === "completed" && (
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

        {run.status === "partial" && (
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-5 text-center space-y-2">
            <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto" />
            <p className="font-display text-lg">Миссия завершена частично</p>
            <p className="font-serif text-sm text-cream-2">
              {finishedSteps} из {run.totalSteps} шагов готовы. Неудавшиеся шаги можно повторить по одному —
              запросы за них не списаны.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function StepCard({
  step,
  canRetry,
  onRetry,
  canSavePlan,
  onSavePlan,
}: {
  step: StepState
  canRetry: boolean
  onRetry: () => void
  canSavePlan?: boolean
  onSavePlan?: () => void
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card/40 p-4 sm:p-5 space-y-3",
        step.status === "completed" && "border-gold/30",
        step.status === "running" && "border-gold/40 shadow-[0_0_0_1px_rgb(217,176,116,0.15)]",
        step.status === "failed" && "border-destructive/40",
        step.status === "pending" && "border-dashed border-border/60 opacity-60"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gold/15 shrink-0">
          {step.status === "running" ? (
            <Loader2 className="h-4 w-4 text-gold animate-spin" />
          ) : step.status === "completed" ? (
            <CheckCircle2 className="h-4 w-4 text-gold" />
          ) : step.status === "failed" ? (
            <XCircle className="h-4 w-4 text-destructive" />
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
            {step.status === "running" && step.attempt && step.attempt > 1 && ` · попытка ${step.attempt}`}
          </p>
        </div>
        {canRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Повторить шаг
          </Button>
        )}
        {canSavePlan && onSavePlan && (
          <Button size="sm" onClick={onSavePlan} className="bg-gold text-background hover:bg-gold-soft">
            <ListChecks className="h-3.5 w-3.5 mr-1.5" />
            Сохранить как задачи
          </Button>
        )}
      </div>

      {step.status === "failed" ? (
        <p className="font-serif text-sm text-destructive border-t border-border/40 pt-3">
          {describeStepFailure(step.reason)} Запрос за этот шаг не списан.
        </p>
      ) : step.text ? (
        <div className="border-t border-border/40 pt-3">
          <ToolOutput tool={step.tool} text={step.text} streaming={step.status === "running"} />
          {step.warnings && step.warnings.length > 0 && (
            <p className="font-mono-label text-[10px] text-cream-3 mt-2">{step.warnings.join(" · ")}</p>
          )}
        </div>
      ) : step.status === "running" ? (
        <p className="font-mono-label text-[11px] text-cream-3 italic border-t border-border/40 pt-3">
          {step.description || "генерирую ответ..."}
        </p>
      ) : step.status === "pending" ? (
        <p className="font-mono-label text-[10px] text-cream-3 truncate">{step.description}</p>
      ) : null}
    </div>
  )
}

/**
 * Dispatch the right renderer per tool. `tracker` returns strict JSON — the
 * server already validated and canonicalised it for completed steps, so a
 * parse failure here only happens mid-stream.
 */
function ToolOutput({ tool, text, streaming }: { tool: string; text: string; streaming: boolean }) {
  if (tool === "tracker") {
    const parsed = parseTracker(text)
    if (parsed && parsed.months.length > 0) {
      return <TrackerView data={parsed} />
    }
    if (streaming) return <TrackerStreaming partial={text} />
    return <Markdown>{"```json\n" + text + "\n```"}</Markdown>
  }
  return <Markdown>{text}</Markdown>
}

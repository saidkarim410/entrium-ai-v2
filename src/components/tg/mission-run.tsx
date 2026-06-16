"use client"

import { useState } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"
import { Markdown } from "@/components/markdown"
import { useTelegram } from "@/lib/telegram/webapp"

type StepInfo = {
  title: string
  description: string
}

type StepState = {
  status: "pending" | "running" | "done"
  text: string
}

type RunStatus = "idle" | "running" | "done" | "error"

export function MissionRun({
  missionId,
  title,
  subtitle,
  steps,
}: {
  missionId: string
  title: string
  subtitle: string
  steps: StepInfo[]
}) {
  const { initData, ready } = useTelegram()

  if (!ready) return <div className="p-6 text-sm text-muted-foreground">Загрузка…</div>
  if (!initData)
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Открой это приложение через бота <b>@entriumcouselorbot</b>.
      </div>
    )

  return (
    <MissionRunInner
      missionId={missionId}
      title={title}
      subtitle={subtitle}
      steps={steps}
      initData={initData}
    />
  )
}

function MissionRunInner({
  missionId,
  title,
  subtitle,
  steps,
  initData,
}: {
  missionId: string
  title: string
  subtitle: string
  steps: StepInfo[]
  initData: string
}) {
  const [runStatus, setRunStatus] = useState<RunStatus>("idle")
  const [totalSteps, setTotalSteps] = useState(steps.length)
  const [stepStates, setStepStates] = useState<StepState[]>(
    steps.map(() => ({ status: "pending", text: "" }))
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const doneCount = stepStates.filter((s) => s.status === "done").length
  const progressPct = totalSteps > 0 ? (doneCount / totalSteps) * 100 : 0

  async function launch() {
    if (runStatus === "running") return
    setRunStatus("running")
    setErrorMessage(null)
    setStepStates(steps.map(() => ({ status: "pending", text: "" })))

    let res: Response
    try {
      res = await fetch("/api/tg/agent", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-telegram-init-data": initData,
        },
        body: JSON.stringify({ missionId }),
      })
    } catch {
      setRunStatus("error")
      setErrorMessage("Нет соединения — проверь интернет и попробуй ещё раз.")
      return
    }

    if (!res.ok) {
      let friendlyMsg: string
      if (res.status === 401) {
        friendlyMsg = "Сессия истекла — перезапусти Mini App."
      } else if (res.status === 429) {
        try {
          const body = (await res.json()) as { message?: string }
          friendlyMsg = body.message ?? "Лимит запросов исчерпан — подожди до завтра или обнови до Pro."
        } catch {
          friendlyMsg = "Лимит запросов исчерпан — подожди до завтра или обнови до Pro."
        }
      } else {
        friendlyMsg = `Ошибка сервера (${res.status}) — попробуй позже.`
      }
      setRunStatus("error")
      setErrorMessage(friendlyMsg)
      return
    }

    if (!res.body) {
      setRunStatus("error")
      setErrorMessage("Пустой ответ от сервера.")
      return
    }

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
          let evt: Record<string, unknown>
          try {
            evt = JSON.parse(line) as Record<string, unknown>
          } catch {
            console.error("Bad NDJSON line:", line)
            continue
          }

          const type = evt.type as string

          if (type === "meta") {
            const n = evt.totalSteps as number | undefined
            if (n) setTotalSteps(n)
          } else if (type === "step_start") {
            const step = (evt.step as number) - 1
            setStepStates((prev) => {
              const next = [...prev]
              if (next[step]) next[step] = { ...next[step], status: "running" }
              return next
            })
          } else if (type === "delta") {
            const step = (evt.step as number) - 1
            const text = (evt.text as string) ?? ""
            setStepStates((prev) => {
              const next = [...prev]
              if (next[step]) next[step] = { ...next[step], text: next[step].text + text }
              return next
            })
          } else if (type === "step_end") {
            const step = (evt.step as number) - 1
            setStepStates((prev) => {
              const next = [...prev]
              if (next[step]) next[step] = { ...next[step], status: "done" }
              return next
            })
          } else if (type === "done") {
            setRunStatus("done")
          } else if (type === "error") {
            setRunStatus("error")
            setErrorMessage((evt.message as string) ?? "Pipeline прервался.")
          }
        }
      }
    } catch (err) {
      setRunStatus("error")
      setErrorMessage(err instanceof Error ? err.message : "Ошибка соединения.")
    }
  }

  // ── Idle screen ─────────────────────────────────────────────────────────
  if (runStatus === "idle") {
    return (
      <div className="px-4 py-6 space-y-5">
        {/* Mission info */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
          <div className="text-base font-semibold">{title}</div>
          <div className="text-sm text-muted-foreground">{subtitle}</div>
        </div>

        {/* Steps preview */}
        <div className="space-y-2">
          {steps.map((s, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-3"
            >
              <span className="font-mono-label mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--brand-red-soft)] text-[11px] text-[var(--brand-red)]">
                {i + 1}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-medium leading-tight">{s.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{s.description}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Launch button */}
        <button
          onClick={() => void launch()}
          className="w-full rounded-2xl bg-[var(--brand-red)] py-3 text-sm font-semibold text-white active:opacity-80"
        >
          Запустить
        </button>
      </div>
    )
  }

  // ── Running / done / error screen ────────────────────────────────────────
  return (
    <div className="px-4 py-4 space-y-4">
      {/* Progress header */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">{title}</div>
            <div className="font-mono-label mt-0.5 text-[11px] text-muted-foreground">
              {runStatus === "running" && `Шаг ${doneCount + 1} из ${totalSteps}`}
              {runStatus === "done" && `Готово · ${totalSteps} шагов`}
              {runStatus === "error" && "Ошибка"}
            </div>
          </div>
          {runStatus === "done" && (
            <CheckCircle2 className="h-5 w-5 text-[var(--brand-red)]" />
          )}
          {runStatus === "running" && (
            <Loader2 className="h-4 w-4 animate-spin text-[var(--brand-red)]" />
          )}
        </div>

        {/* Progress bar */}
        <div className="h-1 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-[var(--brand-red)] transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Step cards */}
      <div className="space-y-3">
        {steps.map((info, i) => {
          const state = stepStates[i] ?? { status: "pending", text: "" }
          const isCurrentlyStreaming = state.status === "running"

          return (
            <div
              key={i}
              className={[
                "rounded-2xl border bg-card p-4 space-y-3",
                state.status === "running"
                  ? "border-[var(--brand-red)]"
                  : state.status === "done"
                    ? "border-[var(--brand-red)] opacity-90"
                    : "border-border opacity-50",
              ].join(" ")}
            >
              {/* Step header */}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-red-soft)]">
                  {state.status === "done" ? (
                    <CheckCircle2 className="h-4 w-4 text-[var(--brand-red)]" />
                  ) : state.status === "running" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--brand-red)]" />
                  ) : (
                    <span className="font-mono-label text-[11px] text-[var(--brand-red)]">
                      {i + 1}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold leading-tight">{info.title}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{info.description}</div>
                </div>
              </div>

              {/* Output */}
              {state.text ? (
                <div className="border-t border-border pt-3">
                  <Markdown>{state.text}</Markdown>
                  {isCurrentlyStreaming && (
                    <span className="brand-caret ml-0.5 inline-block" />
                  )}
                </div>
              ) : state.status === "running" ? (
                <div className="border-t border-border pt-3 text-xs text-muted-foreground italic">
                  {info.description}
                  <span className="brand-caret ml-0.5 inline-block" />
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      {/* Error message */}
      {runStatus === "error" && errorMessage && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      {/* Done / retry */}
      {(runStatus === "done" || runStatus === "error") && (
        <button
          onClick={() => {
            setRunStatus("idle")
            setErrorMessage(null)
            setStepStates(steps.map(() => ({ status: "pending", text: "" })))
          }}
          className="w-full rounded-2xl border border-border bg-card py-3 text-sm font-medium text-muted-foreground active:opacity-70"
        >
          {runStatus === "done" ? "Запустить ещё раз" : "Попробовать снова"}
        </button>
      )}
    </div>
  )
}

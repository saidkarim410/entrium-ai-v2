import { streamText, type LanguageModel } from "ai"
import type { ToolKey } from "@/lib/ai/prompts"
import { stripChancePercents, PERCENT_WARNING } from "@/lib/ai/sanitize"
import { validateTrackerOutput, type TrackerOutput } from "./tracker-parse"

/**
 * One mission step = one model call with a verified outcome (P0-01).
 *
 * Before this module a step was "done" as soon as the stream closed — even
 * when the model hit `maxOutputTokens` mid-table or mid-JSON. Now a step is
 * completed only when the model stopped on its own (`finishReason: "stop"`)
 * and, for structured tools, the payload validates. A truncated / malformed
 * step is retried once with a tighter instruction and a larger budget; if it
 * still fails, the caller gets `status: "failed"` with a machine reason.
 */

/** Output budget per tool. Tracker emits a 12-month JSON plan, so it needs the most room. */
export const STEP_OUTPUT_BUDGET: Partial<Record<ToolKey, number>> & { default: number } = {
  tracker: 8000,
  university: 6000,
  scholarship: 6000,
  analyzer: 6000, // Haiku writes ~4.5k tokens for a SWOT + competency table; the prompt also caps words
  reviewer: 5000,
  cost: 5000,
  default: 4000,
}

export const MAX_STEP_OUTPUT_TOKENS = 12000

export function outputBudgetFor(tool: string): number {
  return (STEP_OUTPUT_BUDGET as Record<string, number>)[tool] ?? STEP_OUTPUT_BUDGET.default
}

export type StepFailReason = "truncated" | "invalid_json" | "empty" | "aborted" | "interrupted" | "skipped" | "model_error" | "quota"

export type StepClassification =
  | { status: "completed"; text: string; plan?: TrackerOutput; warnings: string[] }
  | { status: "failed"; reason: StepFailReason; detail?: string }

/**
 * Pure decision: given the finished stream, is the step acceptable?
 * `text` for a completed tracker step is the canonical (sanitised) JSON.
 */
export function classifyStepResult(params: {
  tool: string
  text: string
  finishReason: string
  aborted: boolean
  todayIso: string
}): StepClassification {
  const { tool, text, finishReason, aborted, todayIso } = params
  if (aborted) return { status: "failed", reason: "aborted" }
  if (finishReason === "length") return { status: "failed", reason: "truncated" }
  if (finishReason === "error" || finishReason === "content-filter") {
    return { status: "failed", reason: "model_error", detail: finishReason }
  }
  if (!text.trim()) return { status: "failed", reason: "empty" }

  if (tool === "tracker") {
    const v = validateTrackerOutput(text, { todayIso })
    if (!v.ok) return { status: "failed", reason: "invalid_json", detail: v.reason }
    return { status: "completed", text: JSON.stringify(v.plan), plan: v.plan, warnings: v.warnings }
  }

  if (tool === "analyzer" || tool === "university") {
    const { text: clean, removed } = stripChancePercents(text)
    if (removed > 0) return { status: "completed", text: clean, warnings: [PERCENT_WARNING] }
  }
  return { status: "completed", text, warnings: [] }
}

export const RETRYABLE: ReadonlySet<StepFailReason> = new Set(["truncated", "invalid_json", "empty"])

/** Extra instruction for the second attempt, by failure reason. */
export function retryInstruction(reason: StepFailReason, tool: string): string {
  if (tool === "tracker") {
    return (
      "\n\nВНИМАНИЕ: предыдущий ответ был отклонён (" +
      (reason === "truncated" ? "не поместился в лимит длины" : "невалидный JSON") +
      "). Ответь ТОЛЬКО валидным JSON без Markdown и пояснений: первый символ { , последний } . " +
      "Сократи описания задач до 1 предложения, не более 4 задач в месяц."
    )
  }
  return (
    "\n\nВНИМАНИЕ: предыдущий ответ оборвался из-за ограничения длины и был отклонён. " +
    "Дай ту же информацию компактнее — ЖЁСТКИЙ лимит 700 слов: короткие пункты вместо абзацев, " +
    "не больше одной таблицы, без вступления и повторов, обязательно доведи ответ до конца."
  )
}

export type StepOutcome = {
  status: "completed" | "failed"
  /** Canonical text of the step (sanitised JSON for tracker) — empty on failure */
  text: string
  reason?: StepFailReason
  detail?: string
  finishReason?: string
  attempts: number
  usage: { inputTokens: number; outputTokens: number }
  warnings: string[]
  plan?: TrackerOutput
}

export type RunStepParams = {
  model: LanguageModel
  tool: ToolKey
  system: string
  userPrompt: string
  todayIso: string
  signal?: AbortSignal
  onDelta: (text: string) => void
  /** Called before a retry so the UI can clear the partial text */
  onRetry?: (attempt: number, reason: StepFailReason) => void
  maxAttempts?: number
}

export async function runMissionStep(params: RunStepParams): Promise<StepOutcome> {
  const maxAttempts = params.maxAttempts ?? 2
  const usage = { inputTokens: 0, outputTokens: 0 }
  let budget = outputBudgetFor(params.tool)
  let userPrompt = params.userPrompt
  let last: StepClassification = { status: "failed", reason: "model_error" }
  let lastFinish = "unknown"

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let text = ""
    let finishReason = "unknown"
    try {
      const result = streamText({
        model: params.model,
        abortSignal: params.signal,
        maxOutputTokens: budget,
        system: params.system,
        messages: [{ role: "user", content: userPrompt }],
      })
      for await (const delta of result.textStream) {
        text += delta
        params.onDelta(delta)
      }
      finishReason = await result.finishReason
      const u = await result.usage
      usage.inputTokens += u?.inputTokens ?? 0
      usage.outputTokens += u?.outputTokens ?? 0
    } catch (err) {
      if (params.signal?.aborted) {
        return { status: "failed", reason: "aborted", text: "", attempts: attempt, usage, warnings: [] }
      }
      console.error(`mission step ${params.tool} attempt ${attempt} threw:`, err)
      finishReason = "error"
    }
    lastFinish = finishReason

    last = classifyStepResult({
      tool: params.tool,
      text,
      finishReason,
      aborted: Boolean(params.signal?.aborted),
      todayIso: params.todayIso,
    })

    if (last.status === "completed") {
      return {
        status: "completed",
        text: last.text,
        plan: last.plan,
        warnings: last.warnings,
        finishReason,
        attempts: attempt,
        usage,
      }
    }

    const canRetry = attempt < maxAttempts && RETRYABLE.has(last.reason) && !params.signal?.aborted
    if (!canRetry) break

    params.onRetry?.(attempt + 1, last.reason)
    userPrompt = params.userPrompt + retryInstruction(last.reason, params.tool)
    budget = Math.min(Math.round(budget * 1.5), MAX_STEP_OUTPUT_TOKENS)
  }

  const failed = last as Extract<StepClassification, { status: "failed" }>
  return {
    status: "failed",
    text: "",
    reason: failed.reason,
    detail: failed.detail,
    finishReason: lastFinish,
    attempts: maxAttempts,
    usage,
    warnings: [],
  }
}

/** Human-readable reason for the UI (Russian, matching the rest of the agent UI). */
export function describeStepFailure(reason: StepFailReason | undefined): string {
  switch (reason) {
    case "truncated":
      return "Ответ не поместился в лимит длины и был отклонён, чтобы не показывать обрывок."
    case "invalid_json":
      return "Модель вернула план в неправильном формате — результат отклонён."
    case "empty":
      return "Модель вернула пустой ответ."
    case "aborted":
      return "Шаг прерван: остановлен кнопкой «Стоп» или страница была закрыта/обновлена."
    case "interrupted":
      return "Соединение прервалось до завершения шага (страница закрыта или сервер перезапущен)."
    case "skipped":
      return "Не запускался: предыдущий шаг не завершён."
    case "quota":
      return "Закончился дневной лимит запросов."
    case "model_error":
      return "Ошибка модели при генерации."
    default:
      return "Шаг не удался."
  }
}

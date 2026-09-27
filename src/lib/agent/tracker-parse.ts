import { z } from "zod"

/**
 * Tracker (plan) output: parsing + server-side validation (P0-01/P0-02).
 *
 * Shared by the agent client (tolerant rendering while streaming) and the
 * API routes (strict acceptance of a finished step). The prompt asks for
 * strict JSON, but the model may still wrap it in fences, add chatter or —
 * when the output budget is hit — stop mid-object. A step is accepted only
 * when the JSON parses, matches the schema and has at least one future task.
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

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const taskSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1),
  description: z.string().optional(),
  priority: z.enum(["high", "medium", "low"]).catch("medium"),
  category: z.string().optional(),
  deadline: z.string().optional(),
  duration: z.string().optional(),
})

const monthSchema = z.object({
  month: z.string().trim().min(1),
  emoji: z.string().optional(),
  color: z.string().optional(),
  tasks: z.array(taskSchema).default([]),
})

export const trackerOutputSchema = z.object({
  diagnosis: z.string().default(""),
  score: z.number().default(0),
  months: z.array(monthSchema).min(1),
})

/** Pull the outermost `{…}` out of raw model text (fences, chatter tolerated). */
export function extractJsonObject(text: string): string | null {
  if (!text) return null
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1].trim() : trimmed
  const start = candidate.indexOf("{")
  const end = candidate.lastIndexOf("}")
  if (start === -1 || end === -1 || end < start) return null
  return candidate.slice(start, end + 1)
}

/**
 * Tolerant parse for rendering: returns whatever months the JSON contains,
 * or null if it is not (yet) parseable. Does NOT validate dates.
 */
export function parseTracker(text: string): TrackerOutput | null {
  const slice = extractJsonObject(text)
  if (!slice) return null
  try {
    const obj = JSON.parse(slice) as Partial<TrackerOutput>
    if (!obj || typeof obj !== "object" || !Array.isArray(obj.months)) return null
    return {
      diagnosis: typeof obj.diagnosis === "string" ? obj.diagnosis : "",
      score: typeof obj.score === "number" ? obj.score : 0,
      months: obj.months,
    }
  } catch {
    return null
  }
}

export type TrackerValidation =
  | { ok: true; plan: TrackerOutput; warnings: string[] }
  | { ok: false; reason: "no_json" | "invalid_schema" | "empty" | "all_in_past"; detail?: string }

/** Year mentioned in a month label such as "Март 2025" → 2025 (null if none). */
function yearInLabel(label: string): number | null {
  const m = label.match(/(20\d{2})/)
  return m ? Number(m[1]) : null
}

/**
 * Strict acceptance for a finished tracker step.
 *  - drops tasks whose ISO deadline is before `todayIso`
 *  - drops months whose label names a year before today's year
 *  - fails when nothing usable remains
 */
export function validateTrackerOutput(
  text: string,
  opts: { todayIso: string }
): TrackerValidation {
  const slice = extractJsonObject(text)
  if (!slice) return { ok: false, reason: "no_json" }

  let raw: unknown
  try {
    raw = JSON.parse(slice)
  } catch (e) {
    return { ok: false, reason: "no_json", detail: e instanceof Error ? e.message : "parse error" }
  }

  const parsed = trackerOutputSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, reason: "invalid_schema", detail: parsed.error.issues[0]?.message }
  }

  const todayYear = Number(opts.todayIso.slice(0, 4))
  const warnings: string[] = []
  let droppedTasks = 0
  let taskCounter = 0

  const months: TrackerMonth[] = []
  for (const month of parsed.data.months) {
    const labelYear = yearInLabel(month.month)
    if (labelYear !== null && labelYear < todayYear) {
      warnings.push(`Месяц «${month.month}» в прошлом — удалён`)
      continue
    }
    const tasks: TrackerTask[] = []
    for (const task of month.tasks) {
      const deadline = task.deadline?.trim()
      if (deadline && ISO_DATE.test(deadline) && deadline < opts.todayIso) {
        droppedTasks += 1
        continue
      }
      taskCounter += 1
      tasks.push({
        id: task.id?.trim() || `t${taskCounter}`,
        title: task.title,
        description: task.description,
        priority: task.priority,
        category: task.category?.trim() || "prep",
        deadline: deadline || undefined,
        duration: task.duration,
      })
    }
    if (tasks.length === 0) continue
    months.push({ month: month.month, emoji: month.emoji, color: month.color, tasks })
  }

  if (droppedTasks > 0) warnings.push(`Удалено задач с дедлайном в прошлом: ${droppedTasks}`)

  if (months.length === 0) {
    return {
      ok: false,
      reason: parsed.data.months.some((m) => m.tasks.length > 0) ? "all_in_past" : "empty",
    }
  }

  return {
    ok: true,
    warnings,
    plan: { diagnosis: parsed.data.diagnosis, score: parsed.data.score, months },
  }
}

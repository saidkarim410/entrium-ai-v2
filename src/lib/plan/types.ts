import type { TrackerOutput } from "@/lib/agent/tracker-parse"

/** Saved plan tasks (P1-03) — pure types + conversion from a tracker plan. */

export type TaskStatus = "todo" | "doing" | "done" | "skipped"
export type TaskPriority = "high" | "medium" | "low"
export type DeadlineKind = "official" | "personal" | "estimate"
export type TaskSource = "agent" | "tracker" | "manual" | "scholarship" | "application" | "program"

export type PlanTask = {
  id: string
  user_id: string
  title: string
  description: string | null
  category: string
  priority: TaskPriority
  status: TaskStatus
  due_date: string | null
  deadline_kind: DeadlineKind
  month_label: string | null
  position: number
  source: TaskSource
  source_run_id: string | null
  application_id: string | null
  scholarship_id: string | null
  program_id: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type NewPlanTask = Omit<PlanTask, "id" | "user_id" | "completed_at" | "created_at" | "updated_at">

export const DEADLINE_KIND_LABELS: Record<DeadlineKind, string> = {
  official: "официальный дедлайн",
  personal: "личный срок",
  estimate: "ориентир (не подтверждён)",
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "к выполнению",
  doing: "в работе",
  done: "сделано",
  skipped: "пропущено",
}

const RU_MONTHS = ["январ", "феврал", "март", "апрел", "ма", "июн", "июл", "август", "сентябр", "октябр", "ноябр", "декабр"]

/** "Октябрь 2026" → last day of that month as YYYY-MM-DD (null if unparseable). */
export function monthLabelToLastDay(label: string | null | undefined): string | null {
  if (!label) return null
  const yearMatch = label.match(/(20\d{2})/)
  if (!yearMatch) return null
  const year = Number(yearMatch[1])
  const lower = label.toLowerCase()
  let month = -1
  // "май" must not match "марта"-style prefixes: check the longer stems first
  for (let i = 0; i < RU_MONTHS.length; i++) {
    const stem = RU_MONTHS[i]
    // JS \b is ASCII-only, so anchor "май/мая" on start-of-string or whitespace instead
    if (i === 4 ? /(^|\s)ма[йя]/.test(lower) : lower.includes(stem)) {
      month = i
      break
    }
  }
  if (month === -1) {
    const en = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]
    month = en.findIndex((m) => lower.includes(m))
  }
  if (month === -1) return null
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(last).padStart(2, "0")}`
}

/**
 * Turn a validated tracker plan into task rows. A task with its own ISO
 * deadline keeps it as a PERSONAL date; a task without one gets the last day
 * of its month as an ESTIMATE, so nothing is silently undated.
 */
export function tasksFromTrackerPlan(
  plan: TrackerOutput,
  opts: { source: TaskSource; sourceRunId?: string | null; todayIso: string }
): NewPlanTask[] {
  const out: NewPlanTask[] = []
  let position = 0
  for (const month of plan.months) {
    const monthEnd = monthLabelToLastDay(month.month)
    for (const task of month.tasks) {
      const own = task.deadline && /^\d{4}-\d{2}-\d{2}$/.test(task.deadline) ? task.deadline : null
      const due = own ?? monthEnd
      if (due && due < opts.todayIso) continue // never save a task that is already in the past
      out.push({
        title: task.title.trim(),
        description: task.description?.trim() || null,
        category: task.category || "prep",
        priority: task.priority,
        status: "todo",
        due_date: due,
        deadline_kind: own ? "personal" : "estimate",
        month_label: month.month,
        position: position++,
        source: opts.source,
        source_run_id: opts.sourceRunId ?? null,
        application_id: null,
        scholarship_id: null,
        program_id: null,
      })
    }
  }
  return out
}

export type PlanProgress = { total: number; done: number; percent: number; overdue: number; next: PlanTask | null }

export function planProgress(tasks: PlanTask[], todayIso: string): PlanProgress {
  const active = tasks.filter((t) => t.status !== "skipped")
  const done = active.filter((t) => t.status === "done").length
  const open = active.filter((t) => t.status !== "done")
  const overdue = open.filter((t) => t.due_date && t.due_date < todayIso).length
  const next = [...open]
    .filter((t) => t.due_date)
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))[0] ?? null
  return { total: active.length, done, percent: active.length ? Math.round((done / active.length) * 100) : 0, overdue, next }
}

/** Group by month label preserving plan order (undated/manual tasks last). */
const MONTHS_RU = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"]

/** "2027-01" (tasks added from an official deadline) → "Январь 2027", same style as tracker months. */
function monthGroupLabel(key: string): string {
  const m = key.match(/^(\d{4})-(\d{2})$/)
  return m ? `${MONTHS_RU[Number(m[2]) - 1] ?? m[2]} ${m[1]}` : key
}

export function groupTasksByMonth(tasks: PlanTask[]): Array<{ label: string; tasks: PlanTask[] }> {
  // Earliest due date first, then the tracker's own order. (The previous comparator
  // returned a position difference for a > b, which is not a consistent ordering and
  // put a January group between September and October in the 2026-09-28 run.)
  const sorted = [...tasks].sort((a, b) => {
    const da = a.due_date ?? "9999"
    const db = b.due_date ?? "9999"
    if (da !== db) return da < db ? -1 : 1
    return a.position - b.position
  })
  const groups = new Map<string, PlanTask[]>()
  for (const t of sorted) {
    const key = t.month_label ?? (t.due_date ? t.due_date.slice(0, 7) : "Без даты")
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(t)
  }
  return Array.from(groups.entries()).map(([key, list]) => ({ label: monthGroupLabel(key), tasks: list }))
}

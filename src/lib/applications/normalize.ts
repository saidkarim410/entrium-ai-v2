import { parseDateInput } from "@/lib/dates"
import {
  APP_STATUSES,
  APP_PRIORITIES,
  APP_LEVELS,
  type AppStatus,
  type AppPriority,
  type AppLevel,
  type ChecklistItem,
} from "./types"

/** Form → server input for an application (all fields optional except the name). */
export type AppInput = {
  id?: string
  university_name: string
  university_country?: string
  program?: string
  level?: AppLevel | ""
  round?: string
  deadline?: string // YYYY-MM-DD, or what the user typed (DD.MM.YYYY etc.)
  status?: AppStatus
  priority?: AppPriority
  application_fee_usd?: number | string
  notes?: string
  checklist?: ChecklistItem[]
  result_decision?: string
}

export type AppRow = {
  university_name: string
  university_country: string | null
  program: string | null
  level: AppLevel | null
  round: string | null
  deadline: string | null
  status: AppStatus
  priority: AppPriority
  application_fee_usd: number | null
  notes: string | null
  checklist: ChecklistItem[]
  result_decision: string | null
}

export type NormalizeResult =
  | { ok: true; row: Partial<AppRow> }
  | { ok: false; error: string; field?: keyof AppInput }

/**
 * Validate + normalise one application (P0-04).
 *
 *  - `deadline` must be a real calendar date; ISO and DD.MM.YYYY are accepted,
 *    anything else is an ERROR (before this, garbage silently became NULL and
 *    the UI reported "saved").
 *  - `partial: true` (edits) touches only the keys present in the input, so a
 *    form that doesn't show the checklist can no longer wipe it.
 */
export function normalizeApplicationInput(input: AppInput, opts: { partial?: boolean } = {}): NormalizeResult {
  const name = input.university_name?.trim()
  if (!name) return { ok: false, error: "Укажи университет", field: "university_name" }

  const has = (key: keyof AppInput) => !opts.partial || input[key] !== undefined

  const row: Partial<AppRow> = { university_name: name }

  if (has("university_country")) row.university_country = input.university_country?.trim() || null
  if (has("program")) row.program = input.program?.trim() || null
  if (has("round")) row.round = input.round?.trim() || null
  if (has("notes")) row.notes = input.notes?.trim() || null
  if (has("result_decision")) row.result_decision = input.result_decision?.trim() || null

  if (has("level")) {
    row.level = input.level && APP_LEVELS.includes(input.level as AppLevel) ? (input.level as AppLevel) : null
  }
  if (has("status")) {
    row.status = APP_STATUSES.includes(input.status as AppStatus) ? (input.status as AppStatus) : "planning"
  }
  if (has("priority")) {
    row.priority = APP_PRIORITIES.includes(input.priority as AppPriority) ? (input.priority as AppPriority) : "match"
  }
  if (has("checklist")) {
    row.checklist = Array.isArray(input.checklist) ? input.checklist : []
  }
  if (has("application_fee_usd")) {
    const fee = input.application_fee_usd
    row.application_fee_usd =
      typeof fee === "number" ? fee : fee !== undefined && fee !== "" ? Number(fee) || null : null
  }
  if (has("deadline")) {
    const parsed = parseDateInput(input.deadline)
    if (parsed === null) {
      return {
        ok: false,
        field: "deadline",
        error: `Дедлайн «${String(input.deadline).trim()}» не распознан — введи дату в формате ДД.ММ.ГГГГ (например 15.10.2026)`,
      }
    }
    row.deadline = parsed || null
  }

  return { ok: true, row }
}

import { supabaseAdmin } from "@/lib/supabase/admin"
import {
  filtersFromProfile,
  matchProgram,
  formatProgramsContext,
  type ApplicantFilters,
  type Program,
  type ProgramMatch,
} from "./types"
import type { ApplicantProfile } from "@/lib/applicant/types"

/**
 * Server-side programme search (P0-03): HARD filters in SQL first (level,
 * status), then the pure matcher decides per programme whether it is inside
 * the request (country / language / intake / budget) or an alternative.
 *
 * Tolerates a database where migration 0024 is not applied yet: returns
 * `available: false` so callers fall back to the honest "no verified base"
 * instruction instead of the old invent-anything behaviour.
 */

export type ProgramSearch = {
  available: boolean
  filters: ApplicantFilters
  items: Array<{ program: Program; match: ProgramMatch }>
  /** Prompt block for the model (always safe to append) */
  context: string
}

const SELECT = "*"

export async function findProgramsForProfile(
  profile: ApplicantProfile,
  opts: { limit?: number } = {}
): Promise<ProgramSearch> {
  const filters = filtersFromProfile(profile)
  const limit = opts.limit ?? 40

  let query = supabaseAdmin
    .from("programs")
    .select(SELECT)
    .in("status", ["verified", "needs_review"])
    .order("status", { ascending: false }) // verified first
    .order("university_name", { ascending: true })
    .limit(limit * 3)
  if (filters.level) query = query.eq("level", filters.level)
  // Country/language/intake are NOT filtered in SQL: near-misses become explicit alternatives.

  const { data, error } = await query
  if (error) {
    // 42P01 = relation does not exist (migration 0024 not applied); PGRST205 = not in schema cache
    const missing = error.code === "42P01" || error.code === "PGRST205" || /programs/.test(error.message)
    if (!missing) console.error("findProgramsForProfile:", error)
    return { available: false, filters, items: [], context: "" }
  }

  const programs = (data ?? []) as Program[]
  const scored = programs.map((program) => ({ program, match: matchProgram(program, filters) }))

  // Inside the request first (meets → conditions → insufficient → not_eligible), then single-filter alternatives.
  const rank: Record<ProgramMatch["status"], number> = { meets: 0, conditions: 1, insufficient_data: 2, not_eligible: 3 }
  const inside = scored
    .filter((s) => s.match.outsideRequest.length === 0)
    .sort((a, b) => rank[a.match.status] - rank[b.match.status])
  const alternatives = scored
    .filter((s) => s.match.outsideRequest.length === 1 && !s.match.outsideRequest.includes("level"))
    .slice(0, 8)
  const items = [...inside.slice(0, limit), ...alternatives]

  return { available: true, filters, items, context: formatProgramsContext(items, filters) }
}

/** When the verified base is unavailable, the model must not pretend it has one. */
export const NO_PROGRAM_BASE_INSTRUCTION =
  "ПРОВЕРЕННАЯ БАЗА ПРОГРАММ НЕДОСТУПНА. Не называй конкретные программы, стоимость, экзамены и дедлайны как факты. " +
  "Можно описывать общие правила приёма по странам с пометкой «проверить на официальном сайте» и задавать уточняющие вопросы. " +
  "Никаких процентов вероятности поступления."

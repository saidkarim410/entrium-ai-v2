import type { ApplicantProfile } from "@/lib/applicant/types"
import { normalizeCountry, normalizeLevel, type ProgramLevel } from "@/lib/programs/types"

/**
 * Scholarship eligibility + presentation rules (P1-01). Pure.
 * Works with or without the 0025 columns: missing `status` is derived from the deadline.
 */

export type ScholarshipRow = {
  id: string
  name: string
  provider?: string | null
  country?: string | null
  level?: string | null
  amount_usd?: number | null
  full_funding?: boolean | null
  deadline?: string | null
  description?: string | null
  url?: string | null
  requirements?: unknown
  // 0025 (optional until applied)
  status?: string | null
  edition_year?: number | null
  source_url?: string | null
  verified_at?: string | null
  amount_original?: number | null
  currency?: string | null
  amount_period?: string | null
  coverage?: Record<string, unknown> | null
  eligible_levels?: string[] | null
  eligible_citizenships?: string[] | null
  excluded_citizenships?: string[] | null
}

export type ScholarshipStatus = "open" | "announced_soon" | "closed" | "archived" | "needs_review"

export const SCHOLARSHIP_STATUS_LABELS: Record<ScholarshipStatus, string> = {
  open: "открыт",
  announced_soon: "ожидается объявление",
  closed: "закрыт",
  archived: "архив",
  needs_review: "требует проверки",
}

/** Effective status: stored value, else derived from the deadline vs today. */
export function effectiveStatus(s: ScholarshipRow, todayIso: string): ScholarshipStatus {
  const stored = s.status as ScholarshipStatus | null | undefined
  if (stored && stored !== "needs_review") return stored
  if (s.deadline) return s.deadline < todayIso ? "closed" : stored ?? "open"
  return stored ?? "needs_review"
}

/** Is this an opportunity a student can still act on? */
export function isCurrentOpportunity(s: ScholarshipRow, todayIso: string): boolean {
  const st = effectiveStatus(s, todayIso)
  return st === "open" || st === "announced_soon" || (st === "needs_review" && !s.deadline)
}

export type EligibilityVerdict = {
  ok: boolean
  /** Reasons the applicant does NOT qualify (empty when ok) */
  blockers: string[]
  /** Things we could not check */
  unknowns: string[]
}

function levelsOf(s: ScholarshipRow): ProgramLevel[] | "any" {
  const explicit = (s.eligible_levels ?? []).map((l) => normalizeLevel(l)).filter((l): l is ProgramLevel => Boolean(l))
  if (explicit.length) return explicit
  if (!s.level || s.level === "any") return "any"
  const one = normalizeLevel(s.level)
  return one ? [one] : "any"
}

/** Check level + citizenship before any AI ranking. */
export function checkEligibility(s: ScholarshipRow, p: ApplicantProfile): EligibilityVerdict {
  const blockers: string[] = []
  const unknowns: string[] = []

  const want = normalizeLevel(p.goals.level)
  const levels = levelsOf(s)
  if (levels !== "any") {
    if (!want) unknowns.push("уровень обучения в профиле не указан")
    else if (!levels.includes(want)) blockers.push(`только для уровня ${levels.join("/")}, а цель — ${want}`)
  }

  const citizenship = p.personal.citizenship ? normalizeCountry(p.personal.citizenship) : null
  const allowed = s.eligible_citizenships?.map(normalizeCountry) ?? null
  const excluded = s.excluded_citizenships?.map(normalizeCountry) ?? null
  if (allowed && allowed.length) {
    if (!citizenship) unknowns.push("гражданство в профиле не указано")
    else if (!allowed.includes(citizenship)) blockers.push(`только для граждан: ${allowed.join(", ")}`)
  }
  if (excluded && excluded.length && citizenship && excluded.includes(citizenship)) {
    blockers.push(`не для граждан: ${excluded.join(", ")}`)
  }

  return { ok: blockers.length === 0, blockers, unknowns }
}

function fmtAmount(s: ScholarshipRow): string {
  if (s.amount_original && s.currency) {
    const per = s.amount_period === "month" ? "мес" : s.amount_period === "total" ? "всего" : "год"
    return `${Number(s.amount_original).toLocaleString("en-US")} ${s.currency}/${per}`
  }
  if (s.amount_usd) return `~$${Number(s.amount_usd).toLocaleString("en-US")}/год`
  return "сумма не указана"
}

function fmtCoverage(s: ScholarshipRow): string {
  const c = s.coverage ?? {}
  const parts: string[] = []
  if (c.tuition_waiver) parts.push("tuition waiver")
  if (c.stipend) parts.push("стипендия/выплата")
  if (c.housing) parts.push("жильё")
  if (c.travel) parts.push("перелёт")
  if (c.insurance) parts.push("страховка")
  if (parts.length) return parts.join(" + ")
  return s.full_funding ? "полное покрытие (состав не детализирован)" : "частичное"
}

/** One line per scholarship for the prompt context, with the verified status. */
export function formatScholarshipLine(s: ScholarshipRow, idx: number, todayIso: string, verdict?: EligibilityVerdict): string {
  const st = effectiveStatus(s, todayIso)
  const deadline = s.deadline
    ? `дедлайн ${s.deadline}${s.edition_year ? ` (набор ${s.edition_year})` : ""}${st === "closed" ? " — ПРОШЁЛ" : ""}`
    : "дедлайн не опубликован"
  const verified = s.verified_at ? `проверено ${s.verified_at}` : "ТРЕБУЕТ ПРОВЕРКИ"
  const elig = verdict
    ? verdict.ok
      ? verdict.unknowns.length
        ? `право участия: не проверено (${verdict.unknowns.join("; ")})`
        : "право участия: подходит по уровню и гражданству"
      : `НЕ ПОДХОДИТ: ${verdict.blockers.join("; ")}`
    : ""
  return [
    `${idx}. ${s.name} — ${s.provider ?? "—"} (${s.country ?? "—"}) · уровень: ${s.level ?? "любой"} · статус: ${SCHOLARSHIP_STATUS_LABELS[st]}`,
    `   покрытие: ${fmtCoverage(s)} · ${fmtAmount(s)} · ${deadline}`,
    `   ${s.description ? String(s.description).slice(0, 220) : ""}`,
    `   источник: ${s.source_url ?? s.url ?? "—"} · ${verified}${elig ? ` · ${elig}` : ""}`,
  ]
    .filter((l) => l.trim())
    .join("\n")
}

import type { ApplicantProfile } from "./types"

/**
 * "Готовность к подаче" (P1-05): a separate metric from "profile filled".
 * A full profile says the AI can advise; readiness says the student can actually
 * submit an application. Pure — inputs are counts the dashboard already has.
 */
export type ReadinessInput = {
  profile: ApplicantProfile
  applicationsCount: number
  planTasksCount: number
}

export type ReadinessCheck = { key: string; label: string; ok: boolean }

export function applicationReadiness(input: ReadinessInput): { score: number; total: number; percent: number; checks: ReadinessCheck[]; missing: string[] } {
  const p = input.profile
  const checks: ReadinessCheck[] = [
    { key: "goal", label: "цель: уровень, специальность и страны", ok: Boolean(p.goals.level && p.goals.major && p.goals.countries) },
    { key: "schooling", label: "образование: сколько классов и когда выпуск", ok: Boolean(p.academic.schoolYears && p.academic.graduation) },
    { key: "english", label: "результат теста по английскому (IELTS / TOEFL / Duolingo)", ok: Boolean(p.academic.ielts || p.academic.toefl || p.academic.duolingo) },
    { key: "budget", label: "бюджет и потребность в стипендии", ok: Boolean(p.goals.budget && p.goals.fundingNeed) },
    { key: "applications", label: "хотя бы одна заявка с программой", ok: input.applicationsCount > 0 },
    { key: "plan", label: "сохранённый план с задачами", ok: input.planTasksCount > 0 },
  ]
  const score = checks.filter((c) => c.ok).length
  return {
    score,
    total: checks.length,
    percent: Math.round((score / checks.length) * 100),
    checks,
    missing: checks.filter((c) => !c.ok).map((c) => c.label),
  }
}

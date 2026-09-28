import { searchScholarships } from "@/lib/ai/rag"
import { todayIso } from "@/lib/ai/temporal"
import type { ApplicantProfile } from "@/lib/applicant/types"
import { checkEligibility, formatScholarshipLine, isCurrentOpportunity, type ScholarshipRow } from "./quality"

/**
 * Scholarship context for the AI (P1-01): semantic search, then the hard
 * checks the TZ requires BEFORE ranking — expired contests are dropped, level
 * and citizenship are verified against the profile, and what remains is
 * labelled with status / edition year / source / verification.
 */
export async function buildScholarshipsContext(
  query: string,
  profile: ApplicantProfile,
  opts: { limit?: number; now?: Date } = {}
): Promise<string> {
  const today = todayIso(opts.now ?? new Date())
  const rows = (await searchScholarships(query, (opts.limit ?? 12) * 2)) as unknown as ScholarshipRow[]
  if (!rows.length) return ""

  const current = rows.filter((s) => isCurrentOpportunity(s, today))
  const dropped = rows.length - current.length

  const eligible: string[] = []
  const notEligible: string[] = []
  let n = 0
  for (const s of current) {
    const verdict = checkEligibility(s, profile)
    const line = formatScholarshipLine(s, ++n, today, verdict)
    if (verdict.ok) eligible.push(line)
    else notEligible.push(line)
    if (eligible.length >= (opts.limit ?? 12)) break
  }

  return [
    "СТИПЕНДИИ ИЗ БАЗЫ (после проверки статуса, уровня и гражданства):",
    `Истёкшие конкурсы скрыты: ${dropped}. Рекомендуй только из списка «подходят»; «не подходят» упоминай лишь как «недоступно, потому что …».`,
    "Суммы и дедлайны — только как в базе, с годом набора; если «требует проверки» — так и пиши. Никаких оценок шансов в процентах.",
    "",
    eligible.length ? `ПОДХОДЯТ:\n${eligible.join("\n\n")}` : "ПОДХОДЯТ: ничего не найдено — скажи об этом прямо.",
    notEligible.length ? `\nНЕ ПОДХОДЯТ ПО ФОРМАЛЬНЫМ КРИТЕРИЯМ:\n${notEligible.slice(0, 5).join("\n\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n")
}

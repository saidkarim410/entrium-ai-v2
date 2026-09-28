import { searchUniversities, formatUniversitiesContext } from "@/lib/ai/rag"
import type { ApplicantProfile } from "@/lib/applicant/types"
import { findProgramsForProfile, NO_PROGRAM_BASE_INSTRUCTION, type ProgramSearch } from "./search"

/**
 * Everything the `university` tool may rely on (P0-03):
 *   1. the verified programme base filtered for this profile (the only
 *      allowed source of recommendations), and
 *   2. QS ranking rows as supplementary reputation info — explicitly NOT a
 *      confirmation of a programme, its price or its requirements.
 */
export async function buildUniversityContext(query: string, profile: ApplicantProfile): Promise<string> {
  return (await buildUniversityContextWithItems(query, profile)).context
}

/** Same as above, plus the matched programme rows so a UI can render action cards (P1-03). */
export async function buildUniversityContextWithItems(
  query: string,
  profile: ApplicantProfile
): Promise<{ context: string; available: boolean; items: ProgramSearch["items"] }> {
  const [programs, qs] = await Promise.all([
    findProgramsForProfile(profile),
    searchUniversities(query, 12).catch((err) => {
      console.error("QS search failed:", err)
      return []
    }),
  ])

  const parts: string[] = []
  parts.push(programs.available ? programs.context : NO_PROGRAM_BASE_INSTRUCTION)
  const qsBlock = formatUniversitiesContext(qs)
  if (qsBlock) {
    parts.push(
      "СПРАВОЧНО — рейтинг QS 2026 (только репутация/рейтинг; НЕ подтверждает наличие программы, стоимость, язык или требования):\n" +
        qsBlock
    )
  }
  return { context: parts.join("\n\n"), available: programs.available, items: programs.items }
}

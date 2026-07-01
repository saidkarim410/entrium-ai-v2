import { generateObject } from "ai"
import { z } from "zod"
import { models, MODEL_IDS } from "@/lib/ai"
import { getCurrentUser } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { checkUsage, recordUsage } from "@/lib/rate-limit"
import { profileToContextBlock, EMPTY_PROFILE, type ApplicantProfile } from "@/lib/applicant/types"
import { getLanguageInstruction } from "@/lib/ai/language"

export const runtime = "nodejs"
export const maxDuration = 45

const Body = z.object({
  ids: z.array(z.string().uuid()).min(2).max(5),
})

const ComparisonSchema = z.object({
  recommended_id: z
    .string()
    .describe("Universities[].id of the school the applicant should prioritize FIRST. Must be one of the given ids."),
  recommended_reason: z
    .string()
    .describe("1-2 sentence explanation tied to applicant profile, not generic"),
  rankings: z
    .array(
      z.object({
        id: z.string().describe("University id"),
        rank: z.number().int().min(1).describe("1 = top pick"),
        verdict: z.string().describe("1-line take on this option for THIS applicant"),
        category: z.enum(["reach", "match", "safety"]),
      })
    )
    .describe("Cohort ranked from best to worst fit for this applicant"),
  risks: z
    .array(z.string())
    .describe("Strategic risks of this cohort (e.g. 'all reaches', 'overlapping deadlines')")
    .max(4),
  blind_spots: z
    .array(z.string())
    .describe("Universities NOT in this list that are likely better fits and worth considering")
    .max(3),
})

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 })

  const usage = await checkUsage(user.id)
  if (!usage.allowed) {
    return Response.json({ error: "limit_reached" }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const parsed = Body.safeParse(body)
  if (!parsed.success) return Response.json({ error: "invalid_input" }, { status: 400 })

  const { ids } = parsed.data

  const [unisRes, profileRes] = await Promise.all([
    supabaseAdmin
      .from("universities")
      .select("id, name, country, city, qs_rank, rank_display, overall_score, metadata")
      .in("id", ids),
    supabaseAdmin.from("profiles").select("applicant_data").eq("id", user.id).maybeSingle(),
  ])

  const unis = (unisRes.data ?? []) as Array<{
    id: string
    name: string
    country: string
    city: string | null
    qs_rank: number | null
    rank_display: string | null
    overall_score: number | null
    metadata: Record<string, unknown> | null
  }>

  if (unis.length < 2) {
    return Response.json({ error: "need_at_least_two" }, { status: 400 })
  }

  const applicant = (profileRes.data?.applicant_data as ApplicantProfile | null) ?? EMPTY_PROFILE
  const profileBlock = profileToContextBlock(applicant)
  const langInstr = await getLanguageInstruction()

  const cohortBlock = unis
    .map((u) => {
      const md = u.metadata ?? {}
      const parts = [
        `id=${u.id}`,
        `name="${u.name}"`,
        `country=${u.country}`,
        u.city ? `city=${u.city}` : "",
        u.qs_rank ? `qs_rank=${u.rank_display ?? u.qs_rank}` : "",
        u.overall_score !== null ? `overall=${u.overall_score}` : "",
        md.academic_reputation ? `acad=${md.academic_reputation}` : "",
        md.employer_reputation ? `emp=${md.employer_reputation}` : "",
        md.research ? `research=${md.research}` : "",
      ].filter(Boolean)
      return `- ${parts.join(", ")}`
    })
    .join("\n")

  const system = [
    "You compare a small cohort of universities for a specific applicant.",
    "Be honest, sharp, and specific to the profile — no generic 'all are great schools' BS.",
    "",
    "Rank the cohort 1..N where 1 = best first-choice for THIS applicant.",
    "Each verdict must reference applicant signal (GPA, tests, major, country fit, scholarship odds).",
    "category per uni: reach/match/safety from THIS applicant's perspective.",
    "",
    "risks: cohort-level concerns. Examples: 'All reaches — add safety', 'EA deadlines clash with IB exams', 'No scholarships available for non-citizens'.",
    "",
    "blind_spots: 1-3 named universities NOT in the cohort that would likely be better fits given the profile. Include reason.",
    "",
    "recommended_id MUST be a uuid from the cohort.",
    "",
    profileBlock,
    "",
    langInstr,
  ].join("\n")

  const userPrompt = [
    "Compare and rank these universities for this applicant. Cohort:",
    cohortBlock,
  ].join("\n")

  const model = usage.tier === "pro" ? models.claudeSonnet : models.claudeHaiku
  const modelId = usage.tier === "pro" ? MODEL_IDS.sonnet : MODEL_IDS.haiku

  try {
    const result = await generateObject({
      model,
      system,
      schema: ComparisonSchema,
      messages: [{ role: "user", content: userPrompt }],
      abortSignal: req.signal,
    })

    await recordUsage({
      userId: user.id,
      tool: "uni_compare",
      model: modelId,
      inputTokens: result.usage?.inputTokens ?? 0,
      outputTokens: result.usage?.outputTokens ?? 0,
      costUsd: 0,
    })

    return Response.json({ analysis: result.object })
  } catch (err) {
    console.error("Uni compare error:", err)
    return Response.json(
      { error: "ai_failed", message: err instanceof Error ? err.message : "AI failed" },
      { status: 500 }
    )
  }
}

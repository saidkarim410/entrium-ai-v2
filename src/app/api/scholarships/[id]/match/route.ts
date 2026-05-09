import { generateObject } from "ai"
import { z } from "zod"
import { models } from "@/lib/ai"
import { getCurrentUser } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { checkUsage, recordUsage } from "@/lib/rate-limit"
import { profileToContextBlock, EMPTY_PROFILE, type ApplicantProfile } from "@/lib/applicant/types"
import { getLanguageInstruction } from "@/lib/ai/language"

export const runtime = "nodejs"
export const maxDuration = 45

const MatchSchema = z.object({
  match_score: z.number().int().min(0).max(100).describe("Realistic chance applicant gets this scholarship, 0-100"),
  category: z.enum(["strong", "viable", "stretch"]).describe("strong = profile checks all boxes; viable = competitive; stretch = uphill"),
  verdict: z.string().describe("1-sentence honest verdict"),
  fits: z.array(z.string()).min(2).max(5).describe("Where the applicant fits the criteria — concrete, evidence-based"),
  gaps: z.array(z.string()).min(2).max(5).describe("Where the applicant falls short — specific, not vague"),
  apply_strategy: z.string().describe("1-2 sentence strategic advice on essays/letters/timing"),
  next_actions: z.array(z.string()).min(3).max(5).describe("Imperative actions to take BEFORE the deadline"),
})

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 })

  const usage = await checkUsage(user.id)
  if (!usage.allowed) return Response.json({ error: "limit_reached" }, { status: 429 })

  const { id } = await ctx.params
  if (!id) return Response.json({ error: "bad_id" }, { status: 400 })

  const [{ data: sch }, { data: profileRow }] = await Promise.all([
    supabaseAdmin.from("scholarships").select("*").eq("id", id).maybeSingle(),
    supabaseAdmin.from("profiles").select("applicant_data").eq("id", user.id).maybeSingle(),
  ])

  if (!sch) return Response.json({ error: "not_found" }, { status: 404 })

  const applicant = (profileRow?.applicant_data as ApplicantProfile | null) ?? EMPTY_PROFILE
  const profileBlock = profileToContextBlock(applicant)
  const langInstr = await getLanguageInstruction()

  const reqs = (sch.requirements ?? null) as Record<string, unknown> | null

  const schBlock = [
    `Scholarship: ${sch.name}`,
    sch.provider ? `Provider: ${sch.provider}` : "",
    sch.country ? `Country/region: ${sch.country}` : "",
    sch.level ? `Level: ${sch.level}` : "",
    sch.amount_usd ? `Amount: $${sch.amount_usd} USD` : "",
    sch.full_funding ? "Full funding: YES" : "",
    sch.deadline ? `Deadline: ${sch.deadline}` : "",
    sch.description ? `Description: ${String(sch.description).slice(0, 1500)}` : "",
    reqs ? `Requirements: ${JSON.stringify(reqs).slice(0, 800)}` : "",
  ].filter(Boolean).join("\n")

  const system = [
    "You assess whether a specific applicant has a realistic shot at a specific scholarship.",
    "Be honest, signal-driven, not encouraging. Match score is your real read of odds, anchored on:",
    "- Citizenship requirements (often hard cutoff)",
    "- Academic threshold (GPA, test scores) vs typical past awardees",
    "- Field of study match",
    "- Year/level match",
    "- Number of awards vs applicant pool",
    "",
    "category:",
    "- strong = profile clears all listed criteria with margin",
    "- viable = competitive; gaps in 1-2 areas closeable before deadline",
    "- stretch = needs major profile work or doesn't fit core criteria",
    "",
    "fits/gaps: cite specific applicant fields. NOT 'good academics' — instead 'GPA 4.5/5 well above typical 3.7 threshold'.",
    "next_actions: imperative, deadline-aware. NOT 'work on essay' — instead 'request rec letter from physics teacher by Nov 15'.",
    "",
    profileBlock ? `Applicant context:\n${profileBlock}` : "",
    "",
    langInstr,
  ].filter(Boolean).join("\n")

  const model = usage.tier === "pro" ? models.claudeSonnet : models.claudeHaiku
  const modelId = usage.tier === "pro" ? "claude-sonnet-4-5" : "claude-haiku-4-5"

  try {
    const result = await generateObject({
      model,
      system,
      schema: MatchSchema,
      messages: [{ role: "user", content: schBlock }],
    })

    await recordUsage({
      userId: user.id,
      tool: "scholarship_match",
      model: modelId,
      inputTokens: result.usage?.inputTokens ?? 0,
      outputTokens: result.usage?.outputTokens ?? 0,
      costUsd: 0,
    })

    return Response.json({ match: result.object })
  } catch (err) {
    console.error("Scholarship match error:", err)
    return Response.json(
      { error: "ai_failed", message: err instanceof Error ? err.message : "AI failed" },
      { status: 500 }
    )
  }
}

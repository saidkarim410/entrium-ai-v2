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

const InsightsSchema = z.object({
  match_score: z.number().int().min(0).max(100).describe("Estimated match score 0-100 — your realistic odds of admission"),
  category: z.enum(["reach", "match", "safety"]).describe("Reach (selective above your level), match (right tier), safety"),
  verdict: z.string().describe("1-sentence honest verdict on whether this uni makes sense for this applicant"),
  strengths: z.array(z.string()).min(2).max(5).describe("Why this applicant is a credible fit — 2-5 short bullets"),
  weaknesses: z.array(z.string()).min(2).max(5).describe("Specific gaps for THIS uni — 2-5 short bullets"),
  focus_areas: z.array(z.string()).min(3).max(6).describe("Concrete actions to do BEFORE applying — 3-6 imperative items"),
  application_strategy: z.string().describe("1-2 sentence advice on round (ED/EA/RD), essay angle, or strategic positioning"),
})

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 })

  const usage = await checkUsage(user.id)
  if (!usage.allowed) {
    return Response.json({ error: "limit_reached" }, { status: 429 })
  }

  const { id } = await ctx.params
  if (!id) return Response.json({ error: "bad_id" }, { status: 400 })

  const [uniRes, profileRes] = await Promise.all([
    supabaseAdmin.from("universities").select("*").eq("id", id).maybeSingle(),
    supabaseAdmin.from("profiles").select("applicant_data").eq("id", user.id).maybeSingle(),
  ])

  if (!uniRes.data) return Response.json({ error: "uni_not_found" }, { status: 404 })
  const uni = uniRes.data as Record<string, unknown>

  const applicant = (profileRes.data?.applicant_data as ApplicantProfile | null) ?? EMPTY_PROFILE
  const profileBlock = profileToContextBlock(applicant)
  const langInstr = await getLanguageInstruction()

  const uniBlock = [
    `University: ${uni.name}`,
    `QS Rank: ${uni.rank_display ?? uni.qs_rank ?? "unranked"}`,
    `Country: ${uni.country}`,
    uni.city ? `City: ${uni.city}` : "",
    uni.overall_score ? `Overall score: ${uni.overall_score}` : "",
    uni.website ? `Website: ${uni.website}` : "",
    uni.description ? `Description: ${String(uni.description).slice(0, 1500)}` : "",
  ].filter(Boolean).join("\n")

  const system = [
    "You are a senior admission advisor giving a brutally honest fit-analysis.",
    "Match score: anchor it on QS rank vs typical applicant profile (e.g. top-50 ≠ realistic for GPA 3.2 / no SAT).",
    "Be specific to THIS university — no generic advice.",
    "Weaknesses must be concrete gaps, not platitudes.",
    "Focus areas = imperative actions ('Take SAT Subject Math II', 'Add 1 research project in CS').",
    "If applicant profile is sparse, say so + which fields to fill first.",
    "",
    profileBlock,
    "",
    langInstr,
  ].join("\n")

  const userPrompt = [
    "Analyze the fit between this applicant and this university.",
    "",
    uniBlock,
  ].join("\n")

  const model = usage.tier === "pro" ? models.claudeSonnet : models.claudeHaiku
  const modelId = usage.tier === "pro" ? MODEL_IDS.sonnet : MODEL_IDS.haiku

  try {
    const result = await generateObject({
      model,
      system,
      schema: InsightsSchema,
      messages: [{ role: "user", content: userPrompt }],
      abortSignal: _req.signal,
    })

    await recordUsage({
      userId: user.id,
      tool: "uni_insights",
      model: modelId,
      inputTokens: result.usage?.inputTokens ?? 0,
      outputTokens: result.usage?.outputTokens ?? 0,
      costUsd: 0,
    })

    return Response.json({ insights: result.object })
  } catch (err) {
    console.error("Uni insights error:", err)
    return Response.json(
      { error: "ai_failed", message: err instanceof Error ? err.message : "AI failed" },
      { status: 500 }
    )
  }
}

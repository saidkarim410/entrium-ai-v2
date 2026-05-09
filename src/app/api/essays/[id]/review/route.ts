import { generateObject } from "ai"
import { z } from "zod"
import { models } from "@/lib/ai"
import { getCurrentUser } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { checkUsage, recordUsage } from "@/lib/rate-limit"
import { profileToContextBlock, EMPTY_PROFILE, type ApplicantProfile } from "@/lib/applicant/types"
import { getLanguageInstruction } from "@/lib/ai/language"
import { wordCount, type Essay } from "@/lib/essays/types"

export const runtime = "nodejs"
export const maxDuration = 60

const ReviewSchema = z.object({
  score: z.number().int().min(0).max(10).describe("Holistic score for an admission essay, 0-10"),
  summary: z.string().describe("1-sentence honest verdict on this draft"),
  strengths: z.array(z.string()).min(2).max(5).describe("What works — specific lines or moves"),
  weaknesses: z.array(z.string()).min(2).max(5).describe("What's broken — be specific, not vague"),
  next_actions: z.array(z.string()).min(3).max(5).describe("Imperative actions for the next revision"),
  cliches: z.array(z.string()).max(5).describe("Cliché phrases or generic moves found verbatim, if any"),
  highlight: z.string().describe("The single best line in the draft, copied verbatim. Empty if none stand out."),
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

  const [{ data: essay }, { data: profileRow }] = await Promise.all([
    supabaseAdmin.from("application_essays").select("*").eq("id", id).eq("user_id", user.id).maybeSingle(),
    supabaseAdmin.from("profiles").select("applicant_data").eq("id", user.id).maybeSingle(),
  ])

  if (!essay) return Response.json({ error: "not_found" }, { status: 404 })
  const e = essay as Essay
  if (!e.draft_text.trim()) {
    return Response.json({ error: "empty_draft", message: "Напиши хотя бы абзац — review без текста бесполезен" }, { status: 400 })
  }

  const applicant = (profileRow?.applicant_data as ApplicantProfile | null) ?? EMPTY_PROFILE
  const profileBlock = profileToContextBlock(applicant)
  const langInstr = await getLanguageInstruction()

  const wc = wordCount(e.draft_text)
  const wordsInfo = e.word_limit
    ? `Word count: ${wc} / ${e.word_limit}${wc > e.word_limit ? " ⚠ OVER LIMIT" : wc > e.word_limit * 0.9 ? "" : ` (${e.word_limit - wc} words to spare)`}`
    : `Word count: ${wc}`

  const system = [
    "You are a brutally honest college admission essay coach. Pretend you're an admission officer at a top-30 school reading 200 essays today.",
    "",
    "RULES:",
    "- score 0-10: 8+ = exceptional. 6 = solid. 4 = generic. 2 = problematic. Be honest, not encouraging.",
    "- summary: ONE sentence. The 'thumb's up or down' verdict.",
    "- strengths: 2-5 specific, copy verbatim where possible. NOT 'good voice' — instead 'opening line about robotics arm hits because it's concrete'.",
    "- weaknesses: 2-5. Be specific. NOT 'needs more depth' — instead 'paragraph 3 lists three activities without showing why any matter'.",
    "- next_actions: 3-5 imperative. NOT 'work on conclusion' — instead 'cut last paragraph and end on the sentence about your sister'.",
    "- cliches: list verbatim phrases/moves. 'I am passionate about', 'changed my life', 'I learned that', generic dictionary openings, formulaic 5-paragraph structure, white-savior framing, etc.",
    "- highlight: the single best sentence in the draft, COPIED EXACTLY. Empty string if no sentence stands out.",
    "",
    profileBlock ? `Candidate context:\n${profileBlock}` : "",
    "",
    langInstr,
  ].filter(Boolean).join("\n")

  const promptBlock = [
    e.title ? `Essay title: ${e.title}` : "",
    e.prompt ? `Prompt: ${e.prompt}` : "",
    wordsInfo,
    "",
    "DRAFT:",
    e.draft_text,
  ].filter(Boolean).join("\n")

  const model = usage.tier === "pro" ? models.claudeSonnet : models.claudeHaiku
  const modelId = usage.tier === "pro" ? "claude-sonnet-4-5" : "claude-haiku-4-5"

  try {
    const result = await generateObject({
      model,
      system,
      schema: ReviewSchema,
      messages: [{ role: "user", content: promptBlock }],
    })

    await recordUsage({
      userId: user.id,
      tool: "essay_review",
      model: modelId,
      inputTokens: result.usage?.inputTokens ?? 0,
      outputTokens: result.usage?.outputTokens ?? 0,
      costUsd: 0,
    })

    const now = new Date().toISOString()
    await supabaseAdmin
      .from("application_essays")
      .update({ ai_review: result.object, ai_review_at: now })
      .eq("id", id)
      .eq("user_id", user.id)

    return Response.json({ review: result.object, generated_at: now })
  } catch (err) {
    console.error("Essay review error:", err)
    return Response.json(
      { error: "ai_failed", message: err instanceof Error ? err.message : "AI failed" },
      { status: 500 }
    )
  }
}

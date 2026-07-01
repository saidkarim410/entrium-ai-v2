import { generateObject } from "ai"
import { z } from "zod"
import { models, MODEL_IDS } from "@/lib/ai"
import { getCurrentUser } from "@/lib/supabase/server"
import { checkUsage, recordUsage } from "@/lib/rate-limit"
import { getLanguageInstruction } from "@/lib/ai/language"
import { COMMON_APP_LIMITS } from "@/lib/activities/types"

export const runtime = "nodejs"
export const maxDuration = 30

const schema = z.object({
  position: z.string().max(120).optional(),
  organization: z.string().max(200).optional(),
  description: z.string().max(2000),
  type: z.string().max(80).optional(),
})

const RewriteSchema = z.object({
  description: z
    .string()
    .describe(`Rewritten activity description, ≤${COMMON_APP_LIMITS.description} chars`),
  notes: z
    .string()
    .describe("Brief explanation of what changed and why")
    .default(""),
})

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 })

  const usage = await checkUsage(user.id)
  if (!usage.allowed) {
    return Response.json({ error: "limit_reached" }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return Response.json({ error: "invalid_input" }, { status: 400 })

  const { position, organization, description, type } = parsed.data

  const langInstr = await getLanguageInstruction()
  const system = [
    "You rewrite Common Application activity descriptions to maximize impact within the 150-character limit.",
    "",
    "RULES (strict):",
    `- Output description MUST be ≤${COMMON_APP_LIMITS.description} characters. Count carefully — return UNDER not over.`,
    "- Lead with a strong action verb (Led, Founded, Coordinated, Designed, Built, Trained, Mentored).",
    "- Quantify whenever possible: # of people impacted, hours, % growth, $ raised, awards, ranks.",
    "- Cut fluff: 'I was responsible for', 'helped', 'participated in', 'various' — gone.",
    "- No personal pronouns (I/my/me) — Common App style is implicit subject.",
    "- One specific result or outcome. Avoid generic claims.",
    "- Preserve domain-specific proper nouns (organization names, awards) verbatim.",
    "- Do NOT invent metrics. If user didn't provide numbers, focus on qualitative specifics.",
    "",
    "notes: 1-sentence explanation of what you improved (e.g. 'Added quantified impact, removed weak verbs').",
    "",
    langInstr,
  ].join("\n")

  const userPrompt = [
    `Activity type: ${type || "(unspecified)"}`,
    `Position: ${position || "(unspecified)"}`,
    `Organization: ${organization || "(unspecified)"}`,
    "",
    "Current description (rewrite this):",
    description,
  ].join("\n")

  const model = usage.tier === "pro" ? models.claudeSonnet : models.claudeHaiku
  const modelId = usage.tier === "pro" ? MODEL_IDS.sonnet : MODEL_IDS.haiku

  try {
    const result = await generateObject({
      model,
      system,
      schema: RewriteSchema,
      messages: [{ role: "user", content: userPrompt }],
      abortSignal: req.signal,
    })

    await recordUsage({
      userId: user.id,
      tool: "activity_rewrite",
      model: modelId,
      inputTokens: result.usage?.inputTokens ?? 0,
      outputTokens: result.usage?.outputTokens ?? 0,
      costUsd: 0,
    })

    return Response.json({ description: result.object.description, notes: result.object.notes })
  } catch (err) {
    console.error("Activity rewrite error:", err)
    return Response.json(
      { error: "ai_failed", message: err instanceof Error ? err.message : "AI failed" },
      { status: 500 }
    )
  }
}

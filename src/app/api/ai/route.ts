import { generateText } from "ai"
import { z } from "zod"
import { models } from "@/lib/ai"
import { SYSTEM_PROMPTS, type ToolKey } from "@/lib/ai/prompts"
import {
  searchUniversities, searchScholarships,
  formatUniversitiesContext, formatScholarshipsContext,
} from "@/lib/ai/rag"
import { getCurrentUser } from "@/lib/supabase/server"
import { checkUsage, recordUsage, consumeBonus } from "@/lib/rate-limit"
import { saveToolRun } from "@/lib/applicant/actions"
import { getLanguageInstruction } from "@/lib/ai/language"

export const runtime = "nodejs"
export const maxDuration = 120

const requestSchema = z.object({
  tool: z.enum([
    "profile", "analyzer", "tracker", "essay",
    "humanizer", "interview", "scholarship", "university",
    "recommendation", "cv", "cost", "reviewer", "counselor",
  ]) satisfies z.ZodType<ToolKey>,
  user: z.string().min(1),
  max_tokens: z.number().int().positive().max(16000).optional(),
})

/**
 * Non-streaming AI endpoint for tools that need full response at once
 * (e.g., Tracker JSON generation, Essay coach final output).
 *
 * For chat-style streaming use /api/chat instead.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "invalid_input", issues: parsed.error.issues }, { status: 400 })
  }

  const usage = await checkUsage(user.id)
  if (!usage.allowed) {
    return Response.json(
      { error: "limit_reached", tier: usage.tier },
      { status: 429 }
    )
  }

  const { tool, user: userMessage, max_tokens } = parsed.data
  const model = usage.tier === "pro" ? models.claudeSonnet : models.claudeHaiku
  const modelId = usage.tier === "pro" ? "claude-sonnet-4-5" : "claude-haiku-4-5"

  // RAG enrichment for scholarship/university tools + language
  let systemPrompt: string = SYSTEM_PROMPTS[tool]
  if (tool === "university" || tool === "scholarship") {
    try {
      const ctx =
        tool === "university"
          ? formatUniversitiesContext(await searchUniversities(userMessage, 12))
          : formatScholarshipsContext(await searchScholarships(userMessage, 12))
      if (ctx) systemPrompt = `${SYSTEM_PROMPTS[tool]}\n\n---\n\n${ctx}`
    } catch (err) {
      console.error("RAG search failed:", err)
    }
  }

  // Always honor user's UI language for AI output
  try {
    const langInstr = await getLanguageInstruction()
    systemPrompt = `${systemPrompt}\n\n---\n\n${langInstr}`
  } catch (err) {
    console.error("language instruction failed:", err)
  }

  const startTime = Date.now()

  try {
    const result = await generateText({
      model,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      // SECURITY (H5): always cap output server-side. Free is tightly bounded;
      // pro may opt higher via max_tokens up to 16k.
      maxOutputTokens: usage.tier === "pro" ? Math.min(max_tokens ?? 8000, 16000) : 2048,
    })

    await recordUsage({
      userId: user.id,
      tool,
      model: modelId,
      inputTokens: result.usage?.inputTokens ?? 0,
      outputTokens: result.usage?.outputTokens ?? 0,
      costUsd: 0,
    })

    // Save to history (tool_runs)
    await saveToolRun({
      userId: user.id,
      tool,
      input: { user: userMessage.slice(0, 4000) }, // truncate for storage
      output: result.text,
      durationMs: Date.now() - startTime,
      status: "success",
    }).catch((e) => console.error("saveToolRun failed:", e))

    const status = await checkUsage(user.id)
    if (status.tier === "free" && status.remaining === 0 && status.bonus > 0) {
      await consumeBonus(user.id)
    }

    return Response.json({
      text: result.text,
      finish_reason: result.finishReason,
      usage: {
        input_tokens: result.usage?.inputTokens ?? 0,
        output_tokens: result.usage?.outputTokens ?? 0,
      },
    })
  } catch (err) {
    // M7: log full detail server-side, return a generic message (no provider leak)
    console.error("AI generation error:", err)
    return Response.json({ error: "ai_failed" }, { status: 500 })
  }
}

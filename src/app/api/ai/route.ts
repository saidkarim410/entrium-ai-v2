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

export const runtime = "nodejs"
export const maxDuration = 120

const requestSchema = z.object({
  tool: z.enum([
    "profile", "analyzer", "tracker", "essay",
    "humanizer", "interview", "scholarship", "university",
  ]) satisfies z.ZodType<ToolKey>,
  system_override: z.string().optional(),
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

  const { tool, system_override, user: userMessage, max_tokens } = parsed.data
  const model = usage.tier === "pro" ? models.claudeSonnet : models.claudeHaiku
  const modelId = usage.tier === "pro" ? "claude-sonnet-4-5" : "claude-haiku-4-5"

  // RAG enrichment for scholarship/university tools
  let systemPrompt: string = system_override ?? SYSTEM_PROMPTS[tool]
  if (!system_override && (tool === "university" || tool === "scholarship")) {
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

  try {
    const result = await generateText({
      model,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      ...(max_tokens && usage.tier === "pro" ? { maxOutputTokens: Math.min(max_tokens, 16000) } : {}),
    })

    await recordUsage({
      userId: user.id,
      tool,
      model: modelId,
      inputTokens: result.usage?.inputTokens ?? 0,
      outputTokens: result.usage?.outputTokens ?? 0,
      costUsd: 0,
    })

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
    console.error("AI generation error:", err)
    return Response.json(
      { error: err instanceof Error ? err.message : "AI generation failed" },
      { status: 500 }
    )
  }
}

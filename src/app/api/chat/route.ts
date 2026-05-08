import { streamText, convertToModelMessages, type UIMessage } from "ai"
import { z } from "zod"
import { models } from "@/lib/ai"
import { SYSTEM_PROMPTS, type ToolKey } from "@/lib/ai/prompts"
import {
  searchUniversities,
  searchScholarships,
  formatUniversitiesContext,
  formatScholarshipsContext,
} from "@/lib/ai/rag"
import { getCurrentUser } from "@/lib/supabase/server"
import { checkUsage, recordUsage, consumeBonus } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const maxDuration = 60

const toolSchema = z.enum([
  "profile",
  "analyzer",
  "tracker",
  "essay",
  "humanizer",
  "interview",
  "scholarship",
  "university",
  "recommendation",
]) satisfies z.ZodType<ToolKey>

function lastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role !== "user") continue
    const text = m.parts
      .filter((p) => p.type === "text")
      .map((p) => ("text" in p ? p.text : ""))
      .join(" ")
    if (text.trim()) return text
  }
  return ""
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }

  const body = (await req.json()) as { tool?: string; messages?: UIMessage[] }
  const toolParse = toolSchema.safeParse(body.tool)
  if (!toolParse.success || !Array.isArray(body.messages)) {
    return Response.json({ error: "invalid_input" }, { status: 400 })
  }

  const usage = await checkUsage(user.id)
  if (!usage.allowed) {
    return Response.json(
      {
        error: "limit_reached",
        message: "Дневной лимит исчерпан. Пригласи друга — получи +10 запросов.",
        tier: usage.tier,
      },
      { status: 429 }
    )
  }

  const tool = toolParse.data
  const model = usage.tier === "pro" ? models.claudeSonnet : models.claudeHaiku
  const modelId = usage.tier === "pro" ? "claude-sonnet-4-5" : "claude-haiku-4-5"
  const modelMessages = await convertToModelMessages(body.messages)

  // RAG: inject database context for university/scholarship tools
  let systemPrompt: string = SYSTEM_PROMPTS[tool]
  if (tool === "university" || tool === "scholarship") {
    const query = lastUserText(body.messages)
    if (query) {
      try {
        const ctx =
          tool === "university"
            ? formatUniversitiesContext(await searchUniversities(query, 12))
            : formatScholarshipsContext(await searchScholarships(query, 12))
        if (ctx) systemPrompt = `${SYSTEM_PROMPTS[tool]}\n\n---\n\n${ctx}`
      } catch (err) {
        console.error("RAG search failed:", err)
      }
    }
  }

  const result = streamText({
    model,
    system: systemPrompt,
    messages: modelMessages,
    onFinish: async ({ usage: aiUsage }) => {
      await recordUsage({
        userId: user.id,
        tool,
        model: modelId,
        inputTokens: aiUsage?.inputTokens ?? 0,
        outputTokens: aiUsage?.outputTokens ?? 0,
        costUsd: 0,
      })
      const status = await checkUsage(user.id)
      if (status.tier === "free" && status.remaining === 0 && status.bonus > 0) {
        await consumeBonus(user.id)
      }
    },
  })

  return result.toUIMessageStreamResponse()
}

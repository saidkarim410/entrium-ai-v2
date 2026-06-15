import { streamText, convertToModelMessages, type UIMessage } from "ai"
import { z } from "zod"
import { models } from "@/lib/ai"
import { SYSTEM_PROMPTS, type ToolKey } from "@/lib/ai/prompts"
import {
  searchUniversities, searchScholarships,
  formatUniversitiesContext, formatScholarshipsContext,
} from "@/lib/ai/rag"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { checkUsage, recordUsage, consumeBonus } from "@/lib/rate-limit"
import { profileToContextBlock, EMPTY_PROFILE, type ApplicantProfile } from "@/lib/applicant/types"
import { applicationsToContextBlock, type Application } from "@/lib/applications/types"
import { languageInstruction } from "@/lib/ai/language"
import { env, telegramEnabled } from "@/lib/env"
import { validateInitData } from "@/lib/telegram/init-data"
import { resolveTelegramUser } from "@/lib/telegram/resolve-user"
import type { Locale } from "@/lib/i18n/dict"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const TOOL_KEYS = [
  "profile", "analyzer", "tracker", "essay", "humanizer", "interview",
  "scholarship", "university", "recommendation", "cv", "cost", "reviewer", "counselor",
] as const

const bodySchema = z.object({
  tool: z.enum(TOOL_KEYS),
  messages: z.array(z.any()),
})

function lastUserText(messages: UIMessage[]): string {
  const last = [...messages].reverse().find((m) => m.role === "user")
  if (!last) return ""
  return last.parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { text: string }).text)
    .join(" ")
}

export async function POST(req: Request) {
  if (!telegramEnabled()) return Response.json({ error: "telegram_disabled" }, { status: 503 })

  const initData = req.headers.get("x-telegram-init-data") ?? ""
  const verdict = validateInitData(initData, env.TELEGRAM_BOT_TOKEN)
  if (!verdict.ok) return Response.json({ error: "unauthorized", reason: verdict.reason }, { status: 401 })

  let parsed: z.infer<typeof bodySchema>
  try {
    parsed = bodySchema.parse(await req.json())
  } catch {
    return Response.json({ error: "invalid_input" }, { status: 400 })
  }
  const tool = parsed.tool as ToolKey
  const uiMessages = parsed.messages as UIMessage[]

  const resolved = await resolveTelegramUser(verdict.user)

  const usage = await checkUsage(resolved.userId)
  if (!usage.allowed) return Response.json({ error: "limit_reached", tier: usage.tier }, { status: 429 })

  const applicant = (resolved.applicantData as ApplicantProfile | null) ?? EMPTY_PROFILE
  const profileBlock = profileToContextBlock(applicant)

  const { data: appsRows } = await supabaseAdmin
    .from("applications").select("*").eq("user_id", resolved.userId)
    .order("deadline", { ascending: true, nullsFirst: false }).limit(50)
  const appsBlock = applicationsToContextBlock((appsRows ?? []) as Application[])

  let system: string = SYSTEM_PROMPTS[tool]
  if (profileBlock) system += `\n\n---\n\n${profileBlock}`
  if (appsBlock) system += `\n\n---\n\n${appsBlock}`
  system += `\n\n---\n\n${languageInstruction((resolved.language as Locale) ?? "ru")}`

  if (tool === "university" || tool === "scholarship") {
    try {
      const q = lastUserText(uiMessages)
      if (q && tool === "university") {
        const unis = await searchUniversities(q, 12)
        if (unis?.length) system += `\n\n---\n\n${formatUniversitiesContext(unis)}`
      } else if (q) {
        const sch = await searchScholarships(q, 12)
        if (sch?.length) system += `\n\n---\n\n${formatScholarshipsContext(sch)}`
      }
    } catch (e) {
      console.error("tg rag failed", e)
    }
  }

  const isPro = usage.tier === "pro"
  const model = isPro ? models.claudeSonnet : models.claudeHaiku
  const modelId = isPro ? "claude-sonnet-4-5" : "claude-haiku-4-5"

  const result = streamText({
    model,
    system,
    messages: await convertToModelMessages(uiMessages),
    onFinish: async ({ usage: aiUsage }) => {
      await recordUsage({
        userId: resolved.userId,
        tool: `tg_${tool}`,
        model: modelId,
        inputTokens: aiUsage?.inputTokens ?? 0,
        outputTokens: aiUsage?.outputTokens ?? 0,
        costUsd: 0,
      })
      const status = await checkUsage(resolved.userId)
      if (status.tier === "free" && status.remaining === 0 && status.bonus > 0) {
        await consumeBonus(resolved.userId)
      }
    },
  })

  return result.toUIMessageStreamResponse()
}

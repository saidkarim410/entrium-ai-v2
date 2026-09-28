import { streamText, convertToModelMessages, type UIMessage } from "ai"
import { z } from "zod"
import { models, MODEL_IDS } from "@/lib/ai"
import { DATA_GUARD, asUserData } from "@/lib/ai/guard"
import { SYSTEM_PROMPTS, type ToolKey } from "@/lib/ai/prompts"
import { buildUniversityContext } from "@/lib/programs/context"
import { buildScholarshipsContext } from "@/lib/scholarships/context"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { checkUsage, recordUsage, settleBonusAfterCall } from "@/lib/rate-limit"
import { buildTemporalBlock } from "@/lib/ai/temporal"
import { profileToContextBlock, normalizeApplicantProfile } from "@/lib/applicant/types"
import { applicationsToContextBlock, type Application } from "@/lib/applications/types"
import { languageInstruction } from "@/lib/ai/language"
import { miniAppBotToken, miniAppEnabled } from "@/lib/env"
import { validateInitData } from "@/lib/telegram/init-data"
import { resolveTelegramUser } from "@/lib/telegram/resolve-user"
import type { Locale } from "@/lib/i18n/dict"
import { emitOfficeEvent } from "@/lib/office"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const TOOL_KEYS = [
  "profile", "analyzer", "tracker", "essay", "humanizer", "interview",
  "scholarship", "university", "recommendation", "cv", "cost", "reviewer", "counselor", "summer", "speaking", "research",
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
  if (!miniAppEnabled()) return Response.json({ error: "telegram_disabled" }, { status: 503 })

  const initData = req.headers.get("x-telegram-init-data") ?? ""
  const verdict = validateInitData(initData, miniAppBotToken())
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

  const applicant = normalizeApplicantProfile(resolved.applicantData)
  const profileBlock = profileToContextBlock(applicant)

  const { data: appsRows } = await supabaseAdmin
    .from("applications").select("*").eq("user_id", resolved.userId)
    .order("deadline", { ascending: true, nullsFirst: false }).limit(50)
  const appsBlock = applicationsToContextBlock((appsRows ?? []) as Application[])

  let system: string = SYSTEM_PROMPTS[tool] + DATA_GUARD
  if (profileBlock) system += asUserData(profileBlock)
  if (appsBlock) system += asUserData(appsBlock)
  system += `\n\n---\n\n${languageInstruction((resolved.language as Locale) ?? "ru")}`
  system += `\n\n---\n\n${buildTemporalBlock(applicant)}` // P0-02: server date + intake + plan months

  if (tool === "university" || tool === "scholarship") {
    try {
      const q = lastUserText(uiMessages)
      if (q) {
        const ctx =
          tool === "university"
            ? await buildUniversityContext(q, applicant)
            : await buildScholarshipsContext(q, applicant)
        if (ctx) system += asUserData(ctx)
      }
    } catch (e) {
      console.error("tg programme/scholarship context failed", e)
    }
  }

  const isPro = usage.tier === "pro"
  const model = isPro ? models.claudeSonnet : models.claudeHaiku
  const modelId = isPro ? MODEL_IDS.sonnet : MODEL_IDS.haiku

  const result = streamText({
    model,
    abortSignal: req.signal, // M2: stop billing tokens if the client disconnects
    maxOutputTokens: 3000, // H5: cap free-form output
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
      await settleBonusAfterCall(resolved.userId) // read-only; checkUsage here double-charged
      // Оживить агента в 3D-офисе (best-effort, не влияет на чат)
      emitOfficeEvent(tool)
    },
  })

  return result.toUIMessageStreamResponse()
}

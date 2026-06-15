import { streamText } from "ai"
import { z } from "zod"
import { models } from "@/lib/ai"
import { SYSTEM_PROMPTS } from "@/lib/ai/prompts"
import {
  searchUniversities,
  searchScholarships,
  formatUniversitiesContext,
  formatScholarshipsContext,
} from "@/lib/ai/rag"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { checkUsage, recordUsage, consumeBonus } from "@/lib/rate-limit"
import { profileToContextBlock, EMPTY_PROFILE, type ApplicantProfile } from "@/lib/applicant/types"
import { applicationsToContextBlock, type Application } from "@/lib/applications/types"
import { languageInstruction } from "@/lib/ai/language"
import { miniAppBotToken, miniAppEnabled } from "@/lib/env"
import { validateInitData } from "@/lib/telegram/init-data"
import { resolveTelegramUser } from "@/lib/telegram/resolve-user"
import { findMission, type MissionId } from "@/lib/agent/missions"
import type { Locale } from "@/lib/i18n/dict"

export const runtime = "nodejs"
export const maxDuration = 300
export const dynamic = "force-dynamic"

const schema = z.object({
  missionId: z.enum([
    "quick-assessment",
    "full-package",
    "pre-submission-audit",
    "year-plan",
  ]),
})

/**
 * Telegram Mini App — initData-authenticated mission runner.
 *
 * Identical NDJSON event stream to /api/agent:
 *   {"type":"meta","totalSteps":N,"missionId":"..."}
 *   {"type":"step_start","step":1,"tool":"...","title":"...","description":"..."}
 *   {"type":"delta","step":1,"text":"..."}
 *   {"type":"step_end","step":1}
 *   ...
 *   {"type":"done"}
 *   {"type":"error","message":"..."}
 *
 * Auth: x-telegram-init-data header validated via HMAC (WebAppData scheme).
 * Profile + apps fetched via supabaseAdmin (no cookie session required).
 * saveToolRun and createNotification are intentionally omitted — they
 * depend on cookie-scoped server actions and would add coupling with no
 * Mini App benefit (notifications are delivered directly in Telegram).
 */
export async function POST(req: Request) {
  // Guard: Telegram must be configured
  if (!miniAppEnabled()) {
    return Response.json({ error: "telegram_disabled" }, { status: 503 })
  }

  // Auth: validate Telegram Mini App initData
  const initData = req.headers.get("x-telegram-init-data") ?? ""
  const verdict = validateInitData(initData, miniAppBotToken())
  if (!verdict.ok) {
    return Response.json({ error: "unauthorized", reason: verdict.reason }, { status: 401 })
  }

  // Parse + validate body
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "invalid_input", issues: parsed.error.issues }, { status: 400 })
  }

  // Resolve mission
  const mission = findMission(parsed.data.missionId)
  if (!mission) {
    return Response.json({ error: "unknown_mission" }, { status: 404 })
  }

  // Resolve Telegram user → platform user
  const resolved = await resolveTelegramUser(verdict.user)

  // Pre-flight quota check
  const initialUsage = await checkUsage(resolved.userId)
  if (!initialUsage.allowed) {
    return Response.json(
      { error: "limit_reached", tier: initialUsage.tier },
      { status: 429 }
    )
  }

  // Mission costs N requests (one per step). For free tier, refuse if not enough.
  const stepsCount = mission.steps.length
  if (initialUsage.tier === "free" && initialUsage.remaining + initialUsage.bonus < stepsCount) {
    return Response.json(
      {
        error: "limit_reached",
        message: `Эта миссия требует ${stepsCount} запросов, у тебя осталось ${initialUsage.remaining + initialUsage.bonus}. Обнови до Pro или подожди до завтра.`,
        tier: "free",
      },
      { status: 429 }
    )
  }

  // Fetch profile + applications via admin client (no cookie session)
  const applicant = (resolved.applicantData as ApplicantProfile | null) ?? EMPTY_PROFILE
  const profileBlock = profileToContextBlock(applicant)

  const { data: appsRows } = await supabaseAdmin
    .from("applications")
    .select("*")
    .eq("user_id", resolved.userId)
    .order("deadline", { ascending: true, nullsFirst: false })
    .limit(50)
  const appsBlock = applicationsToContextBlock((appsRows ?? []) as Application[])

  const langInstr = languageInstruction((resolved.language as Locale) ?? "ru")

  const model = initialUsage.tier === "pro" ? models.claudeSonnet : models.claudeHaiku
  const modelId = initialUsage.tier === "pro" ? "claude-sonnet-4-5" : "claude-haiku-4-5"
  const missionId = mission.id as MissionId

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function emit(obj: unknown) {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"))
      }

      try {
        emit({ type: "meta", totalSteps: stepsCount, missionId })

        for (let i = 0; i < mission.steps.length; i++) {
          const step = mission.steps[i]
          const stepNum = i + 1

          emit({
            type: "step_start",
            step: stepNum,
            tool: step.tool,
            title: step.title,
            description: step.description,
          })

          // Build system prompt with profile + applications + RAG enrichment + language
          let systemPrompt: string = SYSTEM_PROMPTS[step.tool]
          if (profileBlock) systemPrompt = `${systemPrompt}\n\n---\n\n${profileBlock}`
          if (appsBlock) systemPrompt = `${systemPrompt}\n\n---\n\n${appsBlock}`
          systemPrompt = `${systemPrompt}\n\n---\n\n${langInstr}`

          const userPrompt = step.buildPrompt(applicant)

          // RAG enrichment for university/scholarship steps
          if (step.tool === "university" || step.tool === "scholarship") {
            try {
              const ctx =
                step.tool === "university"
                  ? formatUniversitiesContext(await searchUniversities(userPrompt, 12))
                  : formatScholarshipsContext(await searchScholarships(userPrompt, 12))
              if (ctx) systemPrompt = `${systemPrompt}\n\n---\n\n${ctx}`
            } catch (err) {
              console.error("RAG search failed in tg agent step:", err)
            }
          }

          const result = streamText({
            model,
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }],
          })

          for await (const delta of result.textStream) {
            emit({ type: "delta", step: stepNum, text: delta })
          }

          const finalUsage = await result.usage
          await recordUsage({
            userId: resolved.userId,
            tool: `tg_mission_${missionId}`,
            model: modelId,
            inputTokens: finalUsage?.inputTokens ?? 0,
            outputTokens: finalUsage?.outputTokens ?? 0,
            costUsd: 0,
          })

          // Consume free-tier bonus when daily quota runs out
          const status = await checkUsage(resolved.userId)
          if (status.tier === "free" && status.remaining === 0 && status.bonus > 0) {
            await consumeBonus(resolved.userId)
          }

          emit({ type: "step_end", step: stepNum })
        }

        emit({ type: "done" })
      } catch (err) {
        console.error("TG agent pipeline error:", err)
        emit({
          type: "error",
          message: err instanceof Error ? err.message : "Pipeline failed",
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  })
}

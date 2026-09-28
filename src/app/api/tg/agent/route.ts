import { z } from "zod"
import { models, MODEL_IDS } from "@/lib/ai"
import { DATA_GUARD, asUserData } from "@/lib/ai/guard"
import { SYSTEM_PROMPTS } from "@/lib/ai/prompts"
import { getTemporalContext, temporalPromptBlock } from "@/lib/ai/temporal"
import { buildUniversityContext } from "@/lib/programs/context"
import { buildScholarshipsContext } from "@/lib/scholarships/context"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { checkUsage, recordUsage, releaseReservation, settleBonusAfterCall } from "@/lib/rate-limit"
import { profileToContextBlock, normalizeApplicantProfile } from "@/lib/applicant/types"
import { applicationsToContextBlock, type Application } from "@/lib/applications/types"
import { languageInstruction } from "@/lib/ai/language"
import { miniAppBotToken, miniAppEnabled } from "@/lib/env"
import { validateInitData } from "@/lib/telegram/init-data"
import { resolveTelegramUser } from "@/lib/telegram/resolve-user"
import { findMission, type MissionId } from "@/lib/agent/missions"
import { runMissionStep, describeStepFailure } from "@/lib/agent/run-step"
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
 * Same NDJSON event stream as /api/agent (step_start / delta / step_retry /
 * step_end / step_failed / done). Steps are verified the same way (P0-01):
 * a truncated or malformed step is retried once and, if it still fails,
 * reported as `step_failed` — never shown as a finished result. Failed steps
 * release their quota reservation.
 *
 * Auth: x-telegram-init-data header validated via HMAC (WebAppData scheme).
 * Profile + apps fetched via supabaseAdmin (no cookie session required).
 * Persistence/notifications are intentionally omitted — results live in the
 * Telegram chat itself.
 */
export async function POST(req: Request) {
  if (!miniAppEnabled()) {
    return Response.json({ error: "telegram_disabled" }, { status: 503 })
  }

  const initData = req.headers.get("x-telegram-init-data") ?? ""
  const verdict = validateInitData(initData, miniAppBotToken())
  if (!verdict.ok) {
    return Response.json({ error: "unauthorized", reason: verdict.reason }, { status: 401 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "invalid_input", issues: parsed.error.issues }, { status: 400 })
  }

  const mission = findMission(parsed.data.missionId)
  if (!mission) {
    return Response.json({ error: "unknown_mission" }, { status: 404 })
  }

  const resolved = await resolveTelegramUser(verdict.user)

  // Pre-flight quota: reserves ONE request (used by the first step).
  const initialUsage = await checkUsage(resolved.userId)
  if (!initialUsage.allowed) {
    return Response.json({ error: "limit_reached", tier: initialUsage.tier }, { status: 429 })
  }

  const stepsCount = mission.steps.length
  const available = 1 + initialUsage.remaining + initialUsage.bonus
  if (initialUsage.tier === "free" && available < stepsCount) {
    await releaseReservation(resolved.userId)
    return Response.json(
      {
        error: "limit_reached",
        message: `Эта миссия стоит ${stepsCount} запрос(а/ов), а у тебя осталось ${available}. Выбери миссию короче, обнови до Pro или подожди до завтра.`,
        tier: "free",
        need: stepsCount,
        available,
      },
      { status: 429 }
    )
  }

  const applicant = normalizeApplicantProfile(resolved.applicantData)
  const profileBlock = profileToContextBlock(applicant)

  const { data: appsRows } = await supabaseAdmin
    .from("applications")
    .select("*")
    .eq("user_id", resolved.userId)
    .order("deadline", { ascending: true, nullsFirst: false })
    .limit(50)
  const appsBlock = applicationsToContextBlock((appsRows ?? []) as Application[])

  const langInstr = languageInstruction((resolved.language as Locale) ?? "ru")
  const temporal = getTemporalContext(applicant)
  const temporalBlock = temporalPromptBlock(temporal)

  const model = initialUsage.tier === "pro" ? models.claudeSonnet : models.claudeHaiku
  const modelId = initialUsage.tier === "pro" ? MODEL_IDS.sonnet : MODEL_IDS.haiku
  const missionId = mission.id as MissionId

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function emit(obj: unknown) {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"))
      }

      let reservationHeld = true
      let completed = 0
      let failed = 0

      try {
        emit({ type: "meta", totalSteps: stepsCount, missionId })

        for (let i = 0; i < mission.steps.length; i++) {
          const step = mission.steps[i]
          const stepNum = i + 1

          if (req.signal.aborted) break

          if (!reservationHeld) {
            const u = await checkUsage(resolved.userId)
            if (!u.allowed) {
              for (let j = stepNum; j <= stepsCount; j++) {
                failed += 1
                emit({ type: "step_failed", step: j, reason: "quota", message: describeStepFailure("quota") })
              }
              break
            }
            reservationHeld = true
          }

          emit({
            type: "step_start",
            step: stepNum,
            tool: step.tool,
            title: step.title,
            description: step.description,
          })

          let systemPrompt: string = SYSTEM_PROMPTS[step.tool] + DATA_GUARD
          if (profileBlock) systemPrompt += asUserData(profileBlock)
          if (appsBlock) systemPrompt += asUserData(appsBlock)
          systemPrompt = `${systemPrompt}\n\n---\n\n${langInstr}\n\n---\n\n${temporalBlock}`

          const userPrompt = step.buildPrompt(applicant, temporal)

          if (step.tool === "university" || step.tool === "scholarship") {
            try {
              const ctx =
                step.tool === "university"
                  ? await buildUniversityContext(userPrompt, applicant)
                  : await buildScholarshipsContext(userPrompt, applicant)
              if (ctx) systemPrompt += asUserData(ctx)
            } catch (err) {
              console.error("Programme/scholarship context failed in tg agent step:", err)
            }
          }

          const outcome = await runMissionStep({
            model,
            tool: step.tool,
            system: systemPrompt,
            userPrompt,
            todayIso: temporal.todayIso,
            signal: req.signal,
            onDelta: (text) => emit({ type: "delta", step: stepNum, text }),
            onRetry: (attempt, reason) => emit({ type: "step_retry", step: stepNum, attempt, reason }),
          })

          if (outcome.status === "completed") {
            await recordUsage({
              userId: resolved.userId,
              tool: `tg_mission_${missionId}`,
              model: modelId,
              inputTokens: outcome.usage.inputTokens,
              outputTokens: outcome.usage.outputTokens,
              costUsd: 0,
            })
            reservationHeld = false
            await settleBonusAfterCall(resolved.userId)
            completed += 1
            emit({ type: "step_end", step: stepNum, text: outcome.text, warnings: outcome.warnings })
          } else {
            await releaseReservation(resolved.userId)
            reservationHeld = false
            failed += 1
            emit({
              type: "step_failed",
              step: stepNum,
              reason: outcome.reason,
              message: describeStepFailure(outcome.reason),
            })
            if (outcome.reason === "aborted") break
          }
        }

        if (reservationHeld) await releaseReservation(resolved.userId)

        const status = failed === 0 && completed === stepsCount ? "completed" : completed === 0 ? "failed" : "partial"
        emit({ type: "done", status })
      } catch (err) {
        console.error("TG agent pipeline error:", err)
        emit({ type: "error", message: "pipeline_failed" })
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

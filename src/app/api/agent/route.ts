import { z } from "zod"
import { models, MODEL_IDS } from "@/lib/ai"
import { DATA_GUARD, asUserData } from "@/lib/ai/guard"
import { SYSTEM_PROMPTS, PROMPT_VERSION } from "@/lib/ai/prompts"
import { getTemporalContext, temporalPromptBlock } from "@/lib/ai/temporal"
import { buildUniversityContext } from "@/lib/programs/context"
import { buildScholarshipsContext } from "@/lib/scholarships/context"
import { getCurrentUser } from "@/lib/supabase/server"
import { checkUsage, recordUsage, releaseReservation, settleBonusAfterCall } from "@/lib/rate-limit"
import { getApplicantProfile } from "@/lib/applicant/actions"
import { profileToContextBlock } from "@/lib/applicant/types"
import { listApplications } from "@/lib/applications/actions"
import { applicationsToContextBlock } from "@/lib/applications/types"
import { findMission, type Mission } from "@/lib/agent/missions"
import { runMissionStep, describeStepFailure } from "@/lib/agent/run-step"
import {
  createMissionRun,
  getMissionRun,
  updateMissionStep,
  failRemainingSteps,
  type MissionRunRecord,
} from "@/lib/agent/runs"
import { createNotification } from "@/lib/notifications/actions"
import { getLanguageInstruction } from "@/lib/ai/language"

export const runtime = "nodejs"
export const maxDuration = 300 // up to 5 minutes for full pipeline

const MISSION_IDS = ["quick-assessment", "full-package", "pre-submission-audit", "year-plan"] as const

const startSchema = z.object({ missionId: z.enum(MISSION_IDS) })
const retrySchema = z.object({ runId: z.string().uuid(), step: z.number().int().min(1).max(20) })

/**
 * AI Agent — runs a sequential pipeline of tool calls (P0-01 rework).
 *
 * Body: `{ missionId }` starts a new run; `{ runId, step }` re-runs ONE failed
 * step of an existing run. Progress is persisted after every step (see
 * `@/lib/agent/runs`), so a refresh restores the run via GET /api/agent/runs/:id.
 *
 * NDJSON events:
 *   {"type":"run","runId":"..."}
 *   {"type":"meta","totalSteps":N,"missionId":"...","steps":[...]}
 *   {"type":"step_start","step":1,"tool":"analyzer","title":"...","description":"..."}
 *   {"type":"delta","step":1,"text":"..."}
 *   {"type":"step_retry","step":1,"attempt":2,"reason":"truncated"}   ← UI clears partial text
 *   {"type":"step_end","step":1,"text":"<canonical text>","warnings":[]}
 *   {"type":"step_failed","step":1,"reason":"truncated","message":"..."}
 *   {"type":"done","status":"completed"|"partial"|"failed"}
 *   {"type":"error","message":"..."}
 *
 * A step counts as completed only when the model stopped on its own and, for
 * structured tools, the payload validates; a failed step releases its quota.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const retry = retrySchema.safeParse(body)
  const start = startSchema.safeParse(body)
  if (!retry.success && !start.success) {
    return Response.json({ error: "invalid_input", issues: start.error?.issues }, { status: 400 })
  }

  let run: MissionRunRecord | null = null
  let mission: Mission | undefined
  let stepNumbers: number[]

  if (retry.success) {
    run = await getMissionRun(retry.data.runId, user.id)
    if (!run) return Response.json({ error: "run_not_found" }, { status: 404 })
    mission = findMission(run.missionId)
    const target = run.steps.find((s) => s.step === retry.data.step)
    if (!mission || !target || !mission.steps[retry.data.step - 1]) {
      return Response.json({ error: "unknown_step" }, { status: 400 })
    }
    if (target.status === "completed" || target.status === "running") {
      return Response.json({ error: "step_not_retryable", status: target.status }, { status: 409 })
    }
    stepNumbers = [retry.data.step]
  } else {
    mission = findMission(start.data!.missionId)
    if (!mission) return Response.json({ error: "unknown_mission" }, { status: 400 })
    stepNumbers = mission.steps.map((_, i) => i + 1)
  }

  // Pre-flight quota: reserves ONE request (used by the first step below).
  const initialUsage = await checkUsage(user.id)
  if (!initialUsage.allowed) {
    return Response.json({ error: "limit_reached", tier: initialUsage.tier }, { status: 429 })
  }

  // Mission costs N requests (one per step). Refuse up front if Free can't afford it —
  // `remaining` excludes the request just reserved, hence the +1.
  const need = stepNumbers.length
  const available = 1 + initialUsage.remaining + initialUsage.bonus
  if (initialUsage.tier === "free" && available < need) {
    await releaseReservation(user.id)
    return Response.json(
      {
        error: "limit_reached",
        message: `Эта миссия стоит ${need} запрос(а/ов), а у тебя осталось ${available}. Выбери миссию короче, обнови до Pro или подожди до завтра.`,
        tier: "free",
        need,
        available,
      },
      { status: 429 }
    )
  }

  const [applicant, apps, langInstr] = await Promise.all([
    getApplicantProfile(),
    listApplications(),
    getLanguageInstruction(),
  ])
  const profileBlock = profileToContextBlock(applicant)
  const appsBlock = applicationsToContextBlock(apps)
  const temporal = getTemporalContext(applicant)
  const temporalBlock = temporalPromptBlock(temporal)

  const model = initialUsage.tier === "pro" ? models.claudeSonnet : models.claudeHaiku
  const modelId = initialUsage.tier === "pro" ? MODEL_IDS.sonnet : MODEL_IDS.haiku

  if (!run) {
    run = await createMissionRun(user.id, mission, { model: modelId, promptVersion: PROMPT_VERSION })
    if (!run) {
      await releaseReservation(user.id)
      return Response.json({ error: "run_create_failed" }, { status: 500 })
    }
  }

  const encoder = new TextEncoder()
  const missionDef = mission
  const isRetry = retry.success

  const stream = new ReadableStream({
    async start(controller) {
      let current: MissionRunRecord = run!
      function emit(obj: unknown) {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"))
      }

      try {
        emit({ type: "run", runId: current.id })
        emit({ type: "meta", totalSteps: current.steps.length, missionId: current.missionId, steps: current.steps })

        // The pre-flight call already reserved a request for the first step.
        let reservationHeld = true

        for (const stepNum of stepNumbers) {
          const stepDef = missionDef.steps[stepNum - 1]
          const record = current.steps[stepNum - 1]

          if (req.signal.aborted) {
            if (reservationHeld) await releaseReservation(user.id)
            current = await failRemainingSteps(current, user.id, "aborted", stepNum)
            break
          }

          if (!reservationHeld) {
            const u = await checkUsage(user.id)
            if (!u.allowed) {
              current = await failRemainingSteps(current, user.id, "quota", stepNum)
              for (const s of current.steps) {
                if (s.step >= stepNum && s.status === "failed" && s.reason === "quota") {
                  emit({ type: "step_failed", step: s.step, reason: "quota", message: describeStepFailure("quota") })
                }
              }
              break
            }
            reservationHeld = true
          }

          current = await updateMissionStep(current, user.id, { ...record, status: "running", text: undefined, reason: undefined })
          emit({
            type: "step_start",
            step: stepNum,
            tool: stepDef.tool,
            title: stepDef.title,
            description: stepDef.description,
          })

          // System prompt: role + guard + profile + applications + RAG + language + temporal truth
          let systemPrompt: string = SYSTEM_PROMPTS[stepDef.tool] + DATA_GUARD
          if (profileBlock) systemPrompt += asUserData(profileBlock)
          if (appsBlock) systemPrompt += asUserData(appsBlock)
          systemPrompt = `${systemPrompt}\n\n---\n\n${langInstr}\n\n---\n\n${temporalBlock}`

          const userPrompt = stepDef.buildPrompt(applicant, temporal)

          if (stepDef.tool === "university" || stepDef.tool === "scholarship") {
            try {
              const ctx =
                stepDef.tool === "university"
                  ? await buildUniversityContext(userPrompt, applicant)
                  : await buildScholarshipsContext(userPrompt, applicant)
              if (ctx) systemPrompt += asUserData(ctx)
            } catch (err) {
              console.error("Programme/scholarship context failed in agent step:", err)
            }
          }

          const stepStart = Date.now()
          const outcome = await runMissionStep({
            model,
            tool: stepDef.tool,
            system: systemPrompt,
            userPrompt,
            todayIso: temporal.todayIso,
            signal: req.signal,
            onDelta: (text) => emit({ type: "delta", step: stepNum, text }),
            onRetry: (attempt, reason) => emit({ type: "step_retry", step: stepNum, attempt, reason }),
          })
          const durationMs = Date.now() - stepStart

          if (outcome.status === "completed") {
            await recordUsage({
              userId: user.id,
              tool: stepDef.tool,
              model: modelId,
              inputTokens: outcome.usage.inputTokens,
              outputTokens: outcome.usage.outputTokens,
              costUsd: 0,
            })
            reservationHeld = false
            await settleBonusAfterCall(user.id)
            current = await updateMissionStep(current, user.id, {
              ...record,
              status: "completed",
              text: outcome.text,
              attempts: outcome.attempts,
              warnings: outcome.warnings,
            })
            emit({ type: "step_end", step: stepNum, text: outcome.text, warnings: outcome.warnings, durationMs })
          } else {
            // Technically failed → the user does not pay for it.
            await releaseReservation(user.id)
            reservationHeld = false
            console.warn(
              `agent step failed: tool=${stepDef.tool} reason=${outcome.reason} finish=${outcome.finishReason} attempts=${outcome.attempts} tokens=${outcome.usage.outputTokens}`
            )
            current = await updateMissionStep(current, user.id, {
              ...record,
              status: "failed",
              reason: outcome.reason,
              detail: outcome.detail,
              attempts: outcome.attempts,
            })
            emit({
              type: "step_failed",
              step: stepNum,
              reason: outcome.reason,
              message: describeStepFailure(outcome.reason),
            })
            if (outcome.reason === "aborted") {
              current = await failRemainingSteps(current, user.id, "aborted", stepNum + 1)
              break
            }
          }
        }

        if (reservationHeld) await releaseReservation(user.id)

        if (!isRetry && (current.status === "completed" || current.status === "partial")) {
          const done = current.steps.filter((s) => s.status === "completed").length
          await createNotification({
            userId: user.id,
            type: "agent_done",
            title:
              current.status === "completed"
                ? `🤖 Миссия завершена: ${missionDef.title}`
                : `🤖 Миссия завершена частично: ${missionDef.title}`,
            body:
              current.status === "completed"
                ? `Готовы ${done} разделов. Открой History чтобы вернуться к результатам.`
                : `Готовы ${done} из ${current.steps.length} разделов. Неудавшиеся шаги можно повторить на странице Agent.`,
            link: current.status === "completed" ? "/history" : `/agent?run=${current.id}`,
            data: { mission_id: current.missionId, run_id: current.id, steps: done },
          }).catch((e) => console.error("agent_done notification failed:", e))
        }

        emit({ type: "done", status: current.status, runId: current.id })
      } catch (err) {
        console.error("Agent pipeline error:", err)
        try {
          await failRemainingSteps(current, user.id, "model_error")
        } catch {
          /* best effort */
        }
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

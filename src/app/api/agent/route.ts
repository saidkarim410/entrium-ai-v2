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
import { getCurrentUser } from "@/lib/supabase/server"
import { checkUsage, recordUsage, consumeBonus } from "@/lib/rate-limit"
import { getApplicantProfile, saveToolRun } from "@/lib/applicant/actions"
import { profileToContextBlock } from "@/lib/applicant/types"
import { listApplications } from "@/lib/applications/actions"
import { applicationsToContextBlock } from "@/lib/applications/types"
import { findMission, type MissionId } from "@/lib/agent/missions"
import { createNotification } from "@/lib/notifications/actions"
import { getLanguageInstruction } from "@/lib/ai/language"

export const runtime = "nodejs"
export const maxDuration = 300 // up to 5 minutes for full pipeline

const schema = z.object({
  missionId: z.enum([
    "quick-assessment",
    "full-package",
    "pre-submission-audit",
    "year-plan",
  ]),
})

/**
 * AI Agent — runs a sequential pipeline of tool calls.
 *
 * Streams NDJSON events to the client:
 *   {"type":"meta","totalSteps":N,"missionId":"..."}
 *   {"type":"step_start","step":1,"tool":"analyzer","title":"...","description":"..."}
 *   {"type":"delta","step":1,"text":"..."}
 *   {"type":"step_end","step":1}
 *   ...
 *   {"type":"done"}
 *   {"type":"error","message":"..."}
 *
 * Each step uses the same system prompt + RAG injection as /api/chat,
 * but the user-side prompt is auto-built from the applicant profile
 * via the mission definition.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "invalid_input", issues: parsed.error.issues }, { status: 400 })
  }

  const mission = findMission(parsed.data.missionId)
  if (!mission) {
    return Response.json({ error: "unknown_mission" }, { status: 400 })
  }

  // Pre-flight quota check (we re-check inside the loop for fairness)
  const initialUsage = await checkUsage(user.id)
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

  const [applicant, apps, langInstr] = await Promise.all([
    getApplicantProfile(),
    listApplications(),
    getLanguageInstruction(),
  ])
  const profileBlock = profileToContextBlock(applicant)
  const appsBlock = applicationsToContextBlock(apps)

  const model = initialUsage.tier === "pro" ? models.claudeSonnet : models.claudeHaiku
  const modelId = initialUsage.tier === "pro" ? "claude-sonnet-4-5" : "claude-haiku-4-5"
  const missionId = mission.id as MissionId

  const encoder = new TextEncoder()
  const aggregatedOutputs: Array<{ step: number; tool: string; title: string; text: string }> = []

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

          if (step.tool === "university" || step.tool === "scholarship") {
            try {
              const ctx =
                step.tool === "university"
                  ? formatUniversitiesContext(await searchUniversities(userPrompt, 12))
                  : formatScholarshipsContext(await searchScholarships(userPrompt, 12))
              if (ctx) systemPrompt = `${systemPrompt}\n\n---\n\n${ctx}`
            } catch (err) {
              console.error("RAG search failed in agent step:", err)
            }
          }

          const stepStart = Date.now()
          let stepText = ""

          const result = streamText({
            model,
            maxOutputTokens: 3000, // H5: cap per-step output
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }],
          })

          for await (const delta of result.textStream) {
            stepText += delta
            emit({ type: "delta", step: stepNum, text: delta })
          }

          const finalUsage = await result.usage
          await recordUsage({
            userId: user.id,
            tool: step.tool,
            model: modelId,
            inputTokens: finalUsage?.inputTokens ?? 0,
            outputTokens: finalUsage?.outputTokens ?? 0,
            costUsd: 0,
          })

          aggregatedOutputs.push({
            step: stepNum,
            tool: step.tool,
            title: step.title,
            text: stepText,
          })

          // Persist this individual step in tool_runs for history
          await saveToolRun({
            userId: user.id,
            tool: step.tool,
            input: { agent_mission: missionId, step: stepNum, prompt: userPrompt.slice(0, 2000) },
            output: stepText,
            durationMs: Date.now() - stepStart,
            status: "success",
          }).catch((e) => console.error("saveToolRun failed:", e))

          // Consume free-tier bonus when daily quota runs out
          const status = await checkUsage(user.id)
          if (status.tier === "free" && status.remaining === 0 && status.bonus > 0) {
            await consumeBonus(user.id)
          }

          emit({ type: "step_end", step: stepNum })
        }

        // Save aggregate run as a "counselor" entry so it surfaces in history as one item
        await saveToolRun({
          userId: user.id,
          tool: "counselor",
          input: { agent_mission: missionId, mission_title: mission.title },
          output: aggregatedOutputs
            .map((o) => `# ${o.title}\n\n${o.text}`)
            .join("\n\n---\n\n"),
          durationMs: 0,
          status: "success",
        }).catch((e) => console.error("aggregate saveToolRun failed:", e))

        // Notify on completion (also pushes via Telegram if linked)
        await createNotification({
          userId: user.id,
          type: "agent_done",
          title: `🤖 Миссия завершена: ${mission.title}`,
          body: `Готовы ${aggregatedOutputs.length} разделов. Открой History чтобы вернуться к результатам.`,
          link: "/history",
          data: { mission_id: missionId, steps: aggregatedOutputs.length },
        }).catch((e) => console.error("agent_done notification failed:", e))

        emit({ type: "done" })
      } catch (err) {
        console.error("Agent pipeline error:", err)
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

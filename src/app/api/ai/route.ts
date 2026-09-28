import { generateText } from "ai"
import { z } from "zod"
import { models, MODEL_IDS } from "@/lib/ai"
import { SYSTEM_PROMPTS, type ToolKey } from "@/lib/ai/prompts"
import { DATA_GUARD, asUserData } from "@/lib/ai/guard"
import { buildUniversityContextWithItems } from "@/lib/programs/context"
import type { Program, ProgramMatch } from "@/lib/programs/types"
import { buildScholarshipsContext } from "@/lib/scholarships/context"
import { getCurrentUser } from "@/lib/supabase/server"
import { checkUsage, recordUsage, releaseReservation, settleBonusAfterCall } from "@/lib/rate-limit"
import { buildTemporalBlock } from "@/lib/ai/temporal"
import { getApplicantProfile } from "@/lib/applicant/actions"
import { outputBudgetFor, retryInstruction, MAX_STEP_OUTPUT_TOKENS } from "@/lib/agent/run-step"
import { saveToolRun } from "@/lib/applicant/actions"
import { getLanguageInstruction } from "@/lib/ai/language"

export const runtime = "nodejs"
export const maxDuration = 120

const requestSchema = z.object({
  tool: z.enum([
    "profile", "analyzer", "tracker", "essay", "essay_analyze", "essay_rewrite",
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
  const modelId = usage.tier === "pro" ? MODEL_IDS.sonnet : MODEL_IDS.haiku

  // Verified programme base (P0-03) / checked scholarships (P1-01) as the only fact source
  let systemPrompt: string = SYSTEM_PROMPTS[tool]
  // Matched programme rows are returned to the UI so it can offer actions (P1-03)
  let programs: Array<{ program: Program; match: ProgramMatch }> = []
  let programBaseAvailable = true
  if (tool === "university" || tool === "scholarship") {
    try {
      const applicant = await getApplicantProfile()
      let ctx = ""
      if (tool === "university") {
        const r = await buildUniversityContextWithItems(userMessage, applicant)
        ctx = r.context
        programs = r.items
        programBaseAvailable = r.available
      } else {
        ctx = await buildScholarshipsContext(userMessage, applicant)
      }
      if (ctx) systemPrompt = `${SYSTEM_PROMPTS[tool]}${DATA_GUARD}${asUserData(ctx)}`
    } catch (err) {
      console.error("Programme/scholarship context failed:", err)
    }
  }

  // Always honor user's UI language for AI output
  try {
    const langInstr = await getLanguageInstruction()
    systemPrompt = `${systemPrompt}\n\n---\n\n${langInstr}`
  } catch (err) {
    console.error("language instruction failed:", err)
  }

  // P0-02: server date, target intake and precomputed plan months
  try {
    const applicant = await getApplicantProfile()
    systemPrompt = `${systemPrompt}\n\n---\n\n${buildTemporalBlock(applicant)}`
  } catch (err) {
    console.error("temporal context failed:", err)
    systemPrompt = `${systemPrompt}\n\n---\n\n${buildTemporalBlock(null)}`
  }

  const startTime = Date.now()

  try {
    // SECURITY (H5): always cap output server-side. Free gets the per-tool budget
    // (a 12-month tracker plan never fit in the old 2048); pro may opt higher via
    // max_tokens up to 16k.
    let budget = usage.tier === "pro" ? Math.min(max_tokens ?? 8000, 16000) : outputBudgetFor(tool)
    let prompt = userMessage
    let result = await generateText({
      model,
      abortSignal: req.signal, // M2: stop billing tokens if the client disconnects
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
      maxOutputTokens: budget,
    })
    const totalUsage = { input: result.usage?.inputTokens ?? 0, output: result.usage?.outputTokens ?? 0 }

    // P0-01: a response cut off by the token limit is not a result. Retry ONCE with a
    // compaction instruction and a larger budget (same policy as agent steps).
    if (result.finishReason === "length" && !req.signal.aborted) {
      console.warn(`ai route truncated (attempt 1): tool=${tool} tier=${usage.tier} out=${totalUsage.output}`)
      budget = Math.min(Math.round(budget * 1.5), MAX_STEP_OUTPUT_TOKENS)
      prompt = userMessage + retryInstruction("truncated", tool)
      result = await generateText({
        model,
        abortSignal: req.signal,
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }],
        maxOutputTokens: budget,
      })
      totalUsage.input += result.usage?.inputTokens ?? 0
      totalUsage.output += result.usage?.outputTokens ?? 0
    }

    if (result.finishReason === "length") {
      await releaseReservation(user.id)
      console.warn(`ai route truncated (attempt 2): tool=${tool} tier=${usage.tier} out=${totalUsage.output}`)
      return Response.json(
        { error: "truncated", message: "Ответ не поместился в лимит длины даже в сжатом виде. Сузь запрос и попробуй ещё раз — запрос не списан." },
        { status: 502 }
      )
    }

    await recordUsage({
      userId: user.id,
      tool,
      model: modelId,
      inputTokens: totalUsage.input,
      outputTokens: totalUsage.output,
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

    await settleBonusAfterCall(user.id) // read-only; the old checkUsage here double-charged

    return Response.json({
      text: result.text,
      programs: tool === "university" ? programs.map(({ program, match }) => ({ program, match })) : undefined,
      program_base_available: tool === "university" ? programBaseAvailable : undefined,
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

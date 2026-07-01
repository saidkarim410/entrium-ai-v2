import { generateObject } from "ai"
import { z } from "zod"
import { models, MODEL_IDS } from "@/lib/ai"
import { getCurrentUser } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { checkUsage, recordUsage } from "@/lib/rate-limit"
import { profileToContextBlock, EMPTY_PROFILE, type ApplicantProfile } from "@/lib/applicant/types"
import { daysUntil, STATUS_LABELS, PRIORITY_LABELS, type Application } from "@/lib/applications/types"
import { getLanguageInstruction } from "@/lib/ai/language"

export const runtime = "nodejs"
export const maxDuration = 60

const SuggestionsSchema = z.object({
  match_strength: z
    .string()
    .describe("Brief 1-sentence verdict on this applicant's odds at this school")
    .default(""),
  weakest_area: z
    .string()
    .describe("Single biggest weakness/risk for THIS specific application")
    .default(""),
  items: z
    .array(
      z.object({
        title: z.string().describe("Short imperative action title (≤50 chars)"),
        body: z.string().describe("1-2 sentence explanation of WHY and HOW"),
        priority: z.enum(["high", "medium", "low"]),
        weeks_estimate: z
          .string()
          .describe("Rough time budget in human form, e.g. '2 weeks' or '1-2 days'")
          .default(""),
      })
    )
    .min(3)
    .max(6)
    .describe("Concrete next actions, ordered by priority desc"),
  checklist_additions: z
    .array(z.string())
    .describe("Granular tasks to add to the checklist (1 line each, ≤80 chars)")
    .default([]),
})

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 })

  const { id } = await ctx.params
  if (!id) return Response.json({ error: "bad_id" }, { status: 400 })

  const usage = await checkUsage(user.id)
  if (!usage.allowed) {
    return Response.json(
      { error: "limit_reached", tier: usage.tier },
      { status: 429 }
    )
  }

  // Fetch the application + profile in parallel
  const [{ data: app }, { data: profileRow }] = await Promise.all([
    supabaseAdmin.from("applications").select("*").eq("id", id).eq("user_id", user.id).maybeSingle(),
    supabaseAdmin.from("profiles").select("applicant_data").eq("id", user.id).maybeSingle(),
  ])

  if (!app) return Response.json({ error: "not_found" }, { status: 404 })
  const application = app as Application
  const applicant = (profileRow?.applicant_data as ApplicantProfile | null) ?? EMPTY_PROFILE
  const profileBlock = profileToContextBlock(applicant)

  const days = daysUntil(application.deadline)

  const userPrompt = [
    `Я подаю в ${application.university_name}${application.university_country ? `, ${application.university_country}` : ""}.`,
    application.program ? `Программа: ${application.program}` : null,
    application.level ? `Уровень: ${application.level}` : null,
    application.round ? `Раунд: ${application.round}` : null,
    application.deadline ? `Дедлайн: ${application.deadline}${days !== null ? ` (через ${days} дн.)` : ""}` : null,
    `Статус: ${STATUS_LABELS[application.status]}`,
    `Приоритет: ${PRIORITY_LABELS[application.priority]} (reach/match/safety)`,
    application.notes ? `Мои заметки по этой заявке: ${application.notes.slice(0, 800)}` : null,
    application.checklist.length
      ? `Уже в чек-листе: ${application.checklist.map((c) => `${c.done ? "✓" : "□"} ${c.label}`).join("; ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n")

  const langInstr = await getLanguageInstruction()
  const system = [
    "Ты — личный admission strategist для абитуриента.",
    "Дай ЧЁТКИЕ, КОНКРЕТНЫЕ действия для ЭТОЙ заявки в ЭТОТ университет.",
    "",
    "ПРАВИЛА:",
    "- Учитывай профиль абитуриента и тип университета (selectivity, fit, требования).",
    "- НЕ предлагай общие советы типа «работай над эссе» — давай конкретные angles или fixes.",
    "- Учитывай оставшееся время до дедлайна (если меньше 14 дней — фокус на critical fixes).",
    "- Если заявка уже submitted/accepted/rejected — давай советы для следующей фазы (interview prep, accept letter, scholarship negotiation).",
    "- Не дублируй задачи которые уже в чек-листе.",
    "- match_strength: 1 предложение реалистичной оценки шансов.",
    "- weakest_area: 1 главный риск для ЭТОЙ конкретной заявки.",
    "- items: 3-6 действий по приоритету. priority high = критично/срочно. body должно объяснять КАК делать.",
    "- checklist_additions: 3-8 атомарных задач (одно действие на пункт), готовых для добавления в чек-лист.",
    "",
    profileBlock,
    "",
    langInstr,
  ].join("\n")

  const model = usage.tier === "pro" ? models.claudeSonnet : models.claudeHaiku
  const modelId = usage.tier === "pro" ? MODEL_IDS.sonnet : MODEL_IDS.haiku

  try {
    const result = await generateObject({
      model,
      system,
      schema: SuggestionsSchema,
      messages: [{ role: "user", content: userPrompt }],
      abortSignal: _req.signal,
    })

    await recordUsage({
      userId: user.id,
      tool: "app_suggest",
      model: modelId,
      inputTokens: result.usage?.inputTokens ?? 0,
      outputTokens: result.usage?.outputTokens ?? 0,
      costUsd: 0,
    })

    // Cache to applications.ai_suggestions
    const now = new Date().toISOString()
    await supabaseAdmin
      .from("applications")
      .update({ ai_suggestions: result.object, ai_suggestions_at: now })
      .eq("id", id)
      .eq("user_id", user.id)

    return Response.json({ suggestions: result.object, generated_at: now })
  } catch (err) {
    console.error("App suggest error:", err)
    return Response.json(
      { error: "ai_failed", message: err instanceof Error ? err.message : "AI failed" },
      { status: 500 }
    )
  }
}

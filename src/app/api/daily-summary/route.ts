import { generateObject } from "ai"
import { z } from "zod"
import { models, MODEL_IDS } from "@/lib/ai"
import { getCurrentUser } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { checkUsage, recordUsage } from "@/lib/rate-limit"
import { profileToContextBlock, EMPTY_PROFILE, type ApplicantProfile } from "@/lib/applicant/types"
import { applicationsToContextBlock, daysUntil, type Application } from "@/lib/applications/types"
import { getLanguageInstruction } from "@/lib/ai/language"
import { withApiError } from "@/lib/api-error"

export const runtime = "nodejs"
export const maxDuration = 30

const SummarySchema = z.object({
  greeting: z.string().describe("Short personal greeting (≤80 chars). Use the applicant's first name if available."),
  focus_title: z.string().describe("Main thing to do today (≤60 chars), imperative"),
  focus_body: z.string().describe("Why this matters and how to start (1-2 sentences)"),
  focus_href: z.string().describe("Internal link e.g. /tools/reviewer or /applications. No external URLs."),
  insight: z.string().describe("One specific observation about applicant's state — strength or risk (1 sentence)"),
  todos: z
    .array(z.object({
      label: z.string().describe("Imperative action (≤60 chars)"),
      href: z.string().describe("Internal link"),
    }))
    .min(2)
    .max(4)
    .describe("2-4 supporting micro-actions for today"),
  motivation: z.string().describe("One short encouraging line (≤120 chars). Realistic, not cheerleader-y."),
})

/**
 * GET — return today's cached summary or null if not generated yet
 * POST — generate a new summary (force=true) or use cache if exists
 *
 * Cache is in tool_runs with tool='daily_summary'. Looking up by user+date.
 */
// S-14 (TZ): wrapped in withApiError so an uncaught throw (DB outage,
// AI provider 500, malformed JSON from model) returns a clean
// 500 + scrubbed message instead of leaking a stack trace.
export const GET = withApiError(async () => {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 })

  const cached = await readToday(user.id)
  return Response.json({ summary: cached })
})

export const POST = withApiError(async (req: Request) => {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const force = Boolean(body?.force)

  if (!force) {
    const cached = await readToday(user.id)
    if (cached) return Response.json({ summary: cached, cached: true })
  }

  const usage = await checkUsage(user.id)
  if (!usage.allowed) {
    return Response.json({ error: "limit_reached" }, { status: 429 })
  }

  const summary = await generateForUser(user.id, usage.tier)
  if (!summary) {
    return Response.json({ error: "no_data", message: "Заполни профиль и добавь хоть одну заявку" }, { status: 400 })
  }
  return Response.json({ summary, cached: false })
})

// ── Internals ────────────────────────────────────────────────────────────

type Summary = z.infer<typeof SummarySchema>

async function readToday(userId: string): Promise<Summary | null> {
  // "Today" means since 04:00 UTC of current day — gives users one summary per
  // local morning regardless of their timezone within ±20h
  const since = new Date()
  since.setUTCHours(4, 0, 0, 0)
  if (since.getTime() > Date.now()) since.setUTCDate(since.getUTCDate() - 1)

  const { data } = await supabaseAdmin
    .from("tool_runs")
    .select("output, created_at")
    .eq("user_id", userId)
    .eq("tool", "daily_summary")
    .eq("status", "success")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const text = (data?.output as { text?: string } | null)?.text
  if (!text) return null
  try {
    return JSON.parse(text) as Summary
  } catch {
    return null
  }
}

export async function generateForUser(userId: string, tier: "free" | "pro"): Promise<Summary | null> {
  // Pull profile + apps in parallel
  const [profileRes, appsRes] = await Promise.all([
    supabaseAdmin.from("profiles").select("applicant_data, full_name, language").eq("id", userId).maybeSingle(),
    supabaseAdmin.from("applications").select("*").eq("user_id", userId),
  ])

  const applicant = (profileRes.data?.applicant_data as ApplicantProfile | null) ?? EMPTY_PROFILE
  const apps = (appsRes.data ?? []) as Application[]

  // Skip users with no signal — don't spend tokens on empty accounts
  if (!applicant._completed && apps.length === 0) return null

  // Build a focused snapshot
  const upcoming = apps
    .filter((a) => a.deadline && ["planning", "in_progress", "interview"].includes(a.status))
    .map((a) => ({
      uni: a.university_name,
      days: daysUntil(a.deadline),
      status: a.status,
      priority: a.priority,
    }))
    .filter((a) => a.days !== null && a.days >= -1)
    .sort((a, b) => (a.days ?? 999) - (b.days ?? 999))
    .slice(0, 5)

  const stateBlock = [
    `Today: ${new Date().toISOString().slice(0, 10)}`,
    `Active applications: ${apps.length}`,
    upcoming.length
      ? "Upcoming:\n" + upcoming.map((u) => `  - ${u.uni}: ${u.days}d, ${u.status}, ${u.priority}`).join("\n")
      : "No upcoming deadlines",
    profileToContextBlock(applicant),
    applicationsToContextBlock(apps),
  ].filter(Boolean).join("\n\n")

  const langInstr = await getLanguageInstruction()
  const system = [
    "You write a 30-second daily focus card for a university applicant.",
    "Be specific to their state, not generic. Reference real data: their next deadline, their weakest area, their most urgent app.",
    "",
    "RULES:",
    "- Output a JSON object matching the schema. The 'text' delivered to the user is rendered from this — no markdown.",
    "- focus_title: imperative ('Финализируй эссе для MIT'), not abstract ('Работай над эссе').",
    "- focus_href: must start with /. Examples: /applications, /tools/reviewer, /tools/essay, /agent",
    "- insight: ONE concrete observation. 'Profile 60% — заполни тесты' or 'MIT EA через 9 дней — поздно для нового draft'.",
    "- todos: 2-4 micro-actions. NOT 'work on essays' — instead 'добавь личный пример в Stanford Why-Us'.",
    "- motivation: realistic, not 'You can do it!'. Reference reality: 'Топ-30 не лотерея — план есть, теперь исполнение'.",
    "- If applicant is in 'final stretch' (deadline ≤7d), shift everything to that uni: focus, todos, insight all about it.",
    "",
    langInstr,
  ].join("\n")

  const result = await generateObject({
    model: tier === "pro" ? models.claudeSonnet : models.claudeHaiku,
    system,
    schema: SummarySchema,
    messages: [{ role: "user", content: stateBlock }],
  })

  await recordUsage({
    userId,
    tool: "daily_summary",
    model: tier === "pro" ? MODEL_IDS.sonnet : MODEL_IDS.haiku,
    inputTokens: result.usage?.inputTokens ?? 0,
    outputTokens: result.usage?.outputTokens ?? 0,
    costUsd: 0,
  })

  // Cache as tool_runs entry
  await supabaseAdmin.from("tool_runs").insert({
    user_id: userId,
    tool: "daily_summary",
    input: { generated_at: new Date().toISOString() },
    output: { text: JSON.stringify(result.object) },
    status: "success",
    duration_ms: 0,
  })

  return result.object
}

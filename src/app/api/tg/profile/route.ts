import { supabaseAdmin } from "@/lib/supabase/admin"
import { miniAppBotToken, miniAppEnabled } from "@/lib/env"
import { validateInitData } from "@/lib/telegram/init-data"
import { resolveTelegramUser } from "@/lib/telegram/resolve-user"
import { normalizeApplicantProfile, type ApplicantProfile } from "@/lib/applicant/types"
import { z } from "zod"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// M4: validate the incoming profile JSON. `.strict()` rejects unknown keys so a
// Mini App client can't overwrite internal fields (e.g. `_notification_prefs`,
// `activities_structured`) or stuff megabytes of junk that then flow into the
// system prompt and the public /p/[slug] page. Per-field caps bound the size.
const optStr = (max: number) => z.string().max(max).optional()
const applicantInputSchema = z
  .object({
    personal: z
      .object({
        name: optStr(200), age: optStr(50), citizenship: optStr(120), location: optStr(200),
        email: optStr(320), phone: optStr(60), linkedin: optStr(400),
        github: optStr(400), portfolio: optStr(400),
      })
      .strict()
      .optional(),
    academic: z
      .object({
        school: optStr(300), schoolType: optStr(120), gpa: optStr(50), sat: optStr(50),
        act: optStr(50), ielts: optStr(50), toefl: optStr(50), duolingo: optStr(50),
        apIb: optStr(500), coursework: optStr(2000),
      })
      .strict()
      .optional(),
    goals: z
      .object({
        level: z.enum(["Bachelor", "Master", "PhD", "MBA", "Foundation"]).optional(),
        year: optStr(20), major: optStr(300), region: optStr(200),
        countries: optStr(500), targetUnis: optStr(1000), budget: optStr(100),
      })
      .strict()
      .optional(),
    experience: optStr(4000), activities: optStr(4000), awards: optStr(4000),
    projects: optStr(4000), skillsTech: optStr(2000), skillsLang: optStr(1000),
    weak: optStr(2000), goalsText: optStr(4000),
  })
  .strict()

export async function GET(req: Request) {
  if (!miniAppEnabled()) return Response.json({ error: "telegram_disabled" }, { status: 503 })

  const initData = req.headers.get("x-telegram-init-data") ?? ""
  const verdict = validateInitData(initData, miniAppBotToken())
  if (!verdict.ok) return Response.json({ error: "unauthorized", reason: verdict.reason }, { status: 401 })

  const resolved = await resolveTelegramUser(verdict.user)

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("applicant_data")
    .eq("id", resolved.userId)
    .maybeSingle()

  return Response.json({ profile: normalizeApplicantProfile(data?.applicant_data) })
}

export async function POST(req: Request) {
  if (!miniAppEnabled()) return Response.json({ error: "telegram_disabled" }, { status: 503 })

  const initData = req.headers.get("x-telegram-init-data") ?? ""
  const verdict = validateInitData(initData, miniAppBotToken())
  if (!verdict.ok) return Response.json({ error: "unauthorized", reason: verdict.reason }, { status: 401 })

  const resolved = await resolveTelegramUser(verdict.user)

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 })
  }
  const validated = applicantInputSchema.safeParse(raw)
  if (!validated.success) {
    return Response.json({ error: "invalid_profile" }, { status: 400 })
  }
  const incoming = validated.data

  // Read current stored data to do a deep-merge (partial saves must not wipe existing fields)
  const { data: currentRow } = await supabaseAdmin
    .from("profiles")
    .select("applicant_data")
    .eq("id", resolved.userId)
    .maybeSingle()

  const currentNorm = normalizeApplicantProfile(currentRow?.applicant_data)

  const merged: ApplicantProfile = {
    ...currentNorm,
    ...incoming,
    personal: { ...currentNorm.personal, ...(incoming.personal ?? {}) },
    academic: { ...currentNorm.academic, ...(incoming.academic ?? {}) },
    goals: { ...currentNorm.goals, ...(incoming.goals ?? {}) },
    _completed: true,
    _updated: new Date().toISOString(),
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ applicant_data: merged })
    .eq("id", resolved.userId)

  if (error) {
    console.error("[tg/profile] update failed:", error)
    return Response.json({ error: "save_failed" }, { status: 500 })
  }

  return Response.json({ ok: true })
}

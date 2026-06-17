import { supabaseAdmin } from "@/lib/supabase/admin"
import { miniAppBotToken, miniAppEnabled } from "@/lib/env"
import { validateInitData } from "@/lib/telegram/init-data"
import { resolveTelegramUser } from "@/lib/telegram/resolve-user"
import { normalizeApplicantProfile, type ApplicantProfile } from "@/lib/applicant/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

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

  let incoming: Partial<ApplicantProfile>
  try {
    incoming = (await req.json()) as Partial<ApplicantProfile>
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 })
  }

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

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ok: true })
}

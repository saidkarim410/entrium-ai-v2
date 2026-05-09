"use server"

import { revalidatePath } from "next/cache"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/supabase/server"
import { awardReferralOnCompletion } from "@/lib/referrals/actions"
import { captureSnapshot } from "@/lib/profile-snapshots/actions"
import { EMPTY_PROFILE, type ApplicantProfile } from "./types"

export async function getApplicantProfile(): Promise<ApplicantProfile> {
  const user = await getCurrentUser()
  if (!user) return EMPTY_PROFILE

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("applicant_data")
    .eq("id", user.id)
    .maybeSingle()

  // Defensive merge against EMPTY_PROFILE — fixes /onboarding crash for
  // brand-new Google-OAuth users. Their `applicant_data` row can be {},
  // null, or a partial object missing `personal` / `academic` / `goals`,
  // which made `profile.personal.name` throw "Cannot read properties of
  // undefined (reading 'name')" on first render.
  const stored = (data?.applicant_data as Partial<ApplicantProfile> | null) ?? null
  if (!stored) return EMPTY_PROFILE
  return {
    ...stored,
    personal: { ...EMPTY_PROFILE.personal, ...(stored.personal ?? {}) },
    academic: { ...EMPTY_PROFILE.academic, ...(stored.academic ?? {}) },
    goals: { ...EMPTY_PROFILE.goals, ...(stored.goals ?? {}) },
  } as ApplicantProfile
}

export async function saveApplicantProfile(profile: ApplicantProfile): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "unauthorized" }

  // Read prior state to detect onboarding completion transition
  const { data: prior } = await supabaseAdmin
    .from("profiles")
    .select("applicant_data")
    .eq("id", user.id)
    .maybeSingle()
  const wasCompleted = Boolean(
    (prior?.applicant_data as { _completed?: boolean } | null | undefined)?._completed
  )

  const merged: ApplicantProfile = {
    ...profile,
    _completed: true,
    _updated: new Date().toISOString(),
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ applicant_data: merged })
    .eq("id", user.id)

  if (error) return { ok: false, error: error.message }

  // First-time completion → award referrer (if any) + notify
  if (!wasCompleted) {
    awardReferralOnCompletion(user.id).catch((e) =>
      console.error("awardReferralOnCompletion failed:", e)
    )
  }

  // Best-effort: snapshot today's profile for /profile/history. Never blocks.
  captureSnapshot(user.id, merged).catch((e) =>
    console.error("captureSnapshot failed:", e)
  )

  revalidatePath("/dashboard")
  revalidatePath("/settings")
  revalidatePath("/refer")
  return { ok: true }
}

/**
 * Onboarding wizard auto-save: persists in-progress profile data WITHOUT
 * marking the user as having completed onboarding. So if the user reloads
 * mid-wizard, their data is preserved but the flow still runs.
 *
 * Critical difference from saveApplicantProfile: does NOT set _completed=true.
 */
export async function saveOnboardingProgress(
  profile: ApplicantProfile
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "unauthorized" }

  // Preserve any side fields stored under applicant_data (like
  // _notification_prefs) that aren't part of the wizard form
  const { data: prior } = await supabaseAdmin
    .from("profiles")
    .select("applicant_data")
    .eq("id", user.id)
    .maybeSingle()
  const sideFields = (prior?.applicant_data as Record<string, unknown> | null) ?? {}

  const merged = {
    ...sideFields,
    ...profile,
    // Explicitly NOT setting _completed — wizard finish does that
    _completed: false,
    _updated: new Date().toISOString(),
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ applicant_data: merged })
    .eq("id", user.id)

  if (error) return { ok: false, error: error.message }

  // Best-effort snapshot here too so onboarding progress shows up in /profile/history
  captureSnapshot(user.id, merged as ApplicantProfile).catch((e) =>
    console.error("captureSnapshot (onboarding) failed:", e)
  )

  return { ok: true }
}

/**
 * Saves a tool run record (input + output) for history tracking.
 * Called from API routes after AI generation.
 */
export async function saveToolRun(params: {
  userId: string
  tool: string
  input: Record<string, unknown>
  output: string
  durationMs: number
  status?: "success" | "error"
}) {
  await supabaseAdmin.from("tool_runs").insert({
    user_id: params.userId,
    tool: params.tool,
    input: params.input,
    output: { text: params.output },
    duration_ms: params.durationMs,
    status: params.status ?? "success",
  })
}

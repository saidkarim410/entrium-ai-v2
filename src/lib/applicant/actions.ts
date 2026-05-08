"use server"

import { revalidatePath } from "next/cache"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/supabase/server"
import { awardReferralOnCompletion } from "@/lib/referrals/actions"
import { EMPTY_PROFILE, type ApplicantProfile } from "./types"

export async function getApplicantProfile(): Promise<ApplicantProfile> {
  const user = await getCurrentUser()
  if (!user) return EMPTY_PROFILE

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("applicant_data")
    .eq("id", user.id)
    .maybeSingle()

  return (data?.applicant_data as ApplicantProfile) ?? EMPTY_PROFILE
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

  revalidatePath("/dashboard")
  revalidatePath("/settings")
  revalidatePath("/refer")
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

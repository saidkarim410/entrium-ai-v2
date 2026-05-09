"use server"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/supabase/server"
import { profileCompleteness, type ApplicantProfile } from "@/lib/applicant/types"

export type ProfileSnapshot = {
  id: string
  user_id: string
  snapshot_date: string
  applicant_data: ApplicantProfile
  completeness: number
  apps_count: number
  created_at: string
}

/**
 * Idempotent per-day snapshot — uses ON CONFLICT (user_id, snapshot_date)
 * to overwrite the same-day row with the latest applicant_data. So saving
 * a profile 5 times in one day = 1 row, but each subsequent day adds a
 * new row.
 *
 * Called from saveApplicantProfile and saveOnboardingProgress (best-effort,
 * never blocks the save itself on snapshot failure).
 */
export async function captureSnapshot(userId: string, profile: ApplicantProfile): Promise<void> {
  const completeness = profileCompleteness(profile)

  // Count apps for this snapshot
  const { count } = await supabaseAdmin
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)

  const today = new Date().toISOString().slice(0, 10)

  await supabaseAdmin
    .from("profile_snapshots")
    .upsert(
      {
        user_id: userId,
        snapshot_date: today,
        applicant_data: profile,
        completeness,
        apps_count: count ?? 0,
      },
      { onConflict: "user_id,snapshot_date" }
    )
}

export async function listProfileSnapshots(limit = 90): Promise<ProfileSnapshot[]> {
  const user = await getCurrentUser()
  if (!user) return []

  const { data } = await supabaseAdmin
    .from("profile_snapshots")
    .select("*")
    .eq("user_id", user.id)
    .order("snapshot_date", { ascending: true })
    .limit(limit)

  return (data ?? []) as ProfileSnapshot[]
}

"use server"

import { revalidatePath } from "next/cache"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/supabase/server"
import type { ActivityEntry } from "./types"
import { activitiesToPlainText } from "./types"

const MAX_ACTIVITIES = 10

export async function listActivities(): Promise<ActivityEntry[]> {
  const user = await getCurrentUser()
  if (!user) return []

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("applicant_data")
    .eq("id", user.id)
    .maybeSingle()

  const apdata = (data?.applicant_data as { activities_structured?: ActivityEntry[] } | null) ?? null
  return Array.isArray(apdata?.activities_structured) ? apdata.activities_structured : []
}

export async function saveActivities(items: ActivityEntry[]): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "unauthorized" }

  // Cap at 10 — Common App limit
  const trimmed = items.slice(0, MAX_ACTIVITIES)

  // Read existing applicant_data
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("applicant_data")
    .eq("id", user.id)
    .maybeSingle()

  const cur = (data?.applicant_data as Record<string, unknown> | null) ?? {}

  // Sync the legacy free-text "activities" field too so existing tools still
  // see the data
  const flat = activitiesToPlainText(trimmed)

  const merged = {
    ...cur,
    activities_structured: trimmed,
    activities: flat,
    _updated: new Date().toISOString(),
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ applicant_data: merged })
    .eq("id", user.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath("/activities")
  revalidatePath("/settings")
  revalidatePath("/dashboard")
  return { ok: true }
}

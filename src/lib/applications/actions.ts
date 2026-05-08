"use server"

import { revalidatePath } from "next/cache"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/supabase/server"
import {
  APP_STATUSES,
  APP_PRIORITIES,
  APP_LEVELS,
  type Application,
  type AppStatus,
  type AppPriority,
  type AppLevel,
  type ChecklistItem,
} from "./types"

export async function listApplications(): Promise<Application[]> {
  const user = await getCurrentUser()
  if (!user) return []

  const { data, error } = await supabaseAdmin
    .from("applications")
    .select("*")
    .eq("user_id", user.id)
    .order("deadline", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })

  if (error) {
    console.error("listApplications error:", error)
    return []
  }
  return (data ?? []) as Application[]
}

export type AppInput = {
  id?: string
  university_name: string
  university_country?: string
  program?: string
  level?: AppLevel | ""
  round?: string
  deadline?: string // YYYY-MM-DD or ""
  status?: AppStatus
  priority?: AppPriority
  application_fee_usd?: number | string
  notes?: string
  checklist?: ChecklistItem[]
  result_decision?: string
}

function clean(input: AppInput) {
  const status: AppStatus = APP_STATUSES.includes(input.status as AppStatus)
    ? (input.status as AppStatus)
    : "planning"
  const priority: AppPriority = APP_PRIORITIES.includes(input.priority as AppPriority)
    ? (input.priority as AppPriority)
    : "match"
  const level: AppLevel | null =
    input.level && APP_LEVELS.includes(input.level as AppLevel)
      ? (input.level as AppLevel)
      : null

  const fee =
    typeof input.application_fee_usd === "number"
      ? input.application_fee_usd
      : input.application_fee_usd
        ? Number(input.application_fee_usd) || null
        : null

  return {
    university_name: input.university_name.trim(),
    university_country: input.university_country?.trim() || null,
    program: input.program?.trim() || null,
    level,
    round: input.round?.trim() || null,
    deadline: input.deadline?.trim() || null,
    status,
    priority,
    application_fee_usd: fee,
    notes: input.notes?.trim() || null,
    checklist: Array.isArray(input.checklist) ? input.checklist : [],
    result_decision: input.result_decision?.trim() || null,
  }
}

export async function upsertApplication(
  input: AppInput
): Promise<{ ok: boolean; error?: string; id?: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "unauthorized" }
  if (!input.university_name?.trim()) {
    return { ok: false, error: "university_name required" }
  }

  const payload = { ...clean(input), user_id: user.id }

  if (input.id) {
    const { error } = await supabaseAdmin
      .from("applications")
      .update(payload)
      .eq("id", input.id)
      .eq("user_id", user.id)
    if (error) return { ok: false, error: error.message }
    revalidatePath("/applications")
    return { ok: true, id: input.id }
  }

  const { data, error } = await supabaseAdmin
    .from("applications")
    .insert(payload)
    .select("id")
    .single()

  if (error) return { ok: false, error: error.message }
  revalidatePath("/applications")
  return { ok: true, id: data.id as string }
}

export async function deleteApplication(id: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "unauthorized" }

  const { error } = await supabaseAdmin
    .from("applications")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath("/applications")
  return { ok: true }
}

export async function updateApplicationStatus(
  id: string,
  status: AppStatus
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "unauthorized" }

  if (!APP_STATUSES.includes(status)) {
    return { ok: false, error: "invalid status" }
  }

  const { error } = await supabaseAdmin
    .from("applications")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath("/applications")
  return { ok: true }
}

export async function addChecklistItems(
  id: string,
  labels: string[]
): Promise<{ ok: boolean; error?: string; added: number }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "unauthorized", added: 0 }

  const { data, error } = await supabaseAdmin
    .from("applications")
    .select("checklist")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (error || !data) return { ok: false, error: error?.message ?? "not_found", added: 0 }

  const existing = (data.checklist as ChecklistItem[]) ?? []
  const existingLabels = new Set(existing.map((it) => it.label.toLowerCase().trim()))

  const next: ChecklistItem[] = [...existing]
  let added = 0
  for (const raw of labels) {
    const label = raw.trim()
    if (!label || existingLabels.has(label.toLowerCase())) continue
    next.push({
      id: cryptoRandomId(),
      label,
      done: false,
    })
    added++
  }

  if (added === 0) return { ok: true, added: 0 }

  const { error: updErr } = await supabaseAdmin
    .from("applications")
    .update({ checklist: next })
    .eq("id", id)
    .eq("user_id", user.id)

  if (updErr) return { ok: false, error: updErr.message, added: 0 }
  revalidatePath("/applications")
  return { ok: true, added }
}

function cryptoRandomId(): string {
  const arr = new Uint8Array(8)
  crypto.getRandomValues(arr)
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("")
}

export async function toggleChecklistItem(
  id: string,
  itemId: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "unauthorized" }

  const { data, error } = await supabaseAdmin
    .from("applications")
    .select("checklist")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (error || !data) return { ok: false, error: error?.message ?? "not found" }

  const items = (data.checklist as ChecklistItem[]) ?? []
  const next = items.map((it) => (it.id === itemId ? { ...it, done: !it.done } : it))

  const { error: updErr } = await supabaseAdmin
    .from("applications")
    .update({ checklist: next })
    .eq("id", id)
    .eq("user_id", user.id)

  if (updErr) return { ok: false, error: updErr.message }
  revalidatePath("/applications")
  return { ok: true }
}

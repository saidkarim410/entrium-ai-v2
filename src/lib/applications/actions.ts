"use server"

import { revalidatePath } from "next/cache"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/supabase/server"
import {
  APP_STATUSES,
  type Application,
  type AppStatus,
  type ChecklistItem,
} from "./types"
import { normalizeApplicationInput, type AppInput } from "./normalize"

export type { AppInput } from "./normalize"

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

/**
 * Create or update one application (P0-04).
 *  - the deadline is validated on the server: a date that can't be parsed is an
 *    error the user sees, never a silent NULL;
 *  - updates are PARTIAL — only keys present in the input are written, so the
 *    edit dialog (which has no checklist field) no longer wipes the checklist;
 *  - the saved row is returned so the client can verify what was persisted.
 */
export async function upsertApplication(
  input: AppInput
): Promise<{ ok: boolean; error?: string; id?: string; application?: Application }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "unauthorized" }

  const normalized = normalizeApplicationInput(input, { partial: Boolean(input.id) })
  if (!normalized.ok) return { ok: false, error: normalized.error }

  if (input.id) {
    const { data, error } = await supabaseAdmin
      .from("applications")
      .update(normalized.row)
      .eq("id", input.id)
      .eq("user_id", user.id)
      .select("*")
      .maybeSingle()
    if (error) return { ok: false, error: error.message }
    if (!data) return { ok: false, error: "Заявка не найдена" }
    revalidatePath("/applications")
    return { ok: true, id: input.id, application: data as Application }
  }

  const { data, error } = await supabaseAdmin
    .from("applications")
    .insert({ ...normalized.row, user_id: user.id })
    .select("*")
    .single()

  if (error) return { ok: false, error: error.message }
  revalidatePath("/applications")
  return { ok: true, id: data.id as string, application: data as Application }
}

export async function bulkInsertApplications(
  inputs: AppInput[]
): Promise<{ ok: boolean; inserted: number; error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, inserted: 0, error: "unauthorized" }

  const valid = inputs.filter((i) => i.university_name?.trim()).slice(0, 20)
  if (valid.length === 0) return { ok: true, inserted: 0 }

  // Rows with an unparseable deadline are skipped rather than saved with a silent NULL
  const rows = valid
    .map((i) => normalizeApplicationInput(i))
    .flatMap((r) => (r.ok ? [{ ...r.row, user_id: user.id }] : []))
  if (rows.length === 0) return { ok: false, inserted: 0, error: "Ни одна строка не прошла проверку дат" }
  const { data, error } = await supabaseAdmin
    .from("applications")
    .insert(rows)
    .select("id")

  if (error) return { ok: false, inserted: 0, error: error.message }
  revalidatePath("/applications")
  revalidatePath("/calendar")
  revalidatePath("/dashboard")
  return { ok: true, inserted: data?.length ?? 0 }
}

export async function cloneApplication(id: string): Promise<{ ok: boolean; error?: string; id?: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "unauthorized" }

  const { data: src, error: fetchErr } = await supabaseAdmin
    .from("applications")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (fetchErr || !src) return { ok: false, error: fetchErr?.message ?? "not_found" }

  // Strip unique / state fields, keep the structural data
  const payload = {
    user_id: user.id,
    university_name: `${src.university_name} (copy)`,
    university_country: src.university_country,
    program: src.program,
    level: src.level,
    round: null, // round + deadline often differ between rounds
    deadline: null,
    status: "planning",
    priority: src.priority,
    application_fee_usd: src.application_fee_usd,
    notes: src.notes,
    checklist: [], // start with a fresh checklist (no progress carryover)
    result_decision: null,
    ai_suggestions: null,
    ai_suggestions_at: null,
  }

  const { data: created, error } = await supabaseAdmin
    .from("applications")
    .insert(payload)
    .select("id")
    .single()

  if (error) return { ok: false, error: error.message }
  revalidatePath("/applications")
  revalidatePath("/calendar")
  return { ok: true, id: created.id as string }
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

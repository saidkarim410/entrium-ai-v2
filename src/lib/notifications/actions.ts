"use server"

import { revalidatePath } from "next/cache"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/supabase/server"
import type { Notification, NotificationType } from "./types"
import {
  DEFAULT_PREFS,
  mergePrefs,
  getPrefsForUser,
  shouldNotify,
  type NotificationPrefs,
} from "./prefs"

export async function listNotifications(limit = 20): Promise<Notification[]> {
  const user = await getCurrentUser()
  if (!user) return []

  const { data, error } = await supabaseAdmin
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("listNotifications error:", error)
    return []
  }
  return (data ?? []) as Notification[]
}

export async function unreadCount(): Promise<number> {
  const user = await getCurrentUser()
  if (!user) return 0

  const { count } = await supabaseAdmin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null)

  return count ?? 0
}

export async function markRead(id: string): Promise<{ ok: boolean }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false }

  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("read_at", null)

  if (error) return { ok: false }
  revalidatePath("/")
  return { ok: true }
}

export async function markAllRead(): Promise<{ ok: boolean }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false }

  await supabaseAdmin
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null)

  revalidatePath("/")
  return { ok: true }
}

/**
 * Server-side helper for cron + agent flows. Idempotent via data.dedup_key
 * (unique partial index on (user_id, type, dedup_key)). Honors per-user
 * notification prefs — silently returns { inserted: false } when the user
 * has opted out of this notification type.
 */
export async function createNotification(params: {
  userId: string
  type: NotificationType
  title: string
  body?: string
  link?: string
  data?: Record<string, unknown>
  dedupKey?: string
}): Promise<{ inserted: boolean; id?: string }> {
  // Respect user prefs — opt-outs make this a no-op without raising
  try {
    const prefs = await getPrefsForUser(params.userId)
    if (!shouldNotify(prefs, params.type)) {
      return { inserted: false }
    }
  } catch (err) {
    // Don't block notifications on a prefs read failure — fail open
    console.error("createNotification prefs read failed:", err)
  }

  const data = { ...(params.data ?? {}) }
  if (params.dedupKey) data.dedup_key = params.dedupKey

  const { data: row, error } = await supabaseAdmin
    .from("notifications")
    .insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      link: params.link ?? null,
      data,
    })
    .select("id")
    .single()

  if (error) {
    // unique violation = already created (dedup hit) → not an error
    if (error.code === "23505") return { inserted: false }
    console.error("createNotification error:", error)
    return { inserted: false }
  }
  return { inserted: true, id: row.id as string }
}

// ── Preference management ────────────────────────────────────────────────

export async function getMyNotificationPrefs(): Promise<NotificationPrefs> {
  const user = await getCurrentUser()
  if (!user) return DEFAULT_PREFS
  return getPrefsForUser(user.id)
}

export async function saveNotificationPrefs(
  prefs: Partial<NotificationPrefs>
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "unauthorized" }

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("applicant_data")
    .eq("id", user.id)
    .maybeSingle()

  const cur = (data?.applicant_data as Record<string, unknown> | null) ?? {}
  const next = mergePrefs({
    ...((cur._notification_prefs as Partial<NotificationPrefs> | undefined) ?? {}),
    ...prefs,
  })

  const merged = { ...cur, _notification_prefs: next }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ applicant_data: merged })
    .eq("id", user.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath("/settings")
  return { ok: true }
}

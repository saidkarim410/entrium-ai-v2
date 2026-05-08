"use server"

import { revalidatePath } from "next/cache"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/supabase/server"
import type { Notification, NotificationType } from "./types"

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
 * (unique partial index on (user_id, type, dedup_key)).
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

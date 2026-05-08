"use server"

import { revalidatePath } from "next/cache"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/supabase/server"
import { generateLinkCode } from "@/lib/telegram"

export type TelegramStatus = {
  connected: boolean
  username: string | null
  pendingCode: string | null
  pendingExpiresAt: string | null
}

export async function getTelegramStatus(): Promise<TelegramStatus> {
  const user = await getCurrentUser()
  if (!user) {
    return { connected: false, username: null, pendingCode: null, pendingExpiresAt: null }
  }

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("telegram_chat_id, telegram_username, telegram_link_code, telegram_link_expires")
    .eq("id", user.id)
    .maybeSingle()

  return {
    connected: Boolean(data?.telegram_chat_id),
    username: data?.telegram_username ?? null,
    pendingCode: data?.telegram_link_code ?? null,
    pendingExpiresAt: data?.telegram_link_expires ?? null,
  }
}

export async function createTelegramLinkCode(): Promise<{ ok: boolean; code?: string; error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "unauthorized" }

  const code = generateLinkCode()
  const expires = new Date(Date.now() + 30 * 60 * 1000) // 30 min

  // Best-effort: code is unique with high probability; if collision, retry once.
  let attempt = 0
  let lastErr: string | undefined
  while (attempt < 3) {
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        telegram_link_code: code,
        telegram_link_expires: expires.toISOString(),
      })
      .eq("id", user.id)

    if (!error) {
      revalidatePath("/settings")
      return { ok: true, code }
    }
    lastErr = error.message
    attempt++
  }
  return { ok: false, error: lastErr ?? "could_not_create" }
}

export async function unlinkTelegram(): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "unauthorized" }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      telegram_chat_id: null,
      telegram_username: null,
      telegram_link_code: null,
      telegram_link_expires: null,
    })
    .eq("id", user.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath("/settings")
  return { ok: true }
}

"use server"

import { revalidatePath } from "next/cache"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { env, telegramEnabled } from "@/lib/env"
import { getCurrentAdmin } from "@/lib/admin/auth"

export type BroadcastResult =
  | { ok: true; sent: number; failed: number; tier: string }
  | { ok: false; error: string }

// Admin → Telegram fan-out. Iterates over profiles with a linked
// telegram_chat_id, sends one message per chat, returns counts.
export async function sendBroadcast(formData: FormData): Promise<BroadcastResult> {
  const admin = await getCurrentAdmin()
  if (!admin) return { ok: false, error: "forbidden" }

  const message = String(formData.get("message") ?? "").trim()
  const tier = String(formData.get("tier") ?? "all")

  if (!message) return { ok: false, error: "Сообщение пустое" }
  if (message.length > 4000) return { ok: false, error: "Сообщение слишком длинное (макс 4000 символов)" }
  if (!telegramEnabled()) return { ok: false, error: "TELEGRAM_BOT_TOKEN не настроен" }

  let query = supabaseAdmin
    .from("profiles")
    .select("id, telegram_chat_id")
    .not("telegram_chat_id", "is", null)

  if (tier === "pro" || tier === "free") query = query.eq("tier", tier)

  const { data: recipients, error } = await query
  if (error) return { ok: false, error: error.message }

  let sent = 0
  let failed = 0
  for (const r of recipients ?? []) {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            chat_id: r.telegram_chat_id,
            text: message,
            parse_mode: "HTML",
            disable_web_page_preview: true,
          }),
        },
      )
      if (res.ok) sent += 1
      else failed += 1
    } catch {
      failed += 1
    }
  }

  // Audit log
  await supabaseAdmin.from("audit_logs").insert({
    actor_id: admin.id,
    action: "broadcast.telegram",
    target_table: "profiles",
    details: {
      tier,
      message_preview: message.slice(0, 200),
      recipients: recipients?.length ?? 0,
      sent,
      failed,
    },
  })

  revalidatePath("/admin/broadcasts")
  return { ok: true, sent, failed, tier }
}

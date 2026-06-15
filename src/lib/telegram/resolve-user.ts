import { supabaseAdmin } from "@/lib/supabase/admin"
import type { TelegramUser } from "./init-data"

export type ResolvedTgUser = {
  userId: string
  tier: "free" | "pro"
  applicantData: unknown | null
  language: string
}

const COLS = "id, tier, applicant_data, language, telegram_user_id, telegram_chat_id"

export async function resolveTelegramUser(tg: TelegramUser): Promise<ResolvedTgUser> {
  const tgId = tg.id

  // 1) Already linked by stable telegram_user_id.
  const byUserId = await supabaseAdmin
    .from("profiles").select(COLS).eq("telegram_user_id", tgId).maybeSingle()
  if (byUserId.error) throw new Error(`tg_lookup_failed: ${byUserId.error.message}`)
  let profile = byUserId.data

  // 2) Legacy link: bot DM flow stored telegram_chat_id == user id (private chats).
  if (!profile) {
    const byChat = await supabaseAdmin
      .from("profiles").select(COLS).eq("telegram_chat_id", String(tgId)).maybeSingle()
    if (byChat.error) throw new Error(`tg_lookup_failed: ${byChat.error.message}`)
    profile = byChat.data
    if (profile) {
      await supabaseAdmin.from("profiles").update({ telegram_user_id: tgId }).eq("id", profile.id as string)
    }
  }

  // 3) First-ever launch: provision an auth user (trigger creates the profile row).
  if (!profile) {
    const fullName =
      [tg.first_name, tg.last_name].filter(Boolean).join(" ") || tg.username || `tg${tgId}`
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: `tg${tgId}@telegram.entrium.local`,
      email_confirm: true,
      user_metadata: { full_name: fullName, telegram_user_id: tgId },
    })
    if (error || !created?.user) {
      // Concurrent first launch (e.g. a double-tap): another request may have just
      // created this user, which would fail the unique-email constraint here.
      // Re-check before failing so the loser of the race still gets a session.
      const retry = await supabaseAdmin
        .from("profiles").select(COLS).eq("telegram_user_id", tgId).maybeSingle()
      if (!retry.data) {
        throw new Error(`tg_provision_failed: ${error?.message ?? "no user returned"}`)
      }
      profile = retry.data
    } else {
      const userId = created.user.id
      await supabaseAdmin
        .from("profiles")
        .update({ telegram_user_id: tgId, telegram_username: tg.username ?? null })
        .eq("id", userId)
      return { userId, tier: "free", applicantData: null, language: "ru" }
    }
  }

  return {
    userId: profile.id as string,
    tier: (profile.tier as "free" | "pro") ?? "free",
    applicantData: profile.applicant_data ?? null,
    language: (profile.language as string) ?? "ru",
  }
}

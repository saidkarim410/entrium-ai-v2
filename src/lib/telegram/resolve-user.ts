import { supabaseAdmin } from "@/lib/supabase/admin"
import type { TelegramUser } from "./init-data"

export type ResolvedTgUser = {
  userId: string
  tier: "free" | "pro"
  applicantData: unknown | null
  language: string
}

const COLS = "id, tier, applicant_data, language, telegram_chat_id"

export async function resolveTelegramUser(tg: TelegramUser): Promise<ResolvedTgUser> {
  // In a private chat with the bot, the Telegram chat id equals the user id, and
  // the bot DM flow already stores it in `telegram_chat_id`. We key on that
  // existing column so the Mini App and the bot share one identity — and no new
  // migration is required.
  const tgChatId = String(tg.id)

  const found = await supabaseAdmin
    .from("profiles").select(COLS).eq("telegram_chat_id", tgChatId).maybeSingle()
  if (found.error) throw new Error(`tg_lookup_failed: ${found.error.message}`)
  let profile = found.data

  // First-ever launch: provision an auth user (the trigger creates the profile row).
  if (!profile) {
    const fullName =
      [tg.first_name, tg.last_name].filter(Boolean).join(" ") || tg.username || `tg${tgChatId}`
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: `tg${tgChatId}@telegram.entrium.local`,
      email_confirm: true,
      user_metadata: { full_name: fullName, telegram_chat_id: tgChatId },
    })
    if (error || !created?.user) {
      // Concurrent first launch (e.g. a double-tap): another request may have just
      // created this user, which would fail the unique-email constraint here.
      // Re-check before failing so the loser of the race still gets a session.
      const retry = await supabaseAdmin
        .from("profiles").select(COLS).eq("telegram_chat_id", tgChatId).maybeSingle()
      if (!retry.data) {
        throw new Error(`tg_provision_failed: ${error?.message ?? "no user returned"}`)
      }
      profile = retry.data
    } else {
      const userId = created.user.id
      await supabaseAdmin
        .from("profiles")
        .update({ telegram_chat_id: tgChatId, telegram_username: tg.username ?? null })
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

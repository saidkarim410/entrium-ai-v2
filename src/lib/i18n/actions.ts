"use server"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/supabase/server"
import { LOCALES, type Locale } from "./dict"

/**
 * Persist the user's chosen UI language to entrium.profiles.language.
 * Called from <LangSwitcher /> when a logged-in user picks a language so
 * Telegram bot replies and email digests respect the same preference.
 *
 * No-op for unauthenticated users — the cookie alone drives them.
 */
export async function persistUserLanguage(locale: string): Promise<{ ok: boolean }> {
  if (!(LOCALES as readonly string[]).includes(locale)) {
    return { ok: false }
  }
  const user = await getCurrentUser()
  if (!user) return { ok: false }

  await supabaseAdmin
    .from("profiles")
    .update({ language: locale as Locale })
    .eq("id", user.id)

  return { ok: true }
}

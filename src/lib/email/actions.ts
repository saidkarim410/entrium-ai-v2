"use server"

import { revalidatePath } from "next/cache"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/supabase/server"

export type EmailPrefs = {
  digestEnabled: boolean
  lastSentAt: string | null
}

export async function getEmailPrefs(): Promise<EmailPrefs> {
  const user = await getCurrentUser()
  if (!user) return { digestEnabled: false, lastSentAt: null }

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("email_digest_enabled, email_digest_sent_at")
    .eq("id", user.id)
    .maybeSingle()

  return {
    digestEnabled: Boolean(data?.email_digest_enabled),
    lastSentAt: (data?.email_digest_sent_at as string | null) ?? null,
  }
}

export async function setEmailDigestEnabled(enabled: boolean): Promise<{ ok: boolean }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false }

  await supabaseAdmin
    .from("profiles")
    .update({ email_digest_enabled: enabled })
    .eq("id", user.id)

  revalidatePath("/settings")
  return { ok: true }
}

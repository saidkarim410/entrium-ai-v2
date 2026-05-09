import { supabaseAdmin } from "@/lib/supabase/admin"
import type { NotificationType } from "./types"

/**
 * Per-user notification preferences. Stored under
 * applicant_data._notification_prefs to avoid a schema migration.
 */
export type NotificationPrefs = {
  deadline: boolean
  tip: boolean
  system: boolean
  agent_done: boolean
  referral: boolean
  /** Telegram push opt-out (in-app bell still fires) */
  telegramPush: boolean
  /** "HH:MM" 24h. If both set, no Telegram push during this window. */
  quietHoursStart: string | null
  quietHoursEnd: string | null
}

export const DEFAULT_PREFS: NotificationPrefs = {
  deadline: true,
  tip: true,
  system: true,
  agent_done: true,
  referral: true,
  telegramPush: true,
  quietHoursStart: null,
  quietHoursEnd: null,
}

export function mergePrefs(stored: Partial<NotificationPrefs> | null | undefined): NotificationPrefs {
  return { ...DEFAULT_PREFS, ...(stored ?? {}) }
}

/**
 * Read prefs server-side. Used by createNotification + cron pushes.
 * Default to "all on" when no user data yet.
 */
export async function getPrefsForUser(userId: string): Promise<NotificationPrefs> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("applicant_data")
    .eq("id", userId)
    .maybeSingle()

  const stored = (data?.applicant_data as { _notification_prefs?: Partial<NotificationPrefs> } | null)
    ?._notification_prefs
  return mergePrefs(stored)
}

/** Should we create an in-app notification of this type? */
export function shouldNotify(prefs: NotificationPrefs, type: NotificationType): boolean {
  return prefs[type] !== false
}

/** Should we push to Telegram now? Returns false if in quiet hours. */
export function shouldPushTelegramNow(prefs: NotificationPrefs, now = new Date()): boolean {
  if (!prefs.telegramPush) return false
  if (!prefs.quietHoursStart || !prefs.quietHoursEnd) return true

  const cur = now.getHours() * 60 + now.getMinutes()
  const start = parseHM(prefs.quietHoursStart)
  const end = parseHM(prefs.quietHoursEnd)
  if (start === null || end === null) return true

  // Window doesn't wrap (e.g. 12:00 → 14:00)
  if (start < end) return !(cur >= start && cur < end)
  // Wraps overnight (e.g. 22:00 → 08:00)
  return !(cur >= start || cur < end)
}

function parseHM(s: string): number | null {
  const m = s.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const h = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

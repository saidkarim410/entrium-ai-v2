import { supabaseAdmin } from "@/lib/supabase/admin"
import { denyIfNotCron } from "@/lib/cron-auth"
import { createNotification } from "@/lib/notifications/actions"
import { mergePrefs, shouldPushTelegramNow, type NotificationPrefs } from "@/lib/notifications/prefs"
import { sendStudentReminder } from "@/lib/telegram"
import { suggestNextStep } from "@/lib/reminders/next-step"
import type { Application } from "@/lib/applications/types"

export const runtime = "nodejs"
export const maxDuration = 60
export const dynamic = "force-dynamic"

const DAY = 86_400_000
const BUCKETS = [3, 7] as const
const PAGE = 1000
const MAX_PAGES = 50

type Stats = { candidates: number; queued: number; telegram: number; errors: number }

/**
 * Vercel Cron — daily. "Come back" nudge for students who went quiet.
 * vercel.json: { "path": "/api/cron/inactive-nudge", "schedule": "0 10 * * *" }
 *
 * A student lands in the N-day bucket when their most recent AI activity
 * (usage_events) was exactly N days ago: active in [now-(N+1)d, now-Nd) and
 * NOT active since now-Nd. Buckets 3 and 7 fire once each (dedup keyed by
 * bucket + month), then we stop nagging.
 *
 * We page the 1-day candidate window fully (so a busy day can't silently
 * truncate the set) and test "still active?" per candidate — never fetching
 * the whole recently-active population, which is large and, if truncated,
 * would turn a returning user into a false "inactive" nudge.
 */
export async function GET(req: Request) {
  const denied = denyIfNotCron(req)
  if (denied) return denied

  const now = Date.now()
  const stats: Stats = { candidates: 0, queued: 0, telegram: 0, errors: 0 }
  const monthKey = new Date(now).toISOString().slice(0, 7) // YYYY-MM

  for (const bucket of BUCKETS) {
    const windowStart = new Date(now - (bucket + 1) * DAY).toISOString()
    const windowEnd = new Date(now - bucket * DAY).toISOString()

    const candidates = await usersActiveInWindow(windowStart, windowEnd)
    stats.candidates += candidates.length

    for (const userId of candidates) {
      try {
        if (await hasActivitySince(userId, windowEnd)) continue // came back already
        await nudgeUser(userId, bucket, monthKey, stats)
      } catch (err) {
        stats.errors++
        console.error("inactive-nudge user error:", userId, err)
      }
    }
  }

  return Response.json({ ok: true, ...stats })
}

async function nudgeUser(userId: string, bucket: number, monthKey: string, stats: Stats): Promise<void> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("telegram_chat_id, applicant_data")
    .eq("id", userId)
    .maybeSingle()

  if (!profile?.telegram_chat_id) return

  const completed = Boolean((profile.applicant_data as { _completed?: boolean } | null)?._completed)

  const { data: appsRows } = await supabaseAdmin
    .from("applications")
    .select("*")
    .eq("user_id", userId)
  const next = suggestNextStep({ apps: (appsRows ?? []) as Application[], completed })

  const title = bucket >= 7 ? "Целая неделя без тебя 🚀" : "Не пропадай — продолжим? 👋"
  const intro =
    bucket >= 7
      ? "Поступление не ждёт, но всё ещё можно нагнать."
      : "Ты уже начал — давай не бросать на полпути."

  const r = await createNotification({
    userId,
    type: "tip",
    title,
    body: `${intro} ${next.text}`,
    link: toRelative(next.href),
    data: { reminder: "inactive", days: bucket },
    dedupKey: `inactive:${userId}:d${bucket}:${monthKey}`,
  })
  if (!r.inserted) return // deduped or opted out of in-app tips
  stats.queued++

  const prefs = readPrefs(profile.applicant_data)
  if (shouldPushTelegramNow(prefs)) {
    const text = `<b>${escapeTg(title)}</b>\n${escapeTg(intro)} ${escapeTg(next.text)}\n\n→ ${next.href}`
    const res = await sendStudentReminder(profile.telegram_chat_id, text)
    if (res.ok) stats.telegram++
    else stats.errors++
  }
}

/** Distinct user ids with a usage_event in [startIso, endIso). Paged fully. */
async function usersActiveInWindow(startIso: string, endIso: string): Promise<string[]> {
  const ids = new Set<string>()
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE
    const { data, error } = await supabaseAdmin
      .from("usage_events")
      .select("user_id")
      .gte("created_at", startIso)
      .lt("created_at", endIso)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE - 1)
    if (error || !data || data.length === 0) break
    for (const row of data) ids.add(row.user_id as string)
    if (data.length < PAGE) break
    if (page === MAX_PAGES - 1) {
      console.warn(`inactive-nudge: window ${startIso}..${endIso} exceeded ${MAX_PAGES * PAGE} rows — some candidates skipped`)
    }
  }
  return [...ids]
}

/** Does the user have any usage_event at or after `sinceIso`? (cheap count, no rows) */
async function hasActivitySince(userId: string, sinceIso: string): Promise<boolean> {
  const { count } = await supabaseAdmin
    .from("usage_events")
    .select("user_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", sinceIso)
  return (count ?? 0) > 0
}

function readPrefs(applicantData: unknown): NotificationPrefs {
  return mergePrefs(
    (applicantData as { _notification_prefs?: Partial<NotificationPrefs> } | null)?._notification_prefs
  )
}

function toRelative(href: string): string {
  return href.replace(/^https?:\/\/[^/]+/, "") || "/dashboard"
}

function escapeTg(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

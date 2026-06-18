import { supabaseAdmin } from "@/lib/supabase/admin"
import { denyIfNotCron } from "@/lib/cron-auth"
import { createNotification } from "@/lib/notifications/actions"
import { mergePrefs, shouldPushTelegramNow, type NotificationPrefs } from "@/lib/notifications/prefs"
import { sendStudentReminder } from "@/lib/telegram"
import { suggestNextStep } from "@/lib/reminders/next-step"
import { daysUntil, type Application, type AppStatus } from "@/lib/applications/types"

export const runtime = "nodejs"
export const maxDuration = 300
export const dynamic = "force-dynamic"

const ACTIVE: AppStatus[] = ["planning", "in_progress", "interview"]
const WEEK_MS = 7 * 86_400_000

type Stats = { eligible: number; queued: number; telegram: number; skipped: number; errors: number }

/**
 * Vercel Cron — Sundays. Weekly progress digest to students via Telegram.
 * vercel.json: { "path": "/api/cron/weekly-progress", "schedule": "0 15 * * 0" }
 *
 * Complements the existing EMAIL weekly-digest: this one pushes a short progress
 * recap to the student bot (@entriumcouselorbot) for users who linked Telegram.
 */
export async function GET(req: Request) {
  const denied = denyIfNotCron(req)
  if (denied) return denied

  const now = Date.now()
  const weekKey = new Date(now).toISOString().slice(0, 10)
  const weekAgo = new Date(now - WEEK_MS).toISOString()
  const stats: Stats = { eligible: 0, queued: 0, telegram: 0, skipped: 0, errors: 0 }

  const { data: profiles, error } = await supabaseAdmin
    .from("profiles")
    .select("id, telegram_chat_id, applicant_data")
    .not("telegram_chat_id", "is", null)
    .limit(2000)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  stats.eligible = (profiles ?? []).length
  if (stats.eligible >= 2000) {
    console.warn("weekly-progress: hit 2000-profile cap — add pagination above this many linked users")
  }

  for (const profile of profiles ?? []) {
    try {
      const userId = profile.id as string
      const chatId = profile.telegram_chat_id as string

      const completed = Boolean((profile.applicant_data as { _completed?: boolean } | null)?._completed)
      if (!completed) {
        stats.skipped++
        continue
      }

      const { data: appsRows } = await supabaseAdmin
        .from("applications")
        .select("*")
        .eq("user_id", userId)
      const apps = (appsRows ?? []) as Application[]
      const active = apps.filter((a) => ACTIVE.includes(a.status))

      const { count: weekRuns } = await supabaseAdmin
        .from("usage_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", weekAgo)

      // Nothing meaningful to report — don't ping an empty week.
      if (active.length === 0 && (weekRuns ?? 0) === 0) {
        stats.skipped++
        continue
      }

      const next = suggestNextStep({ apps, completed })

      const upcoming = active
        .map((a) => ({ a, days: daysUntil(a.deadline) }))
        .filter((x): x is { a: Application; days: number } => x.days !== null && x.days >= 0)
        .sort((x, y) => x.days - y.days)[0]

      const lines = [
        "<b>📊 Итоги недели</b>",
        `За неделю: <b>${weekRuns ?? 0}</b> запусков AI · <b>${active.length}</b> вузов в работе`,
      ]
      if (upcoming) {
        lines.push(
          upcoming.days === 0
            ? `🔥 Дедлайн ${escapeTg(upcoming.a.university_name)} — сегодня!`
            : `⏰ Ближайший дедлайн: ${escapeTg(upcoming.a.university_name)} — через ${upcoming.days} дн.`
        )
      }
      lines.push("", `Дальше: ${escapeTg(next.text)}`, `→ ${next.href}`)

      const r = await createNotification({
        userId,
        type: "tip",
        title: "📊 Итоги недели",
        body: `${weekRuns ?? 0} запусков AI · ${active.length} вузов в работе. ${next.text}`,
        link: toRelative(next.href),
        data: { reminder: "weekly", week: weekKey },
        dedupKey: `weekly:${userId}:${weekKey}`,
      })
      if (!r.inserted) {
        stats.skipped++
        continue
      }
      stats.queued++

      const prefs = readPrefs(profile.applicant_data)
      if (shouldPushTelegramNow(prefs)) {
        const res = await sendStudentReminder(chatId, lines.join("\n"))
        if (res.ok) stats.telegram++
        else stats.errors++
      }
    } catch (err) {
      stats.errors++
      console.error("weekly-progress user error:", err)
    }
  }

  return Response.json({ ok: true, ...stats })
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

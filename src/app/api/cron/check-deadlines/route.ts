import { supabaseAdmin } from "@/lib/supabase/admin"
import { createNotification } from "@/lib/notifications/actions"
import { sendTelegramMessage } from "@/lib/telegram"
import { telegramEnabled } from "@/lib/env"
import type { Application } from "@/lib/applications/types"

export const runtime = "nodejs"
export const maxDuration = 60
export const dynamic = "force-dynamic"

/** Deadline thresholds (days out) that trigger a reminder */
const THRESHOLDS = [30, 14, 7, 3, 1, 0] as const

/**
 * Vercel Cron job — runs daily.
 * Add to vercel.json:
 *   { "crons": [{ "path": "/api/cron/check-deadlines", "schedule": "0 9 * * *" }] }
 *
 * Auth via CRON_SECRET (Vercel automatically sends it as Authorization: Bearer).
 */
export async function GET(req: Request) {
  // Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get("authorization")
    if (auth !== `Bearer ${cronSecret}`) {
      return Response.json({ error: "unauthorized" }, { status: 401 })
    }
  }

  const today = todayUTC()
  const stats = { scanned: 0, queued: 0, telegram: 0, errors: 0 }

  // Fetch all applications with future deadlines (next 31 days, active statuses)
  const { data: apps, error } = await supabaseAdmin
    .from("applications")
    .select("*")
    .not("deadline", "is", null)
    .gte("deadline", today.toISOString().slice(0, 10))
    .lte("deadline", addDays(today, 30).toISOString().slice(0, 10))
    .in("status", ["planning", "in_progress", "interview"])

  if (error) {
    console.error("cron: list apps failed:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }

  const list = (apps ?? []) as Application[]
  stats.scanned = list.length

  // Group by user for batched Telegram pushes
  const byUser = new Map<string, Application[]>()
  for (const a of list) {
    const arr = byUser.get(a.user_id) ?? []
    arr.push(a)
    byUser.set(a.user_id, arr)
  }

  for (const [userId, userApps] of byUser) {
    const tgPushes: string[] = []

    for (const a of userApps) {
      if (!a.deadline) continue
      const days = daysUntilUTC(today, a.deadline)
      if (!THRESHOLDS.includes(days as (typeof THRESHOLDS)[number])) continue

      const dedupKey = `app:${a.id}:d${days}`
      const title = days === 0
        ? `🔥 Дедлайн сегодня: ${a.university_name}`
        : days === 1
          ? `⏰ Дедлайн завтра: ${a.university_name}`
          : `📅 Дедлайн через ${days} дн.: ${a.university_name}`
      const body =
        days <= 3
          ? "Финальный спринт. Запусти Reviewer и проверь чек-лист."
          : days <= 7
            ? "Время финализировать эссе и собрать рекомендации."
            : days <= 14
              ? "Две недели — самый продуктивный период. Делай по 1 разделу в день."
              : "Месяц до дедлайна — отличное время для финального ревью эссе."

      const r = await createNotification({
        userId,
        type: "deadline",
        title,
        body,
        link: "/applications",
        data: { application_id: a.id, days_out: days },
        dedupKey,
      })
      if (r.inserted) {
        stats.queued++
        tgPushes.push(`<b>${escapeTg(title)}</b>\n${escapeTg(body)}`)
      }
    }

    // Push to Telegram if linked
    if (tgPushes.length && telegramEnabled()) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("telegram_chat_id")
        .eq("id", userId)
        .maybeSingle()

      if (profile?.telegram_chat_id) {
        const text =
          tgPushes.length === 1
            ? tgPushes[0]
            : "<b>Напоминание о заявках</b>\n\n" + tgPushes.join("\n\n")
        const res = await sendTelegramMessage(profile.telegram_chat_id, text + "\n\n→ https://entrium-ai-v2.vercel.app/applications")
        if (res.ok) stats.telegram++
        else stats.errors++
      }
    }
  }

  return Response.json({ ok: true, ...stats })
}

// ── Date helpers (UTC-only to avoid TZ drift) ─────────────────────────────

function todayUTC(): Date {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000)
}

function daysUntilUTC(today: Date, iso: string): number {
  const target = new Date(iso + "T00:00:00Z")
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

function escapeTg(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

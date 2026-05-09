import { z } from "zod"
import { getCurrentProfile } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { sendEmail, signToken } from "@/lib/email"
import { weeklyDigestHtml, weeklyDigestSubject, type WeeklyDigestData } from "@/lib/email/templates"
import { emailEnabled, env } from "@/lib/env"
import type { Locale } from "@/lib/i18n/dict"
import { listApplications } from "@/lib/applications/actions"
import { daysUntil, STATUS_LABELS, type AppStatus } from "@/lib/applications/types"

export const runtime = "nodejs"
export const maxDuration = 30

const Body = z.object({
  to: z.string().email().optional(),
})

const SITE = (env.NEXT_PUBLIC_SITE_URL ?? "https://entrium-ai-v2.vercel.app").replace(/\/$/, "")

/**
 * POST /api/email/test — sends a one-off weekly digest email to the caller
 * (or to a different verified address if `to` is provided in the body).
 *
 * Used by /settings → "Test send" button. Useful for verifying Resend
 * delivery + SPF/DKIM after first-time setup.
 */
export async function POST(req: Request) {
  if (!emailEnabled()) {
    return Response.json(
      {
        error: "email_not_configured",
        message:
          "RESEND_API_KEY не задан. Добавь в Vercel env, и эта кнопка заработает. " +
          "До настройки можно посмотреть, как письмо выглядит, на /admin/email-preview.",
      },
      { status: 503 }
    )
  }

  const profile = await getCurrentProfile()
  if (!profile) return Response.json({ error: "unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = Body.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "invalid_input" }, { status: 400 })
  }

  // Default recipient = current user's email; override only allowed if same domain
  const to = parsed.data.to ?? profile.email
  if (!to) return Response.json({ error: "no_recipient" }, { status: 400 })

  // Build a real digest for THIS user — same logic as the cron, just with
  // best-effort (works even if user has no apps yet)
  const apps = await listApplications().catch(() => [])
  const upcoming = apps
    .filter((a) => a.deadline && ["planning", "in_progress", "interview"].includes(a.status as AppStatus))
    .map((a) => ({
      university: a.university_name,
      status: STATUS_LABELS[a.status as AppStatus] ?? a.status,
      daysOut: daysUntil(a.deadline),
      deadline: a.deadline,
    }))
    .filter((a) => a.daysOut !== null && a.daysOut >= -1)
    .sort((a, b) => (a.daysOut ?? 999) - (b.daysOut ?? 999))
    .slice(0, 5)

  const { count: unreadNotifs = 0 } = await supabaseAdmin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .is("read_at", null)

  const data: WeeklyDigestData = {
    firstName: profile.full_name?.split(" ")[0] ?? "Friend",
    appsCount: apps.length,
    upcomingApps: upcoming,
    unreadNotifs: unreadNotifs ?? 0,
    weekRunCount: 0,
    topRecommendation: {
      title: "Открой Dashboard",
      reason: "Это тестовое письмо — реальный дайджест приходит каждое воскресенье.",
      href: `${SITE}/dashboard`,
    },
    unsubscribeUrl: `${SITE}/api/email/unsubscribe?token=${signToken(profile.id, "unsubscribe")}`,
    siteUrl: SITE,
  }

  const lang: Locale = (profile.language as Locale | null) ?? "ru"
  const subject = "[TEST] " + weeklyDigestSubject(data, lang)
  const html = weeklyDigestHtml(data, lang)

  const r = await sendEmail({ to, subject, html })

  if (!r.ok) {
    return Response.json({ error: "send_failed", message: r.error ?? "Resend rejected" }, { status: 502 })
  }

  return Response.json({ ok: true, id: r.id, to })
}

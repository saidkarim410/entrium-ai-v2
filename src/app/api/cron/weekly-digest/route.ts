import { supabaseAdmin } from "@/lib/supabase/admin"
import { sendEmail, signToken } from "@/lib/email"
import { weeklyDigestHtml, weeklyDigestSubject, type WeeklyDigestData } from "@/lib/email/templates"
import { emailEnabled, env } from "@/lib/env"
import type { Locale } from "@/lib/i18n/dict"
import {
  daysUntil,
  STATUS_LABELS,
  type Application,
  type AppStatus,
} from "@/lib/applications/types"

export const runtime = "nodejs"
export const maxDuration = 300
export const dynamic = "force-dynamic"

const SITE = (env.NEXT_PUBLIC_SITE_URL ?? "https://entrium-ai-v2.vercel.app").replace(/\/$/, "")

/**
 * Vercel Cron — runs Sundays at 18:00 UTC (Sunday evening for users in EU/RU).
 * vercel.json: { "path": "/api/cron/weekly-digest", "schedule": "0 18 * * 0" }
 *
 * Iterates users with email_digest_enabled=true, builds personalized digest,
 * sends via Resend. No-op if RESEND_API_KEY is missing.
 */
export async function GET(req: Request) {
  if (!emailEnabled()) {
    return Response.json({ skipped: "email_disabled" })
  }

  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get("authorization")
    if (auth !== `Bearer ${cronSecret}`) {
      return Response.json({ error: "unauthorized" }, { status: 401 })
    }
  }

  const stats = { eligible: 0, sent: 0, skipped: 0, errors: 0 }

  // Pull all opted-in profiles
  const { data: profiles, error } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, language, email_digest_enabled, applicant_data")
    .eq("email_digest_enabled", true)
    .not("email", "is", null)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  stats.eligible = (profiles ?? []).length

  // Compute "this week" stats once per user
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  for (const profile of profiles ?? []) {
    try {
      const userId = profile.id as string
      const email = profile.email as string

      // Don't email users who haven't completed onboarding (no real value yet)
      const completed = Boolean(
        (profile.applicant_data as { _completed?: boolean } | null)?._completed
      )
      if (!completed) {
        stats.skipped++
        continue
      }

      // Apps + counts
      const { data: appsRows } = await supabaseAdmin
        .from("applications")
        .select("*")
        .eq("user_id", userId)

      const apps = (appsRows ?? []) as Application[]
      const activeApps = apps.filter((a) =>
        ["planning", "in_progress", "interview"].includes(a.status as AppStatus)
      )

      // Skip if user has no engagement at all and no apps
      const { count: weekRunCount = 0 } = await supabaseAdmin
        .from("tool_runs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", weekAgo)

      if (activeApps.length === 0 && (weekRunCount ?? 0) === 0) {
        stats.skipped++
        continue
      }

      const { count: unreadNotifs = 0 } = await supabaseAdmin
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("read_at", null)

      // Pick top 5 upcoming deadlines
      const upcomingApps = activeApps
        .filter((a) => a.deadline)
        .map((a) => ({
          university: a.university_name,
          status: STATUS_LABELS[a.status as AppStatus] ?? a.status,
          daysOut: daysUntil(a.deadline),
          deadline: a.deadline,
        }))
        .filter((a) => a.daysOut !== null && a.daysOut >= -1) // include just-passed
        .sort((a, b) => (a.daysOut ?? 999) - (b.daysOut ?? 999))
        .slice(0, 5)

      const recommendation = pickRecommendation(activeApps, upcomingApps)
      const lang = (profile.language as Locale | null) ?? "ru"
      const firstName = ((profile.full_name as string | null) ?? email).split(" ")[0]

      const data: WeeklyDigestData = {
        firstName,
        appsCount: activeApps.length,
        upcomingApps,
        unreadNotifs: unreadNotifs ?? 0,
        weekRunCount: weekRunCount ?? 0,
        topRecommendation: recommendation,
        unsubscribeUrl: `${SITE}/api/email/unsubscribe?token=${signToken(userId, "unsubscribe")}`,
        siteUrl: SITE,
      }

      const subject = weeklyDigestSubject(data, lang)
      const html = weeklyDigestHtml(data, lang)
      const r = await sendEmail({ to: email, subject, html })

      if (r.ok) {
        stats.sent++
        await supabaseAdmin
          .from("profiles")
          .update({ email_digest_sent_at: new Date().toISOString() })
          .eq("id", userId)
      } else {
        stats.errors++
        console.error(`digest send failed for ${email}:`, r.error)
      }
    } catch (err) {
      stats.errors++
      console.error("digest user error:", err)
    }
  }

  return Response.json({ ok: true, ...stats })
}

function pickRecommendation(
  activeApps: Application[],
  upcoming: Array<{ daysOut: number | null; university: string }>
): { title: string; href: string; reason: string } {
  // Closest urgent deadline → reviewer
  const urgent = upcoming.find((a) => (a.daysOut ?? 999) <= 14 && (a.daysOut ?? -1) >= 0)
  if (urgent) {
    return {
      title: `Run final review for ${urgent.university}`,
      reason: `Deadline ${urgent.daysOut === 0 ? "is today" : `is in ${urgent.daysOut} days`}. AI Reviewer will surface last-minute issues an admission officer would catch.`,
      href: `${SITE}/tools/reviewer`,
    }
  }
  // Few apps → run agent for full package
  if (activeApps.length < 3) {
    return {
      title: "Run AI Agent · Full admission package",
      reason: "Most strong applicants apply to 8–12 schools. Let Agent analyze your odds, pick a target list, find scholarships, and build a roadmap in one shot.",
      href: `${SITE}/agent`,
    }
  }
  // Default: open dashboard
  return {
    title: "Check your dashboard",
    reason: "See your focus card and any AI-flagged risks across active applications.",
    href: `${SITE}/dashboard`,
  }
}

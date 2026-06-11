import { supabaseAdmin } from "@/lib/supabase/admin"
import { denyIfNotCron } from "@/lib/cron-auth"
import { generateForUser } from "@/app/api/daily-summary/route"
import { checkUsage } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const maxDuration = 300
export const dynamic = "force-dynamic"

/**
 * Daily summary pre-warm cron — Vercel runs at 06:00 UTC.
 * Generates a focus-card summary for every user with completed onboarding +
 * at least 1 application, so /dashboard renders the card instantly without
 * making the user wait for an AI call.
 *
 * vercel.json: { "path": "/api/cron/daily-summary", "schedule": "0 6 * * *" }
 */
export async function GET(req: Request) {
  const denied = denyIfNotCron(req)
  if (denied) return denied

  const stats = { eligible: 0, generated: 0, skipped: 0, errors: 0 }

  // Eligible users: completed onboarding + at least 1 application
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, applicant_data")

  for (const p of profiles ?? []) {
    const completed = Boolean(
      (p.applicant_data as { _completed?: boolean } | null)?._completed
    )
    if (!completed) {
      stats.skipped++
      continue
    }

    // Has at least 1 app?
    const { count } = await supabaseAdmin
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", p.id as string)
    if (!count) {
      stats.skipped++
      continue
    }

    stats.eligible++

    try {
      // Skip users at limit — don't burn their daily quota on background gen
      const usage = await checkUsage(p.id as string)
      if (!usage.allowed) {
        stats.skipped++
        continue
      }
      const summary = await generateForUser(p.id as string, usage.tier)
      if (summary) stats.generated++
      else stats.skipped++
    } catch (err) {
      console.error("daily-summary cron err:", err)
      stats.errors++
    }
  }

  return Response.json({ ok: true, ...stats })
}

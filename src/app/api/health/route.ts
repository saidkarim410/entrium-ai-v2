import { MODEL_IDS } from "@/lib/ai"
import { stripeEnabled, telegramEnabled, emailEnabled } from "@/lib/env"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Public health endpoint — used by uptime monitors, smoke tests, ops.
 * Returns 200 with a flat status object listing which integrations are wired.
 *
 * Critical: the response body is non-secret by design, so external monitors
 * (UptimeRobot, BetterUptime, Vercel monitors) can ping it.
 */
export async function GET() {
  return Response.json({
    ok: true,
    ts: new Date().toISOString(),
    region: process.env.VERCEL_REGION ?? "local",
    commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7) || null,
    // Active model tiers (env-overridable) — lets ops confirm a model switch without a test call
    models: { pro: MODEL_IDS.sonnet, free: MODEL_IDS.haiku, background: MODEL_IDS.background },
    runtime: {
      node: process.version,
      env: process.env.NODE_ENV,
    },
    integrations: {
      anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
      openai: Boolean(process.env.OPENAI_API_KEY),
      supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      sentry: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
      telegram: telegramEnabled(),
      stripe: stripeEnabled(),
      email_resend: emailEnabled(),
      cron_auth: Boolean(process.env.CRON_SECRET),
    },
  })
}

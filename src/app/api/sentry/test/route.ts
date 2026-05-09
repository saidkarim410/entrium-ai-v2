import * as Sentry from "@sentry/nextjs"
import { getCurrentUser } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Sentry smoke test — auth-required POST that intentionally throws so we can
 * verify the error makes it to Sentry's dashboard.
 *
 * GET returns config status without throwing — useful for "is DSN set?" checks.
 *
 * Auth-required so randos can't inflate Sentry quota.
 */
export async function GET() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  return Response.json({
    sentry_configured: Boolean(dsn),
    sentry_dsn_host: dsn ? new URL(dsn).host : null,
    environment: process.env.NODE_ENV,
    region: process.env.VERCEL_REGION ?? null,
  })
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const kind = (body?.kind as string | undefined) ?? "exception"

  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return Response.json(
      { error: "sentry_not_configured", message: "NEXT_PUBLIC_SENTRY_DSN missing" },
      { status: 503 }
    )
  }

  // Tag the event with the user so we can correlate in Sentry
  Sentry.setUser({ id: user.id, email: user.email })
  Sentry.setTag("smoke_test", "true")

  switch (kind) {
    case "message": {
      const eventId = Sentry.captureMessage("Entrium smoke-test message", "info")
      await Sentry.flush(2000)
      return Response.json({ ok: true, kind, eventId })
    }
    case "exception": {
      const err = new Error(`Entrium smoke-test exception @ ${new Date().toISOString()}`)
      const eventId = Sentry.captureException(err)
      await Sentry.flush(2000)
      return Response.json({ ok: true, kind, eventId })
    }
    case "throw": {
      // Intentionally unhandled — verifies onRequestError + automatic capture
      throw new Error("Entrium smoke-test thrown error (intentional)")
    }
    default:
      return Response.json({ error: "unknown_kind", message: "kind must be: message | exception | throw" }, { status: 400 })
  }
}

import { timingSafeEqual } from "node:crypto"

/**
 * Fail-closed auth for Vercel Cron endpoints.
 *
 * Vercel Cron automatically sends `Authorization: Bearer ${CRON_SECRET}`.
 * Returns a Response (401/500) when the request is NOT an authorized cron
 * invocation, or `null` when it is authorized.
 *
 * SECURITY: if CRON_SECRET is unset we return 500 (fail CLOSED) instead of
 * skipping the check — a missing secret must never make the endpoint public.
 * The comparison is constant-time to avoid leaking the secret via timing.
 */
export function denyIfNotCron(req: Request): Response | null {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return Response.json({ error: "cron_not_configured" }, { status: 500 })
  }
  const got = Buffer.from(req.headers.get("authorization") ?? "")
  const expected = Buffer.from(`Bearer ${secret}`)
  if (got.length !== expected.length || !timingSafeEqual(got, expected)) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }
  return null
}

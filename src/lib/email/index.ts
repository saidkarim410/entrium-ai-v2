import { Resend } from "resend"
import crypto from "node:crypto"
import { env, emailEnabled } from "@/lib/env"

let _client: Resend | null = null

function getResend(): Resend {
  if (!emailEnabled()) {
    throw new Error("Resend is not configured (RESEND_API_KEY missing)")
  }
  if (!_client) _client = new Resend(env.RESEND_API_KEY)
  return _client
}

export async function sendEmail(opts: {
  to: string
  subject: string
  html: string
  text?: string
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!emailEnabled()) return { ok: false, error: "email_disabled" }
  try {
    const r = await getResend().emails.send({
      from: env.RESEND_FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    })
    if (r.error) return { ok: false, error: r.error.message }
    return { ok: true, id: r.data?.id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "send_failed" }
  }
}

/**
 * Sign a payload + user_id with EMAIL_TOKEN_SECRET. Used for unsubscribe links
 * so a leaked DB row doesn't grant the attacker the ability to forge tokens.
 */
function hmac32(secret: string, payload: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url").slice(0, 32)
}

function safeEq(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb)
}

/**
 * Sign userId+action with EMAIL_TOKEN_SECRET. Pass `ttlSeconds` to make the token
 * expire (M4) — recommended for one-shot links (unsubscribe). Omit it for long-lived
 * feeds (calendar .ics) that must keep working without re-subscription.
 */
export function signToken(userId: string, action: string, ttlSeconds?: number): string {
  const secret = env.EMAIL_TOKEN_SECRET
  if (!secret) return ""
  if (ttlSeconds && ttlSeconds > 0) {
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds
    const payload = `${userId}.${action}.${exp}`
    return `${payload}.${hmac32(secret, payload)}`
  }
  const payload = `${userId}.${action}`
  return `${payload}.${hmac32(secret, payload)}`
}

export function verifyToken(token: string, action: string): string | null {
  const secret = env.EMAIL_TOKEN_SECRET
  if (!secret || !token) return null
  const parts = token.split(".")
  // M4: accept legacy (userId.action.sig) AND expiring (userId.action.exp.sig) tokens.
  if (parts.length === 4) {
    const [userId, gotAction, expStr, sig] = parts
    if (gotAction !== action) return null
    const exp = Number(expStr)
    if (!exp || exp < Math.floor(Date.now() / 1000)) return null
    return safeEq(sig, hmac32(secret, `${userId}.${action}.${expStr}`)) ? userId : null
  }
  if (parts.length === 3) {
    const [userId, gotAction, sig] = parts
    if (gotAction !== action) return null
    return safeEq(sig, hmac32(secret, `${userId}.${action}`)) ? userId : null
  }
  return null
}

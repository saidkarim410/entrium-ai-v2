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
export function signToken(userId: string, action: string): string {
  const secret = env.EMAIL_TOKEN_SECRET
  if (!secret) return ""
  const payload = `${userId}.${action}`
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url").slice(0, 32)
  return `${payload}.${sig}`
}

export function verifyToken(token: string, action: string): string | null {
  const secret = env.EMAIL_TOKEN_SECRET
  if (!secret || !token) return null
  const parts = token.split(".")
  if (parts.length !== 3) return null
  const [userId, gotAction, sig] = parts
  if (gotAction !== action) return null
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${userId}.${action}`)
    .digest("base64url")
    .slice(0, 32)
  if (sig !== expected) return null
  return userId
}

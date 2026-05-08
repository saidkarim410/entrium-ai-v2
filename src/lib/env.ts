/**
 * Lightweight env access. Validation happens at runtime when used.
 */
export const env = {
  get NEXT_PUBLIC_SUPABASE_URL() {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  },
  get NEXT_PUBLIC_SUPABASE_ANON_KEY() {
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    return process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  },
  get ANTHROPIC_API_KEY() {
    return process.env.ANTHROPIC_API_KEY ?? ""
  },
  get OPENAI_API_KEY() {
    return process.env.OPENAI_API_KEY ?? ""
  },
  get NEXT_PUBLIC_SITE_URL() {
    return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  },

  // ── Stripe (optional — Pro upgrade flow) ────────────────────────
  get STRIPE_SECRET_KEY() {
    return process.env.STRIPE_SECRET_KEY ?? ""
  },
  get STRIPE_WEBHOOK_SECRET() {
    return process.env.STRIPE_WEBHOOK_SECRET ?? ""
  },
  get STRIPE_PRICE_ID_PRO_MONTHLY() {
    return process.env.STRIPE_PRICE_ID_PRO_MONTHLY ?? ""
  },
  get STRIPE_PRICE_ID_PRO_YEARLY() {
    return process.env.STRIPE_PRICE_ID_PRO_YEARLY ?? ""
  },

  // ── Telegram bot (optional) ─────────────────────────────────────
  get TELEGRAM_BOT_TOKEN() {
    return process.env.TELEGRAM_BOT_TOKEN ?? ""
  },
  get TELEGRAM_WEBHOOK_SECRET() {
    return process.env.TELEGRAM_WEBHOOK_SECRET ?? ""
  },

  // ── Resend (optional — email digest) ────────────────────────────
  get RESEND_API_KEY() {
    return process.env.RESEND_API_KEY ?? ""
  },
  get RESEND_FROM() {
    return process.env.RESEND_FROM ?? "Entrium AI <noreply@entrium.ai>"
  },
  get EMAIL_TOKEN_SECRET() {
    return process.env.EMAIL_TOKEN_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  },
}

/** Check if Stripe integration is wired up */
export function stripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID_PRO_MONTHLY)
}

/** Check if Telegram bot is wired up */
export function telegramEnabled(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN)
}

/** Check if Resend email is wired up */
export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY)
}

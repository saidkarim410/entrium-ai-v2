import { supabaseAdmin } from "@/lib/supabase/admin"

/**
 * First-party product events (P1 analytics from the CTO TZ §5).
 * Fire-and-forget: never throws, never blocks a request. Props must be small and
 * free of personal data (no names, emails, essay text, document contents).
 */
export const PRODUCT_EVENTS = [
  "onboarding_started",
  "onboarding_completed",
  "pricing_viewed",
  "checkout_started",
  "subscription_activated",
  "subscription_canceled",
  "mission_started",
  "mission_completed",
  "mission_partial",
  "mission_failed",
  "plan_saved",
  "program_draft_created",
  "program_deadline_saved",
  "scholarship_deadline_saved",
] as const

export type ProductEvent = (typeof PRODUCT_EVENTS)[number]

const ALLOWED = new Set<string>(PRODUCT_EVENTS)

export function isProductEvent(name: string): name is ProductEvent {
  return ALLOWED.has(name)
}

/** Keep props tiny and PII-free: primitives only, ≤ 12 keys, strings ≤ 120 chars. */
function sanitizeProps(props: Record<string, unknown> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (!props) return out
  let n = 0
  for (const [k, v] of Object.entries(props)) {
    if (n++ >= 12) break
    if (typeof v === "number" || typeof v === "boolean") out[k] = v
    else if (typeof v === "string") out[k] = v.slice(0, 120)
  }
  return out
}

export function trackEvent(
  userId: string | null,
  event: ProductEvent,
  props?: Record<string, unknown>,
  source: "web" | "tg" | "server" = "web"
): void {
  void supabaseAdmin
    .from("product_events")
    .insert({ user_id: userId, event, props: sanitizeProps(props), source })
    .then(({ error }) => {
      // 42P01 / PGRST205 = migration 0027 not applied — analytics must never break a request
      if (error && error.code !== "42P01" && error.code !== "PGRST205") console.error("trackEvent:", error.message)
    })
}

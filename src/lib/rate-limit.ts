import { supabaseAdmin } from "@/lib/supabase/admin"

export const FREE_DAILY_LIMIT = 5
export const REFERRAL_BONUS = 10

export type UsageStatus = {
  allowed: boolean
  remaining: number
  tier: "free" | "pro"
  bonus: number
  reason?: "limit_reached"
}

/**
 * Atomic quota check + reservation.
 * Closes S-4/S-5 from TZ — the previous read-then-write pattern allowed
 * concurrent burst calls to overshoot the daily limit. The new flow
 * goes through `entrium.try_consume_quota()` which locks the profile
 * row, counts today's events, and inserts a reservation in a single
 * transaction.
 *
 * Caller is still expected to call `recordUsage(...)` after the actual
 * AI call to overwrite the reservation with real token counts.
 */
export async function checkUsage(userId: string): Promise<UsageStatus> {
  const { data, error } = await supabaseAdmin.rpc("try_consume_quota", { uid: userId })

  if (error || !data || (Array.isArray(data) && data.length === 0)) {
    return { allowed: false, remaining: 0, tier: "free", bonus: 0, reason: "limit_reached" }
  }

  const row = Array.isArray(data) ? data[0] : data
  return {
    allowed: row.allowed,
    remaining: row.remaining,
    tier: row.tier as "free" | "pro",
    bonus: row.bonus,
    reason: row.allowed ? undefined : "limit_reached",
  }
}

/**
 * Records the *actual* AI call for analytics/billing.
 *
 * C3: `try_consume_quota` reserves a '__reserved__' usage_events row up front so the
 * quota gate is atomic. We FILL that reservation in place rather than inserting a second
 * row (a second insert would double-count and lock free users out after ~2 calls — the
 * 0015 bug). Falls back to a plain insert if no reservation exists (old DB function, or
 * a direct call), so this is safe to deploy before the 0020 migration is applied.
 */
export async function recordUsage(params: {
  userId: string
  tool: string
  model: string
  inputTokens: number
  outputTokens: number
  costUsd: number
}) {
  const row = {
    tool: params.tool,
    model: params.model,
    input_tokens: params.inputTokens,
    output_tokens: params.outputTokens,
    cost_usd: params.costUsd,
  }

  const { data: reserved } = await supabaseAdmin
    .from("usage_events")
    .select("id")
    .eq("user_id", params.userId)
    .eq("tool", "__reserved__")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (reserved?.id) {
    const { error } = await supabaseAdmin
      .from("usage_events")
      .update(row)
      .eq("id", reserved.id)
    if (!error) return
  }

  await supabaseAdmin.from("usage_events").insert({ user_id: params.userId, ...row })
}

/**
 * Atomic bonus consumption. Returns the new balance, or null if there
 * was no bonus to consume (so caller knows to fall back to free quota).
 */
export async function consumeBonus(userId: string): Promise<number | null> {
  const { data, error } = await supabaseAdmin.rpc("try_consume_bonus", { uid: userId })
  if (error) return null
  return typeof data === "number" ? data : null
}

/**
 * Shared-store (Postgres) fixed-window rate limiter (H4). Use for expensive
 * endpoints not covered by the daily AI quota (e.g. /api/search). Returns true
 * if the request is within the limit. Fails OPEN on limiter error — a limiter
 * hiccup must not block legitimate users.
 */
export async function checkRateLimit(
  key: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc("check_rate_limit", {
    p_key: key,
    p_max: max,
    p_window_seconds: windowSeconds,
  })
  if (error) return true
  return data === true
}

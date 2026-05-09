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
 * Records the *actual* AI call for analytics/billing. The reservation
 * row from try_consume_quota counts toward today's quota; we insert a
 * separate event with real token data so the dashboard can show usage.
 */
export async function recordUsage(params: {
  userId: string
  tool: string
  model: string
  inputTokens: number
  outputTokens: number
  costUsd: number
}) {
  await supabaseAdmin.from("usage_events").insert({
    user_id: params.userId,
    tool: params.tool,
    model: params.model,
    input_tokens: params.inputTokens,
    output_tokens: params.outputTokens,
    cost_usd: params.costUsd,
  })
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

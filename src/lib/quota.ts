/**
 * Pure quota arithmetic — no I/O, importable from tests and client code.
 * The DB function `entrium.try_consume_quota` (migration 0023) is the gate;
 * this mirrors its rules so displays and pre-checks can't drift from it.
 */

export const FREE_DAILY_LIMIT = 3
export const REFERRAL_BONUS = 10

export type UsageStatus = {
  allowed: boolean
  remaining: number
  tier: "free" | "pro"
  bonus: number
  /** Daily free limit as reported by the DB (falls back to FREE_DAILY_LIMIT) */
  limit?: number
  reason?: "limit_reached"
}

/**
 * Remaining free requests given today's BASE usage (bonus-funded calls are not
 * counted — they already decremented `bonus`, see migration 0029). A referral
 * credit is spent only when the base quota is exhausted, so `remaining + bonus`
 * is exactly what the user can still run today.
 */
export function computeRemaining(params: {
  tier: string | null | undefined
  proUntil: string | null | undefined
  usedToday: number
  bonus: number
  limit?: number
  now?: Date
}): UsageStatus {
  const limit = params.limit ?? FREE_DAILY_LIMIT
  const bonus = Math.max(0, params.bonus || 0)
  const nowMs = (params.now ?? new Date()).getTime()
  const isPro =
    params.tier === "pro" && (!params.proUntil || new Date(params.proUntil).getTime() > nowMs)
  if (isPro) return { allowed: true, remaining: 2147483647, tier: "pro", bonus, limit }
  const remaining = Math.max(0, limit - params.usedToday)
  const allowed = params.usedToday < limit || bonus > 0
  return { allowed, remaining, tier: "free", bonus, limit, reason: allowed ? undefined : "limit_reached" }
}

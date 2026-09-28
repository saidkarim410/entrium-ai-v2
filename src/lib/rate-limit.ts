import { supabaseAdmin } from "@/lib/supabase/admin"
import { FREE_DAILY_LIMIT, computeRemaining, type UsageStatus } from "@/lib/quota"
import { estimateCostUsd } from "@/lib/ai/pricing"

export { FREE_DAILY_LIMIT, REFERRAL_BONUS, computeRemaining, type UsageStatus } from "@/lib/quota"

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
    limit: typeof row.daily_limit === "number" ? row.daily_limit : FREE_DAILY_LIMIT,
    reason: row.allowed ? undefined : "limit_reached",
  }
}

/** Start of the current UTC day — matches the window used by `try_consume_quota`. */
function utcDayStartIso(now: Date = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
}

/**
 * READ-ONLY usage status for display and post-call checks.
 *
 * `checkUsage()` RESERVES a request (inserts a `__reserved__` usage row). Calling
 * it just to look at the balance — as the dashboard and the post-call bonus check
 * used to — silently burned quota: every chat message cost 2 of the 3 daily
 * requests and a 4-step mission cost 5 (P1-04 in the CTO TZ). Use this instead.
 */
export async function getUsageStatus(userId: string): Promise<UsageStatus> {
  // Preferred: the read-only SQL function from migration 0023 (single source of truth
  // for the limit). Falls back to a local computation until it is applied.
  const { data, error } = await supabaseAdmin.rpc("get_usage_status", { uid: userId })
  if (!error && data) {
    const row = Array.isArray(data) ? data[0] : data
    if (row && typeof row.remaining === "number") {
      return {
        allowed: Boolean(row.allowed),
        remaining: row.remaining,
        tier: row.tier === "pro" ? "pro" : "free",
        bonus: row.bonus ?? 0,
        limit: typeof row.daily_limit === "number" ? row.daily_limit : FREE_DAILY_LIMIT,
        reason: row.allowed ? undefined : "limit_reached",
      }
    }
  }

  const [{ data: profile }, { count }] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("tier, pro_until, bonus_credits")
      .eq("id", userId)
      .maybeSingle(),
    supabaseAdmin
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", utcDayStartIso()),
  ])
  return computeRemaining({
    tier: profile?.tier,
    proUntil: profile?.pro_until,
    usedToday: count ?? 0,
    bonus: profile?.bonus_credits ?? 0,
  })
}

/**
 * Give back the most recent unfilled reservation — used when an AI step fails
 * technically (truncated, invalid JSON, model error). The user must not pay for
 * a result they never received. Returns true if a reservation was released.
 */
export async function releaseReservation(userId: string): Promise<boolean> {
  const { data: reserved } = await supabaseAdmin
    .from("usage_events")
    .select("id, bonus_funded")
    .eq("user_id", userId)
    .eq("tool", "__reserved__")
    .gte("created_at", utcDayStartIso())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!reserved?.id) return false
  const { error } = await supabaseAdmin.from("usage_events").delete().eq("id", reserved.id)
  if (error) return false
  // A reservation paid with a referral credit (0029) gives the credit back too.
  if (reserved.bonus_funded) await supabaseAdmin.rpc("refund_bonus", { uid: userId })
  return true
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
  /** Optional — when omitted or 0 the cost is computed from the model price table */
  costUsd?: number
}) {
  const row = {
    tool: params.tool,
    model: params.model,
    input_tokens: params.inputTokens,
    output_tokens: params.outputTokens,
    cost_usd: params.costUsd || estimateCostUsd(params.model, params.inputTokens, params.outputTokens),
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

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

export async function checkUsage(userId: string): Promise<UsageStatus> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("tier, pro_until, bonus_credits")
    .eq("id", userId)
    .single()

  if (!profile) {
    return { allowed: false, remaining: 0, tier: "free", bonus: 0, reason: "limit_reached" }
  }

  const isProActive =
    profile.tier === "pro" &&
    (!profile.pro_until || new Date(profile.pro_until) > new Date())

  if (isProActive) {
    return { allowed: true, remaining: Infinity, tier: "pro", bonus: profile.bonus_credits ?? 0 }
  }

  const today = new Date().toISOString().slice(0, 10)
  const { count } = await supabaseAdmin
    .from("usage_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", `${today}T00:00:00Z`)
    .lte("created_at", `${today}T23:59:59Z`)

  const used = count ?? 0
  const remaining = FREE_DAILY_LIMIT - used + (profile.bonus_credits ?? 0)

  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
    tier: "free",
    bonus: profile.bonus_credits ?? 0,
    reason: remaining > 0 ? undefined : "limit_reached",
  }
}

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

export async function consumeBonus(userId: string) {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("bonus_credits")
    .eq("id", userId)
    .single()
  if (!data || data.bonus_credits <= 0) return
  await supabaseAdmin
    .from("profiles")
    .update({ bonus_credits: data.bonus_credits - 1 })
    .eq("id", userId)
}

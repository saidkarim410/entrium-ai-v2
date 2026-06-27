"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/supabase/server"
import { createNotification } from "@/lib/notifications/actions"

const REF_COOKIE = "entrium_ref"
const REF_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 // 30 days
const REWARD_CREDITS = 10

export type ReferralStatus = {
  code: string | null
  link: string
  totalReferred: number
  completed: number
  bonusCredits: number
  recentReferrals: Array<{
    id: string
    full_name: string | null
    completed: boolean
    created_at: string
  }>
}

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://entrium-ai-v2.vercel.app").replace(/\/$/, "")

export async function getReferralStatus(): Promise<ReferralStatus> {
  const empty: ReferralStatus = {
    code: null,
    link: "",
    totalReferred: 0,
    completed: 0,
    bonusCredits: 0,
    recentReferrals: [],
  }

  const user = await getCurrentUser()
  if (!user) return empty

  // Pull current code + bonus
  const { data: me } = await supabaseAdmin
    .from("profiles")
    .select("referral_code, bonus_credits")
    .eq("id", user.id)
    .maybeSingle()

  if (!me) return empty

  // Pull referred users
  const { data: refs } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, applicant_data, created_at")
    .eq("referred_by", user.id)
    .order("created_at", { ascending: false })
    .limit(10)

  const recentReferrals = (refs ?? []).map((r) => ({
    id: r.id as string,
    full_name: (r.full_name as string | null) ?? null,
    completed: Boolean((r.applicant_data as { _completed?: boolean } | null)?._completed),
    created_at: r.created_at as string,
  }))

  const completed = recentReferrals.filter((r) => r.completed).length

  return {
    code: (me.referral_code as string | null) ?? null,
    link: me.referral_code ? `${SITE}/signup?ref=${me.referral_code}` : "",
    totalReferred: recentReferrals.length, // up to 10 most recent — good enough for v1
    completed,
    bonusCredits: (me.bonus_credits as number | null) ?? 0,
    recentReferrals,
  }
}

/**
 * Capture ?ref=CODE during signup flow and stash it as a cookie.
 * Called from the client signup page (or directly via server action).
 */
export async function setReferralCookie(code: string): Promise<{ ok: boolean }> {
  const c = code.trim().toLowerCase().slice(0, 64)
  if (!c) return { ok: false }

  const jar = await cookies()
  jar.set(REF_COOKIE, c, {
    maxAge: REF_COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  })
  return { ok: true }
}

/**
 * Read the captured referral cookie (if any). Used by profile creation
 * to attribute the new account to a referrer.
 */
export async function readReferralCookie(): Promise<string | null> {
  const jar = await cookies()
  return jar.get(REF_COOKIE)?.value?.trim().toLowerCase() || null
}

export async function clearReferralCookie() {
  const jar = await cookies()
  jar.delete(REF_COOKIE)
}

/**
 * Try to attribute the current user to a referrer.
 *
 * - Reads the entrium_ref cookie
 * - If found, looks up profile by referral_code (case-insensitive)
 * - If valid + not self + user has no existing referred_by → set it
 * - Notifies the referrer (no credit awarded yet — credit lands when the new user completes onboarding)
 *
 * Idempotent — safe to call multiple times.
 */
export async function attributeReferralIfPending(): Promise<{ attributed: boolean }> {
  const user = await getCurrentUser()
  if (!user) return { attributed: false }

  const code = await readReferralCookie()
  if (!code) return { attributed: false }

  const { data: me } = await supabaseAdmin
    .from("profiles")
    .select("id, referred_by")
    .eq("id", user.id)
    .maybeSingle()

  if (!me) return { attributed: false }
  if (me.referred_by) {
    await clearReferralCookie()
    return { attributed: false }
  }

  // Look up referrer
  const { data: ref } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name")
    .ilike("referral_code", code)
    .neq("id", user.id)
    .maybeSingle()

  if (!ref) {
    await clearReferralCookie()
    return { attributed: false }
  }

  await supabaseAdmin
    .from("profiles")
    .update({ referred_by: ref.id })
    .eq("id", user.id)

  await createNotification({
    userId: ref.id as string,
    type: "referral",
    title: "👋 Новый реферал зарегистрировался",
    body: `Когда они закончат онбординг, ты получишь +${REWARD_CREDITS} запросов в подарок.`,
    link: "/refer",
    dedupKey: `ref_signup:${user.id}`,
  })

  await clearReferralCookie()
  return { attributed: true }
}

/**
 * Award credits to the referrer when the referred user just completed
 * onboarding (transitioned from _completed=false → true).
 *
 * Called from saveApplicantProfile when _completed becomes true.
 */
export async function awardReferralOnCompletion(referredUserId: string): Promise<{ awarded: boolean }> {
  // Find referrer + dedup
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("referred_by, full_name")
    .eq("id", referredUserId)
    .maybeSingle()

  if (!profile?.referred_by) return { awarded: false }

  // L3/B-3: dedup FIRST, then credit. Previously the credit was applied BEFORE the
  // dedup check, so a repeated completion call double-credited the referrer (and the
  // increment was a non-atomic read-then-write). Now the unique dedup_key gates the
  // credit, and the credit itself is an atomic RPC.
  const r = await createNotification({
    userId: profile.referred_by as string,
    type: "referral",
    title: `🎉 +${REWARD_CREDITS} запросов · реферал заполнил профиль`,
    body: `Спасибо за приглашение${profile.full_name ? ` ${profile.full_name}` : ""}! Кредиты добавлены в твой бонусный пул.`,
    link: "/refer",
    dedupKey: `ref_completed:${referredUserId}`,
  })

  // If the dedup hit (notification already existed) → don't credit at all.
  if (!r.inserted) return { awarded: false }

  // Atomic increment — no read-then-write race.
  await supabaseAdmin.rpc("award_bonus_credits", {
    uid: profile.referred_by,
    amount: REWARD_CREDITS,
  })

  revalidatePath("/refer")
  revalidatePath("/dashboard")
  return { awarded: true }
}

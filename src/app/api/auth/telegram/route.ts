import { NextResponse } from "next/server"
import crypto from "crypto"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

const tgUserSchema = z.object({
  id: z.coerce.number(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  photo_url: z.string().url().optional(),
  auth_date: z.coerce.number(),
  hash: z.string(),
})

function verifyTelegramAuth(data: Record<string, string | number>): boolean {
  if (!BOT_TOKEN) return false
  const { hash, ...rest } = data
  const checkString = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join("\n")
  const secretKey = crypto.createHash("sha256").update(BOT_TOKEN).digest()
  const computed = crypto.createHmac("sha256", secretKey).update(checkString).digest("hex")
  // M3: constant-time compare (was ===, a timing oracle on the auth hash)
  const a = Buffer.from(computed)
  const b = Buffer.from(String(hash))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export async function POST(req: Request) {
  if (!BOT_TOKEN) {
    return NextResponse.json({ error: "telegram_not_configured" }, { status: 500 })
  }

  const body = await req.json()
  const parsed = tgUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 })
  }

  const data = parsed.data

  // Verify hash & freshness (1h window, matching the Mini App initData policy)
  const ok = verifyTelegramAuth(data as unknown as Record<string, string | number>)
  if (!ok) return NextResponse.json({ error: "invalid_signature" }, { status: 401 })

  // Replay/clock-forge guard: reject stale (>1h) AND future-dated auth_date.
  const nowSec = Date.now() / 1000
  const ageSec = nowSec - data.auth_date
  if (ageSec > 3600 || data.auth_date > nowSec + 60) {
    return NextResponse.json({ error: "stale_auth" }, { status: 401 })
  }

  const tgId = String(data.id)
  const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ") || data.username || `tg_${tgId}`
  const email = `tg.${tgId}@telegram.entrium.local` // synthetic; Supabase needs unique email

  // Resolve the auth user by the indexed `profiles.telegram_id` (populated by the
  // handle_new_user trigger from user_metadata). Replaces a listUsers() call that
  // only read the first page (50): past 50 users, returning Telegram-Widget users
  // were not found, hit the unique-email constraint on re-create, and got a 500
  // (login silently broke at scale). Deterministic indexed lookup fixes that.
  const { data: prof, error: lookupErr } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("telegram_id", tgId)
    .maybeSingle()
  if (lookupErr) {
    console.error("[auth/telegram] profile lookup failed:", lookupErr)
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 })
  }

  let userId = prof?.id as string | undefined
  if (!userId) {
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        avatar_url: data.photo_url,
        telegram_id: tgId,
        telegram_username: data.username,
      },
    })
    if (createErr || !created.user) {
      // Lost a concurrent first-login race: the trigger just created the profile.
      // Re-resolve by telegram_id before failing so the loser still gets a session.
      const retry = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("telegram_id", tgId)
        .maybeSingle()
      if (!retry.data) {
        console.error("[auth/telegram] create failed:", createErr)
        return NextResponse.json({ error: "create_failed" }, { status: 500 })
      }
      userId = retry.data.id as string
    } else {
      userId = created.user.id
    }
  }

  // Generate a magic link and exchange immediately for a session
  const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email,
  })
  if (linkErr || !link.properties?.hashed_token) {
    console.error("[auth/telegram] generateLink failed:", linkErr)
    return NextResponse.json({ error: "link_failed" }, { status: 500 })
  }

  const supabase = await createSupabaseServerClient()
  const { error: verifyErr } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  })
  if (verifyErr) {
    console.error("[auth/telegram] verifyOtp failed:", verifyErr)
    return NextResponse.json({ error: "verify_failed" }, { status: 500 })
  }

  return NextResponse.json({ ok: true, redirect: "/dashboard" })
}

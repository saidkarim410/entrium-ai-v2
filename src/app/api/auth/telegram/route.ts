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

  // Verify hash & freshness (within 1 day)
  const ok = verifyTelegramAuth(data as unknown as Record<string, string | number>)
  if (!ok) return NextResponse.json({ error: "invalid_signature" }, { status: 401 })

  const ageSec = Date.now() / 1000 - data.auth_date
  if (ageSec > 86400) return NextResponse.json({ error: "stale_auth" }, { status: 401 })

  const tgId = String(data.id)
  const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ") || data.username || `tg_${tgId}`
  const email = `tg.${tgId}@telegram.entrium.local` // synthetic; Supabase needs unique email

  // Find or create the auth user
  const { data: existing } = await supabaseAdmin.auth.admin.listUsers()
  const found = existing?.users?.find((u) => u.email === email)

  let userId = found?.id
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
      return NextResponse.json({ error: createErr?.message ?? "create_failed" }, { status: 500 })
    }
    userId = created.user.id
  }

  // Generate a magic link and exchange immediately for a session
  const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email,
  })
  if (linkErr || !link.properties?.hashed_token) {
    return NextResponse.json({ error: linkErr?.message ?? "link_failed" }, { status: 500 })
  }

  const supabase = await createSupabaseServerClient()
  const { error: verifyErr } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  })
  if (verifyErr) {
    return NextResponse.json({ error: verifyErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, redirect: "/dashboard" })
}

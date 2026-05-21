import { supabaseAdmin } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Called from the WhatsApp button right after a successful verifyOtp().
 * Marks the freshly-authenticated session's profile as WhatsApp-verified
 * and stores the phone — the handle_new_user() trigger doesn't know about
 * phone-only sign-ups specifically, so we patch from the client-side hook.
 *
 * The route is idempotent: re-calling for the same user just sets the same
 * flags again.
 */
export async function POST() {
  const user = await getCurrentUser()
  if (!user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    })
  }
  if (!user.phone) {
    return new Response(JSON.stringify({ error: "no_phone_on_session" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    })
  }

  const normalizedPhone = user.phone.startsWith("+") ? user.phone : `+${user.phone}`

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      whatsapp_phone: normalizedPhone,
      whatsapp_verified: true,
      phone: normalizedPhone,
      auth_provider: "whatsapp",
    })
    .eq("id", user.id)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" },
  })
}

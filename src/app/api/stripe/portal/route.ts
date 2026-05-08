import { getStripe } from "@/lib/stripe"
import { stripeEnabled, env } from "@/lib/env"
import { getCurrentUser } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"

/**
 * Creates a Stripe Customer Portal session so the user can
 * manage subscription, update card, see invoices, cancel, etc.
 */
export async function POST() {
  if (!stripeEnabled()) {
    return Response.json({ error: "stripe_not_configured" }, { status: 503 })
  }

  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile?.stripe_customer_id) {
    return Response.json(
      { error: "no_customer", message: "Сначала оформи подписку." },
      { status: 400 }
    )
  }

  const stripe = getStripe()
  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/settings`,
  })

  return Response.json({ url: session.url })
}

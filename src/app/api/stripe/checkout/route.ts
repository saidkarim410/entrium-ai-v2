import { z } from "zod"
import { getStripe, STRIPE_METADATA_USER_ID } from "@/lib/stripe"
import { stripeEnabled, env } from "@/lib/env"
import { getCurrentUser } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"

const schema = z.object({
  plan: z.enum(["monthly", "yearly"]).default("monthly"),
})

/**
 * Creates a Stripe Checkout Session for Pro subscription.
 * Returns the session URL — client redirects to it.
 */
export async function POST(req: Request) {
  if (!stripeEnabled()) {
    return Response.json(
      { error: "stripe_not_configured", message: "Stripe пока не настроен. Свяжись с поддержкой." },
      { status: 503 }
    )
  }

  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "invalid_input" }, { status: 400 })
  }

  const priceId =
    parsed.data.plan === "yearly"
      ? env.STRIPE_PRICE_ID_PRO_YEARLY
      : env.STRIPE_PRICE_ID_PRO_MONTHLY

  if (!priceId) {
    return Response.json(
      { error: "price_not_configured", message: `STRIPE_PRICE_ID_PRO_${parsed.data.plan.toUpperCase()} не задан` },
      { status: 503 }
    )
  }

  const stripe = getStripe()

  // Find or create Stripe customer
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("stripe_customer_id, email, full_name")
    .eq("id", user.id)
    .maybeSingle()

  let customerId = profile?.stripe_customer_id ?? null
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email ?? user.email ?? undefined,
      name: profile?.full_name ?? undefined,
      metadata: { [STRIPE_METADATA_USER_ID]: user.id },
    })
    customerId = customer.id
    await supabaseAdmin
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id)
  }

  const siteUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    client_reference_id: user.id,
    metadata: { [STRIPE_METADATA_USER_ID]: user.id, plan: parsed.data.plan },
    subscription_data: {
      metadata: { [STRIPE_METADATA_USER_ID]: user.id, plan: parsed.data.plan },
    },
    success_url: `${siteUrl}/settings?upgraded=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/pricing?canceled=1`,
  })

  if (!session.url) {
    return Response.json({ error: "no_session_url" }, { status: 500 })
  }
  return Response.json({ url: session.url })
}

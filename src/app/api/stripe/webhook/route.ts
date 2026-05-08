import type Stripe from "stripe"
import { getStripe, STRIPE_METADATA_USER_ID } from "@/lib/stripe"
import { stripeEnabled, env } from "@/lib/env"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Stripe webhook receiver.
 *
 * In Stripe Dashboard create an endpoint pointing to:
 *   https://<your-site>/api/stripe/webhook
 * And subscribe to events:
 *   - checkout.session.completed
 *   - customer.subscription.created
 *   - customer.subscription.updated
 *   - customer.subscription.deleted
 *   - invoice.payment_failed
 */
export async function POST(req: Request) {
  if (!stripeEnabled() || !env.STRIPE_WEBHOOK_SECRET) {
    return Response.json({ error: "stripe_not_configured" }, { status: 503 })
  }

  const sig = req.headers.get("stripe-signature")
  if (!sig) return Response.json({ error: "missing_signature" }, { status: 400 })

  // Need raw body for signature verification — App Router gives us text()
  const raw = await req.text()

  const stripe = getStripe()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(raw, sig, env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error("Stripe webhook signature failed:", err)
    return Response.json({ error: "bad_signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object
        await handleCheckoutCompleted(session, stripe)
        break
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object
        await syncSubscription(sub, stripe)
        break
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object
        await deactivateSubscription(sub)
        break
      }
      case "invoice.payment_failed": {
        // Optional: notify user. For now just log.
        const inv = event.data.object
        console.warn("Stripe invoice.payment_failed for customer:", inv.customer)
        break
      }
      default:
        // Ignored
        break
    }
  } catch (err) {
    console.error(`Stripe webhook handler error (${event.type}):`, err)
    // Don't tell Stripe to retry indefinitely on programming errors —
    // return 200 so the event is acknowledged but log it loudly.
  }

  return Response.json({ received: true })
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function findUserId(opts: {
  metadata?: Stripe.Metadata | null
  customerId?: string | null
}): Promise<string | null> {
  const fromMeta = opts.metadata?.[STRIPE_METADATA_USER_ID]
  if (fromMeta) return fromMeta

  if (opts.customerId) {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", opts.customerId)
      .maybeSingle()
    return data?.id ?? null
  }
  return null
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  stripe: Stripe
) {
  const userId = await findUserId({
    metadata: session.metadata,
    customerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
  })
  if (!userId) {
    console.warn("Checkout completed but user_id not resolvable:", session.id)
    return
  }

  // Persist customer link if needed
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id
  if (customerId) {
    await supabaseAdmin
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", userId)
  }

  // If subscription was created, sync it now
  const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id
  if (subId) {
    const sub = await stripe.subscriptions.retrieve(subId)
    await syncSubscription(sub, stripe)
  }
}

async function syncSubscription(sub: Stripe.Subscription, _stripe: Stripe) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id
  const userId = await findUserId({ metadata: sub.metadata, customerId })
  if (!userId) {
    console.warn("subscription.updated but user_id not resolvable:", sub.id)
    return
  }

  const isActive = sub.status === "active" || sub.status === "trialing"
  const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end
  const proUntilIso = periodEnd ? new Date(periodEnd * 1000).toISOString() : null

  const update: Record<string, unknown> = {
    stripe_customer_id: customerId,
  }
  if (isActive) {
    update.tier = "pro"
    if (proUntilIso) update.pro_until = proUntilIso
  } else if (sub.status === "canceled" || sub.status === "incomplete_expired") {
    update.tier = "free"
    update.pro_until = null
  }

  await supabaseAdmin.from("profiles").update(update).eq("id", userId)
}

async function deactivateSubscription(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id
  const userId = await findUserId({ metadata: sub.metadata, customerId })
  if (!userId) return

  await supabaseAdmin
    .from("profiles")
    .update({ tier: "free", pro_until: null })
    .eq("id", userId)
}

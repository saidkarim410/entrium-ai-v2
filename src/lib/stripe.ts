import Stripe from "stripe"
import { env, stripeEnabled } from "@/lib/env"

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeEnabled()) {
    throw new Error("Stripe is not configured (STRIPE_SECRET_KEY missing)")
  }
  if (!_stripe) {
    _stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-04-22.dahlia",
      typescript: true,
    })
  }
  return _stripe
}

export const STRIPE_METADATA_USER_ID = "entrium_user_id"

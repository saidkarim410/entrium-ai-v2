import Link from "next/link"
import { redirect } from "next/navigation"
import { getCurrentProfile } from "@/lib/supabase/server"
import { stripeEnabled } from "@/lib/env"
import { PricingClient } from "./pricing-client"

export const dynamic = "force-dynamic"

export default async function PricingPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/login?next=/pricing")

  const enabled = stripeEnabled()
  const isPro = profile.tier === "pro"

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border/40 px-4 sm:px-6 shrink-0 overflow-hidden">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-base sm:text-lg tracking-tight truncate">Pricing</h1>
          <p className="font-mono-label text-cream-3 mt-0.5 truncate">
            {isPro ? "У тебя активная Pro-подписка" : "Открой Pro для безлимита"}
          </p>
        </div>
        <Link href="/dashboard" className="font-mono-label text-xs text-cream-3 hover:text-gold transition-colors">
          ← Dashboard
        </Link>
      </header>

      <PricingClient stripeEnabled={enabled} isPro={isPro} />
    </>
  )
}

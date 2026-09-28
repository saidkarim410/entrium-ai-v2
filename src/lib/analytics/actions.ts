"use server"

import { getCurrentUser } from "@/lib/supabase/server"
import { isProductEvent, trackEvent } from "./events"

/** Client components log product events through this action (user resolved server-side). */
export async function logEvent(event: string, props?: Record<string, unknown>): Promise<void> {
  if (!isProductEvent(event)) return
  const user = await getCurrentUser()
  trackEvent(user?.id ?? null, event, props, "web")
}

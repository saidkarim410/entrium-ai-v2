"use server"

import { getCurrentUser } from "@/lib/supabase/server"
import { signToken } from "@/lib/email"

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://entrium-ai-v2.vercel.app").replace(/\/$/, "")

export type CalendarFeed = {
  https: string
  webcal: string
}

/**
 * Returns subscribable iCalendar feed URLs for the current user.
 * Token-signed so calendar clients (Google/Apple/Outlook) can poll without auth.
 */
export async function getCalendarFeedUrl(): Promise<CalendarFeed | null> {
  const user = await getCurrentUser()
  if (!user) return null
  const token = signToken(user.id, "calendar")
  if (!token) return null

  const path = `/api/calendar.ics?token=${encodeURIComponent(token)}`
  return {
    https: `${SITE}${path}`,
    // webcal:// triggers the OS calendar app on iOS/macOS
    webcal: `${SITE.replace(/^https?:/, "webcal:")}${path}`,
  }
}

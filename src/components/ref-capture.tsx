"use client"

import { useEffect } from "react"
import { setReferralCookie } from "@/lib/referrals/actions"

/**
 * Reads ?ref=CODE from the URL and stashes it in a cookie via server action.
 * Mount on /signup so first-time visitors are linked to their referrer.
 */
export function RefCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get("ref")
    if (code && code.length <= 64) {
      setReferralCookie(code).catch(() => null)
    }
  }, [])
  return null
}

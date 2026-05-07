"use client"

import { useEffect, Suspense } from "react"
import posthog from "posthog-js"
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react"
import { usePathname, useSearchParams } from "next/navigation"

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com"

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!KEY) return
    posthog.init(KEY, {
      api_host: HOST,
      person_profiles: "identified_only",
      capture_pageview: false, // we manually track on route change
      capture_pageleave: true,
    })
  }, [])

  if (!KEY) return <>{children}</>
  return (
    <PHProvider client={posthog}>
      {children}
      <Suspense fallback={null}>
        <PageTracker />
      </Suspense>
    </PHProvider>
  )
}

function PageTracker() {
  const ph = usePostHog()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!ph || !pathname) return
    let url = window.origin + pathname
    const qs = searchParams?.toString()
    if (qs) url += `?${qs}`
    ph.capture("$pageview", { $current_url: url })
  }, [ph, pathname, searchParams])

  return null
}

"use client"
import { useEffect, useSyncExternalStore } from "react"

export type TgWebApp = {
  initData: string
  colorScheme: "light" | "dark"
  expand?: () => void
  ready?: () => void
  themeParams?: Record<string, string>
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp }
  }
}

function getWebApp(): TgWebApp | null {
  return (typeof window !== "undefined" && window.Telegram?.WebApp) || null
}

// initData is injected by Telegram at launch and never changes afterwards, so
// there is nothing to subscribe to — a no-op subscription is correct.
const subscribeNoop = () => () => {}

export function useTelegram() {
  // Server snapshots ("" / false) keep SSR + hydration consistent; the real
  // values resolve on the client without a setState-in-effect cascade.
  const initData = useSyncExternalStore(subscribeNoop, () => getWebApp()?.initData ?? "", () => "")
  const ready = useSyncExternalStore(subscribeNoop, () => true, () => false)

  useEffect(() => {
    const wa = getWebApp()
    wa?.ready?.()
    wa?.expand?.()
  }, [])

  return {
    webApp: getWebApp(),
    ready,
    initData,
    colorScheme: getWebApp()?.colorScheme ?? ("light" as const),
  }
}

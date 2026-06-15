"use client"
import { useEffect, useState } from "react"

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

export function useTelegram() {
  const [webApp, setWebApp] = useState<TgWebApp | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const wa = window.Telegram?.WebApp ?? null
    if (wa) {
      wa.ready?.()
      wa.expand?.()
    }
    setWebApp(wa)
    setReady(true)
  }, [])

  return {
    webApp,
    ready,
    initData: webApp?.initData ?? "",
    colorScheme: webApp?.colorScheme ?? ("light" as const),
  }
}

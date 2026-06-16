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

function getWebApp(): TgWebApp | null {
  return (typeof window !== "undefined" && window.Telegram?.WebApp) || null
}

type State = { initData: string; ready: boolean }

export function useTelegram() {
  const [state, setState] = useState<State>({ initData: "", ready: false })

  useEffect(() => {
    let tries = 0
    // The Telegram SDK script can finish loading slightly after hydration, and
    // initData is only populated once it does. Poll the bridge until the signed
    // launch data appears (or give up after ~6s and let the screen show a hint).
    const id = window.setInterval(() => {
      const wa = getWebApp()
      tries += 1
      if (wa && wa.initData) {
        wa.ready?.()
        wa.expand?.()
        setState({ initData: wa.initData, ready: true })
        window.clearInterval(id)
      } else if (tries >= 60) {
        setState((s) => (s.ready ? s : { ...s, ready: true }))
        window.clearInterval(id)
      }
    }, 100)
    return () => window.clearInterval(id)
  }, [])

  return {
    webApp: getWebApp(),
    ready: state.ready,
    initData: state.initData,
    colorScheme: getWebApp()?.colorScheme ?? ("light" as const),
  }
}

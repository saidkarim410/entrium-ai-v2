"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"

const BOT_USERNAME = "entriumleedbot"

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramUser) => void
  }
}

type TelegramUser = {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

export function TelegramButton() {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    window.onTelegramAuth = async (user: TelegramUser) => {
      setPending(true)
      try {
        const res = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(user),
        })
        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error ?? "Ошибка входа через Telegram")
          return
        }
        router.push(data.redirect ?? "/dashboard")
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Network error")
      } finally {
        setPending(false)
      }
    }

    // Inject Telegram widget script
    const container = containerRef.current
    if (!container) return
    const script = document.createElement("script")
    script.src = "https://telegram.org/js/telegram-widget.js?22"
    script.async = true
    script.setAttribute("data-telegram-login", BOT_USERNAME)
    script.setAttribute("data-size", "large")
    script.setAttribute("data-userpic", "false")
    script.setAttribute("data-onauth", "onTelegramAuth(user)")
    script.setAttribute("data-request-access", "write")
    container.appendChild(script)

    return () => {
      delete window.onTelegramAuth
      if (script.parentNode) script.parentNode.removeChild(script)
    }
  }, [router])

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="flex justify-center [&_iframe]:!w-full" />
      {pending && (
        <Button variant="outline" disabled className="w-full h-10 gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Входим через Telegram...
        </Button>
      )}
      {!pending && (
        <Button variant="outline" disabled className="w-full h-10 gap-2 hidden">
          <Send className="h-4 w-4" />
          Telegram
        </Button>
      )}
    </div>
  )
}

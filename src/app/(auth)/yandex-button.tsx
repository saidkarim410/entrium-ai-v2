"use client"

import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

/**
 * Yandex OAuth via Supabase Auth.
 *
 * Setup checklist (one-time, by an operator):
 *   1. https://oauth.yandex.ru → register a new app
 *      • Permissions: login:info, login:email, login:avatar
 *      • Redirect URI: https://zcbbpqfdyqavdubzrgaf.supabase.co/auth/v1/callback
 *   2. Supabase Dashboard → Authentication → Providers → Yandex
 *      • Enable, paste Client ID + Client Secret
 *   3. (no env vars required — Supabase handles the exchange)
 */
export function YandexButton({ next = "/dashboard" }: { next?: string }) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    // Supabase exposes Yandex as the "yandex" provider key.
    // TS types in @supabase/ssr predate this provider — the cast is safe.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "yandex" as never,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
    if (error) {
      setLoading(false)
      console.error(error)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={loading}
      className="w-full h-10 gap-2"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
          <rect width="24" height="24" rx="4" fill="#FC3F1D" />
          <path
            d="M13.7 18.2h-2v-5.4l-3.2-7.4h2.2l2 5 2-5h2.2L13.7 12.8v5.4z"
            fill="#fff"
          />
        </svg>
      )}
      {loading ? "Перенаправляем..." : "Продолжить с Yandex"}
    </Button>
  )
}

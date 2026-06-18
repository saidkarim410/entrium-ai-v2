"use client"

import { useEffect, useState } from "react"
import { Bell, BellOff } from "lucide-react"
import { useTelegram } from "@/lib/telegram/webapp"

/**
 * One-tap Telegram-reminder opt-out for the Mini App hub. Flips
 * applicant_data._notification_prefs.telegramPush via /api/tg/notifications.
 * Renders nothing until the current state is known (avoids a flash/wrong tap).
 */
export function NotificationsToggle() {
  const { initData, ready } = useTelegram()
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!initData) return
    fetch("/api/tg/notifications", { headers: { "x-telegram-init-data": initData } })
      .then((r) => r.json())
      .then((b: { telegramPush?: boolean }) => setEnabled(b.telegramPush ?? true))
      .catch(() => setEnabled(true))
  }, [initData])

  async function toggle() {
    if (enabled === null || busy || !initData) return
    const next = !enabled
    setBusy(true)
    setEnabled(next) // optimistic
    try {
      const res = await fetch("/api/tg/notifications", {
        method: "POST",
        headers: { "content-type": "application/json", "x-telegram-init-data": initData },
        body: JSON.stringify({ enabled: next }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch {
      setEnabled(!next) // revert on failure
    } finally {
      setBusy(false)
    }
  }

  if (!ready || !initData || enabled === null) return null

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy}
      className="card-hover mb-5 flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 disabled:opacity-60"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--brand-red-soft)] text-[var(--brand-red)]">
        {enabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1 text-left">
        <div className="text-sm font-bold leading-tight">Напоминания</div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {enabled ? "Бот напомнит о дедлайнах и прогрессе" : "Выключены — бот молчит"}
        </div>
      </div>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          enabled ? "bg-[var(--brand-red)]" : "bg-muted"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
            enabled ? "left-[22px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  )
}

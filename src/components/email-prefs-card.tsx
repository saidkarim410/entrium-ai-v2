"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Mail, Check, Eye, Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { setEmailDigestEnabled, type EmailPrefs } from "@/lib/email/actions"
import { cn } from "@/lib/utils"

export function EmailPrefsCard({ initial }: { initial: EmailPrefs }) {
  const [enabled, setEnabled] = useState(initial.digestEnabled)
  const [sending, setSending] = useState(false)
  const [, startTransition] = useTransition()

  function toggle() {
    const next = !enabled
    setEnabled(next)
    startTransition(async () => {
      const r = await setEmailDigestEnabled(next)
      if (!r.ok) {
        toast.error("Не удалось сохранить")
        setEnabled(!next)
        return
      }
      toast.success(next ? "Дайджест включён" : "Дайджест отключён")
    })
  }

  async function sendTest() {
    setSending(true)
    try {
      const res = await fetch("/api/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.message ?? json.error ?? "Не удалось отправить")
        return
      }
      toast.success(`Отправлено на ${json.to}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card/40 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-500/15 shrink-0">
          <Mail className="h-5 w-5 text-blue-300" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg">Email-дайджест</h3>
          <p className="font-serif text-sm text-cream-2 leading-relaxed">
            Раз в неделю присылаем сводку: ближайшие дедлайны, прогресс, рекомендация дня.
            Никакого спама — только то, что реально влияет на твоё поступление.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={toggle}
        aria-label={enabled ? "Отключить email-дайджест" : "Включить email-дайджест"}
        className={cn(
          "w-full flex items-center justify-between rounded-lg border p-3 transition-colors",
          enabled ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-card/40 hover:bg-card"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "grid h-5 w-5 place-items-center rounded border transition-all",
              enabled ? "bg-emerald-500 border-emerald-500" : "border-border"
            )}
            aria-hidden="true"
          >
            {enabled && <Check className="h-3 w-3 text-background" />}
          </div>
          <span className="font-display text-sm">
            {enabled ? "Включён" : "Выключен"}
          </span>
        </div>
        {initial.lastSentAt && (
          <span className="text-[10px] font-mono-label text-cream-3">
            последний {new Date(initial.lastSentAt).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" })}
          </span>
        )}
      </button>

      <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
        <Link href="/admin/email-preview" target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="gap-2">
            <Eye className="h-3.5 w-3.5" />
            Превью письма
          </Button>
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={sendTest}
          disabled={sending}
          className="gap-2"
        >
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          {sending ? "Отправляю..." : "Тест-письмо"}
        </Button>
      </div>

      <p className="text-[10px] font-mono-label text-cream-3">
        Отписаться можно одним кликом из любого письма. Тест-письмо требует RESEND_API_KEY в env.
      </p>
    </div>
  )
}

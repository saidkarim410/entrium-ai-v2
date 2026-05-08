"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Mail, Check } from "lucide-react"
import { setEmailDigestEnabled, type EmailPrefs } from "@/lib/email/actions"
import { cn } from "@/lib/utils"

export function EmailPrefsCard({ initial }: { initial: EmailPrefs }) {
  const [enabled, setEnabled] = useState(initial.digestEnabled)
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

      <p className="text-[10px] font-mono-label text-cream-3">
        Отписаться можно одним кликом из любого письма.
      </p>
    </div>
  )
}

"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Bell, Check, Clock, Send } from "lucide-react"
import { saveNotificationPrefs } from "@/lib/notifications/actions"
import { type NotificationPrefs } from "@/lib/notifications/prefs"
import { cn } from "@/lib/utils"

const TYPES: Array<{ key: keyof NotificationPrefs; label: string; desc: string }> = [
  { key: "deadline", label: "Дедлайны заявок", desc: "30/14/7/3/1/0 дней до дедлайна" },
  { key: "agent_done", label: "AI Agent готов", desc: "Когда миссия закончила работу" },
  { key: "referral", label: "Рефералы", desc: "Кто-то зарегистрировался по твоей ссылке" },
  { key: "tip", label: "AI-советы", desc: "Тактические подсказки от платформы" },
  { key: "system", label: "Системные", desc: "Важные обновления продукта" },
]

export function NotificationPrefsCard({ initial }: { initial: NotificationPrefs }) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(initial)
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function update(patch: Partial<NotificationPrefs>) {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    setSaved(false)
    startTransition(async () => {
      const r = await saveNotificationPrefs(patch)
      if (!r.ok) {
        toast.error(r.error ?? "Не удалось сохранить")
        setPrefs(prefs) // revert
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  const allOff = TYPES.every((t) => !prefs[t.key])

  return (
    <div className="rounded-xl border border-border bg-card/40 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-cream-3/15 shrink-0">
          <Bell className="h-5 w-5 text-cream-2" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display text-lg">Уведомления</h3>
            {saved && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono-label text-emerald-400">
                <Check className="h-3 w-3" />
                Сохранено
              </span>
            )}
          </div>
          <p className="font-serif text-sm text-cream-2 leading-relaxed">
            Выбери что важно — остальное не побеспокоит. Настройки применяются
            и в bell-меню, и в Telegram.
          </p>
        </div>
      </div>

      {/* Per-type toggles */}
      <div className="space-y-1.5">
        {TYPES.map((t) => {
          const on = Boolean(prefs[t.key])
          return (
            <Toggle
              key={t.key}
              label={t.label}
              desc={t.desc}
              on={on}
              onChange={(v) => update({ [t.key]: v } as Partial<NotificationPrefs>)}
              disabled={pending}
            />
          )
        })}
      </div>

      {allOff && (
        <p className="text-xs font-mono-label text-amber-400">
          ⚠️ Все типы выключены — ты не увидишь даже критичных дедлайнов
        </p>
      )}

      {/* Telegram + quiet hours */}
      <div className="border-t border-border/40 pt-4 space-y-3">
        <Toggle
          label="Telegram push"
          desc="Дублировать в @entriumleedbot когда привязан"
          icon={Send}
          on={prefs.telegramPush}
          onChange={(v) => update({ telegramPush: v })}
          disabled={pending}
        />

        {prefs.telegramPush && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="space-y-1.5">
              <Label className="font-mono-label text-[10px] text-cream-3 flex items-center gap-1.5">
                <Clock className="h-3 w-3" /> Тихие с
              </Label>
              <Input
                type="time"
                value={prefs.quietHoursStart ?? ""}
                onChange={(e) => update({ quietHoursStart: e.target.value || null })}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-mono-label text-[10px] text-cream-3 flex items-center gap-1.5">
                <Clock className="h-3 w-3" /> до
              </Label>
              <Input
                type="time"
                value={prefs.quietHoursEnd ?? ""}
                onChange={(e) => update({ quietHoursEnd: e.target.value || null })}
                className="h-9"
              />
            </div>
            {prefs.quietHoursStart && prefs.quietHoursEnd && (
              <p className="col-span-2 text-[10px] font-mono-label text-cream-3">
                В этот интервал Telegram-сообщения не приходят. В bell всё равно будут.
              </p>
            )}
            {(!prefs.quietHoursStart || !prefs.quietHoursEnd) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => update({ quietHoursStart: "22:00", quietHoursEnd: "08:00" })}
                disabled={pending}
                className="col-span-2 text-xs h-8"
              >
                Включить ночной режим (22:00 — 08:00)
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Toggle({
  label,
  desc,
  icon: Icon,
  on,
  onChange,
  disabled,
}: {
  label: string
  desc: string
  icon?: React.ComponentType<{ className?: string }>
  on: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      disabled={disabled}
      className={cn(
        "w-full flex items-start gap-3 rounded-lg border p-3 transition-colors text-left",
        on ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-card/40 hover:bg-card",
        disabled && "opacity-60 cursor-wait"
      )}
    >
      <div
        className={cn(
          "grid h-5 w-5 place-items-center rounded border shrink-0 mt-0.5 transition-all",
          on ? "bg-emerald-500 border-emerald-500" : "border-border"
        )}
      >
        {on && <Check className="h-3 w-3 text-background" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display text-sm flex items-center gap-1.5">
          {Icon && <Icon className="h-3.5 w-3.5 text-cream-3" />}
          {label}
        </p>
        <p className="font-mono-label text-[10px] text-cream-3 mt-0.5">{desc}</p>
      </div>
    </button>
  )
}

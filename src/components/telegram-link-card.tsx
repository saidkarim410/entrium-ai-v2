"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Send, Check, Copy, Unlink, Loader2 } from "lucide-react"
import { createTelegramLinkCode, unlinkTelegram, type TelegramStatus } from "@/lib/telegram-actions"

const BOT_USERNAME = "entriumleedbot" // adjust if env-driven later

export function TelegramLinkCard({ initial }: { initial: TelegramStatus }) {
  const [status, setStatus] = useState<TelegramStatus>(initial)
  const [pending, startTransition] = useTransition()
  const [generatedCode, setGeneratedCode] = useState<string | null>(initial.pendingCode)

  function generate() {
    startTransition(async () => {
      const r = await createTelegramLinkCode()
      if (!r.ok || !r.code) {
        toast.error(r.error ?? "Не удалось создать код")
        return
      }
      setGeneratedCode(r.code)
      setStatus((s) => ({ ...s, pendingCode: r.code ?? null }))
      toast.success("Код создан · действует 30 минут")
    })
  }

  function copyDeepLink() {
    if (!generatedCode) return
    const link = `https://t.me/${BOT_USERNAME}?start=${generatedCode}`
    navigator.clipboard?.writeText(link)
    toast.success("Ссылка скопирована")
  }

  function unlink() {
    if (!confirm("Отвязать Telegram-аккаунт?")) return
    startTransition(async () => {
      const r = await unlinkTelegram()
      if (!r.ok) {
        toast.error(r.error ?? "Не удалось отвязать")
        return
      }
      setStatus({ connected: false, username: null, pendingCode: null, pendingExpiresAt: null })
      setGeneratedCode(null)
      toast.success("Telegram отвязан")
    })
  }

  if (status.connected) {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/15 shrink-0">
            <Check className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-lg">Telegram подключён</h3>
            <p className="font-serif text-sm text-cream-2">
              Чат с AI-консультантом доступен в{" "}
              <a
                href={`https://t.me/${BOT_USERNAME}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold hover:underline"
              >
                @{BOT_USERNAME}
              </a>
              {status.username ? ` · @${status.username}` : ""}. Спрашивай что угодно про поступление.
            </p>
          </div>
        </div>
        <div className="border-t border-emerald-500/20 pt-3">
          <Button variant="outline" size="sm" onClick={unlink} disabled={pending} className="gap-2">
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
            Отвязать
          </Button>
        </div>
      </div>
    )
  }

  const link = generatedCode ? `https://t.me/${BOT_USERNAME}?start=${generatedCode}` : null

  return (
    <div className="rounded-xl border border-border bg-card/40 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-500/15 shrink-0">
          <Send className="h-5 w-5 text-blue-300" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg">Подключи Telegram</h3>
          <p className="font-serif text-sm text-cream-2 leading-relaxed">
            Общайся с AI-консультантом прямо из Telegram —{" "}
            <span className="text-gold">@{BOT_USERNAME}</span>. Бот знает твой профиль, заявки и контекст.
          </p>
        </div>
      </div>

      {!generatedCode ? (
        <Button onClick={generate} disabled={pending} className="gap-2">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Создать код привязки
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border border-gold/30 bg-gold/5 p-3">
            <p className="font-mono-label text-[11px] text-cream-3 mb-1">КОД (действует 30 мин)</p>
            <p className="font-mono text-2xl tracking-widest text-gold">{generatedCode}</p>
          </div>

          <ol className="space-y-1.5 text-sm font-serif text-cream-2 list-decimal pl-5">
            <li>
              Открой бота:{" "}
              <a href={link!} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">
                t.me/{BOT_USERNAME}
              </a>
            </li>
            <li>
              Нажми <span className="text-cream font-mono">/start</span> и пришли код
            </li>
            <li>Готово — бот ответит «Аккаунт привязан»</li>
          </ol>

          <div className="flex flex-wrap gap-2 pt-1 border-t border-border/40">
            <Button variant="outline" size="sm" onClick={copyDeepLink} className="gap-2">
              <Copy className="h-3.5 w-3.5" />
              Скопировать ссылку
            </Button>
            <a href={link!} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="gap-2">
                <Send className="h-3.5 w-3.5" />
                Открыть Telegram
              </Button>
            </a>
            <Button variant="ghost" size="sm" onClick={generate} disabled={pending}>
              Обновить код
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

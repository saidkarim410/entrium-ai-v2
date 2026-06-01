"use client"

import { useState } from "react"
import { Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { sendBroadcast, type BroadcastResult } from "./actions"

export function BroadcastForm({ linkedTelegramCount }: { linkedTelegramCount: number }) {
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<BroadcastResult | null>(null)
  const [message, setMessage] = useState("")
  const [tier, setTier] = useState<"all" | "pro" | "free">("all")

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!confirm(`Отправить ${tier === "all" ? "ВСЕМ" : tier.toUpperCase()} пользователям с linked Telegram?`)) {
      return
    }
    const fd = new FormData(e.currentTarget)
    setPending(true)
    setResult(null)
    const r = await sendBroadcast(fd)
    setPending(false)
    setResult(r)
    if (r.ok) setMessage("")
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="font-mono-label text-[10px] uppercase tracking-wider text-white/55 block mb-1.5">
          Аудитория
        </label>
        <select
          name="tier"
          value={tier}
          onChange={(e) => setTier(e.target.value as "all" | "pro" | "free")}
          className="w-full bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-2 text-sm text-white"
        >
          <option value="all">Все ({linkedTelegramCount} с linked TG)</option>
          <option value="pro">Только Pro</option>
          <option value="free">Только Free</option>
        </select>
      </div>

      <div>
        <label className="font-mono-label text-[10px] uppercase tracking-wider text-white/55 block mb-1.5">
          Сообщение (HTML разрешён: &lt;b&gt;, &lt;i&gt;, &lt;a href&gt;, &lt;code&gt;)
        </label>
        <textarea
          name="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          maxLength={4000}
          required
          placeholder="Дорогие абитуриенты, напоминаем что..."
          className="w-full bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 resize-y"
        />
        <p className="font-mono-label text-[10px] text-white/40 mt-1">
          {message.length} / 4000
        </p>
      </div>

      <button
        type="submit"
        disabled={pending || !message.trim()}
        className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-red)] text-white px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {pending ? "Отправляем..." : "Отправить broadcast"}
      </button>

      {result && (
        <div
          className={`rounded-xl border p-4 flex items-start gap-3 ${
            result.ok
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-rose-500/30 bg-rose-500/5"
          }`}
        >
          {result.ok ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5" />
              <div className="flex-1 text-sm">
                <div className="font-display mb-1">Отправлено</div>
                <div className="text-white/65">
                  Успешно: <strong className="text-white">{result.sent}</strong> ·{" "}
                  Ошибок: <strong className="text-white">{result.failed}</strong> ·{" "}
                  Аудитория: <strong className="text-white">{result.tier}</strong>
                </div>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="h-5 w-5 text-rose-400 mt-0.5" />
              <div className="flex-1 text-sm">
                <div className="font-display mb-1">Не удалось</div>
                <div className="text-rose-200/85">{result.error}</div>
              </div>
            </>
          )}
        </div>
      )}
    </form>
  )
}

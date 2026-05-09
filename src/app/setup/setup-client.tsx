"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Database, Cloud, Send, ExternalLink, Loader2, Check, X, AlertCircle, Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"

type StepResult = {
  step: string
  ok: boolean
  message: string
  details?: string[]
}

type SetupResponse = {
  success: boolean
  steps: StepResult[]
  message?: string
}

const PRESET_TG_TOKEN = "8781529396:AAFUCY0WzeTwI5Ax57yfjxyQg7US0RcrrgM"

export function SetupClient({ userEmail }: { userEmail: string }) {
  const [supabaseToken, setSupabaseToken] = useState("")
  const [vercelToken, setVercelToken] = useState("")
  const [tgBotToken, setTgBotToken] = useState(PRESET_TG_TOKEN)
  const [resendKey, setResendKey] = useState("")
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<SetupResponse | null>(null)

  async function run() {
    if (!supabaseToken.startsWith("sbp_")) {
      alert("Supabase token должен начинаться с sbp_")
      return
    }
    if (!vercelToken.trim()) {
      alert("Vercel token обязателен")
      return
    }

    setRunning(true)
    setResult(null)

    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supabaseToken: supabaseToken.trim(),
          vercelToken: vercelToken.trim(),
          tgBotToken: tgBotToken.trim() || undefined,
          resendKey: resendKey.trim() || undefined,
        }),
      })

      const json = (await res.json()) as SetupResponse
      setResult(json)
    } catch (err) {
      setResult({
        success: false,
        steps: [],
        message: err instanceof Error ? err.message : "Network error",
      })
    } finally {
      setRunning(false)
    }
  }

  if (result) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div
          className={cn(
            "rounded-xl border p-6 space-y-3",
            result.success
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-rose-500/30 bg-rose-500/5"
          )}
        >
          {result.success ? (
            <Check className="h-8 w-8 text-emerald-400" />
          ) : (
            <AlertCircle className="h-8 w-8 text-rose-400" />
          )}
          <h2 className="font-display text-2xl tracking-tight">
            {result.success ? "Готово ✨" : "Что-то пошло не так"}
          </h2>
          <p className="font-serif text-cream-2">
            {result.success
              ? "Платформа настроена. Все миграции применены, env vars установлены, Telegram-бот подключён."
              : result.message ?? "Часть шагов не выполнилась — детали ниже."}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card/40 p-5 space-y-3">
          <h3 className="font-display text-lg">Шаги</h3>
          <ul className="space-y-3">
            {result.steps.map((s, i) => (
              <li
                key={i}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3",
                  s.ok ? "border-emerald-500/20 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5"
                )}
              >
                <div
                  className={cn(
                    "grid h-6 w-6 place-items-center rounded-full shrink-0 mt-0.5",
                    s.ok ? "bg-emerald-500/20" : "bg-rose-500/20"
                  )}
                >
                  {s.ok ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <X className="h-3.5 w-3.5 text-rose-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-sm">{s.step}</p>
                  <p className={cn("font-serif text-xs leading-relaxed mt-0.5", s.ok ? "text-cream-2" : "text-rose-300")}>
                    {s.message}
                  </p>
                  {s.details && s.details.length > 0 && (
                    <ul className="mt-1 space-y-0.5 font-mono-label text-[10px] text-cream-3">
                      {s.details.map((d, j) => (
                        <li key={j}>· {d}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap gap-3">
          {result.success && (
            <>
              <Link href="/dashboard">
                <Button>Открыть Dashboard →</Button>
              </Link>
              <a href="https://t.me/entriumleedbot" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="gap-2">
                  <Send className="h-4 w-4" />
                  Открыть @entriumleedbot
                </Button>
              </a>
            </>
          )}
          {!result.success && (
            <Button variant="outline" onClick={() => setResult(null)}>
              Попробовать ещё раз
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="space-y-2">
        <h2 className="font-display text-3xl tracking-tight">Один клик · все настройки</h2>
        <p className="font-serif text-cream-2 leading-relaxed">
          Дай мне 2 токена — применю все миграции, выставлю env vars в Vercel,
          подключу Telegram-бот. ~30 секунд.
        </p>
      </div>

      <div className="space-y-5">
        {/* Supabase token */}
        <div className="rounded-xl border border-border bg-card/40 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/15 shrink-0">
              <Database className="h-4 w-4 text-emerald-300" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-base">Supabase Access Token</h3>
              <p className="font-serif text-xs text-cream-2 mt-0.5">
                Чтобы применить SQL миграции через Management API.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="font-mono-label text-[11px] text-cream-3">Token (sbp_...)</Label>
            <Input
              type="password"
              value={supabaseToken}
              onChange={(e) => setSupabaseToken(e.target.value)}
              placeholder="sbp_xxxxxxxxxxxxxxxxxxxx"
              autoComplete="off"
            />
            <a
              href="https://supabase.com/dashboard/account/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-mono-label text-gold hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Получить → supabase.com/dashboard/account/tokens
            </a>
            <p className="text-[10px] font-mono-label text-cream-3">
              Жми «Generate new token» · scope: All · скопируй и вставь сюда
            </p>
          </div>
        </div>

        {/* Vercel token */}
        <div className="rounded-xl border border-border bg-card/40 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-cream/10 shrink-0">
              <Cloud className="h-4 w-4 text-cream" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-base">Vercel Token</h3>
              <p className="font-serif text-xs text-cream-2 mt-0.5">
                Чтобы добавить env vars и триггернуть передеплой.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="font-mono-label text-[11px] text-cream-3">Token</Label>
            <Input
              type="password"
              value={vercelToken}
              onChange={(e) => setVercelToken(e.target.value)}
              placeholder="vercel_xxxxxxxxxxxxxxxxxx"
              autoComplete="off"
            />
            <a
              href="https://vercel.com/account/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-mono-label text-gold hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Получить → vercel.com/account/tokens
            </a>
            <p className="text-[10px] font-mono-label text-cream-3">
              «Create» · название: entrium-setup · scope: Full Account · expiration: 1 day
            </p>
          </div>
        </div>

        {/* Telegram (preset) */}
        <details className="rounded-xl border border-border bg-card/30 p-4">
          <summary className="cursor-pointer font-display text-sm flex items-center gap-2">
            <Send className="h-4 w-4 text-blue-300" />
            Telegram bot · уже подставлен
          </summary>
          <div className="mt-3 space-y-2">
            <Label className="font-mono-label text-[11px] text-cream-3">Bot token</Label>
            <Input
              type="password"
              value={tgBotToken}
              onChange={(e) => setTgBotToken(e.target.value)}
              autoComplete="off"
            />
            <p className="text-[10px] font-mono-label text-cream-3">
              По умолчанию — @entriumleedbot. Можно поменять на свой.
            </p>
          </div>
        </details>

        {/* Resend (optional) */}
        <details className="rounded-xl border border-border bg-card/30 p-4">
          <summary className="cursor-pointer font-display text-sm flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-cream-3" />
            Resend (email digest) · опционально
          </summary>
          <div className="mt-3 space-y-2">
            <Label className="font-mono-label text-[11px] text-cream-3">API key (re_...)</Label>
            <Input
              type="password"
              value={resendKey}
              onChange={(e) => setResendKey(e.target.value)}
              placeholder="re_xxxxxxxxxxxxxxxxxx"
              autoComplete="off"
            />
            <p className="text-[10px] font-mono-label text-cream-3">
              Можно пропустить — email-дайджест включится позже когда добавишь.
            </p>
          </div>
        </details>
      </div>

      <Button onClick={run} disabled={running} className="w-full h-12 gap-2">
        {running ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Делаю всё за тебя...
          </>
        ) : (
          <>
            <Zap className="h-4 w-4" />
            Запустить setup
          </>
        )}
      </Button>

      <p className="text-[10px] font-mono-label text-cream-3 text-center leading-relaxed">
        Токены передаются один раз и не сохраняются. После работы wizard&apos;a удали их
        в Supabase / Vercel дашбордах если переживаешь за безопасность.
        Аккаунт: <span className="text-cream-2">{userEmail}</span>
      </p>
    </div>
  )
}

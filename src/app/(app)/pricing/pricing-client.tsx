"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Loader2, Sparkles, Crown, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

const FREE_FEATURES = [
  "10 запросов в день",
  "Все 11 AI-инструментов",
  "AI Counselor (чат)",
  "Поиск по 1500+ университетам и стипендиям",
  "История запросов · 30 дней",
  "Profile + Application Tracker",
]

const PRO_FEATURES = [
  "Безлимит запросов",
  "Claude Sonnet 4.5 (самая сильная модель)",
  "AI Agent · все миссии",
  "Document upload + AI parse",
  "Приоритетная скорость",
  "История · навсегда",
  "Email-поддержка в течение 24 часов",
]

type Plan = "monthly" | "yearly"

const PRICES = {
  monthly: { price: 19, period: "/мес", savings: null },
  yearly: { price: 15, period: "/мес", savings: "Экономия $48/год" },
}

export function PricingClient({
  stripeEnabled,
  isPro,
}: {
  stripeEnabled: boolean
  isPro: boolean
}) {
  const [plan, setPlan] = useState<Plan>("yearly")
  const [pending, setPending] = useState<"checkout" | "portal" | null>(null)

  async function checkout() {
    if (!stripeEnabled) {
      toast.error("Stripe пока не настроен — свяжись с поддержкой")
      return
    }
    setPending("checkout")
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })
      const json = await res.json()
      if (!res.ok || !json.url) {
        toast.error(json.message ?? json.error ?? "Ошибка")
        return
      }
      window.location.href = json.url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось открыть Checkout")
    } finally {
      setPending(null)
    }
  }

  async function portal() {
    setPending("portal")
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" })
      const json = await res.json()
      if (!res.ok || !json.url) {
        toast.error(json.message ?? json.error ?? "Ошибка")
        return
      }
      window.location.href = json.url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось открыть Portal")
    } finally {
      setPending(null)
    }
  }

  const p = PRICES[plan]

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-xs font-mono-label text-gold">
            <Sparkles className="h-3 w-3" />
            Pro · безлимит, лучшая модель
          </div>
          <h2 className="font-display text-3xl sm:text-4xl tracking-tight">
            Поступление — это не место для экономии
          </h2>
          <p className="font-serif text-cream-2 text-base max-w-2xl mx-auto leading-relaxed">
            Free версия даёт попробовать. Pro — для тех, кто реально подаёт документы:
            безлимит запросов, лучшая AI-модель, AI Agent и парсинг документов.
          </p>
        </div>

        {/* Plan toggle */}
        <div className="flex justify-center">
          <div className="inline-flex rounded-full border border-border bg-card/40 p-1">
            <button
              onClick={() => setPlan("monthly")}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-mono-label transition-colors",
                plan === "monthly" ? "bg-gold text-background" : "text-cream-2 hover:text-cream"
              )}
            >
              Месяц
            </button>
            <button
              onClick={() => setPlan("yearly")}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-mono-label transition-colors",
                plan === "yearly" ? "bg-gold text-background" : "text-cream-2 hover:text-cream"
              )}
            >
              Год
              <span className="ml-2 text-[10px] text-emerald-400">−20%</span>
            </button>
          </div>
        </div>

        {/* Two-card grid */}
        <div className="grid md:grid-cols-2 gap-5">
          {/* Free */}
          <div className="rounded-2xl border border-border bg-card/40 p-6 space-y-5">
            <div>
              <p className="font-mono-label text-[11px] text-cream-3 uppercase tracking-wider">Free</p>
              <p className="font-display text-3xl mt-1">$0<span className="text-base text-cream-3">/мес</span></p>
              <p className="font-serif text-sm text-cream-2 mt-2">Чтобы попробовать.</p>
            </div>
            <ul className="space-y-2 border-t border-border/40 pt-5">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm font-serif text-cream-2">
                  <Check className="h-4 w-4 text-cream-3 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            {!isPro && (
              <Button variant="outline" className="w-full" disabled>
                Текущий план
              </Button>
            )}
          </div>

          {/* Pro */}
          <div className="relative rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/10 via-card/60 to-transparent p-6 space-y-5 ring-1 ring-gold/20">
            <Badge className="absolute -top-3 left-6 bg-gold text-background border-0">
              <Crown className="h-3 w-3 mr-1" />
              Recommended
            </Badge>

            <div>
              <p className="font-mono-label text-[11px] text-gold uppercase tracking-wider">Pro</p>
              <p className="font-display text-3xl mt-1">
                ${p.price}
                <span className="text-base text-cream-3">{p.period}</span>
              </p>
              <p className="font-serif text-sm text-cream-2 mt-2">
                {plan === "yearly"
                  ? "$180 в год · списывается раз в 12 мес."
                  : "Списывается ежемесячно · отмена в любое время"}
              </p>
              {p.savings && (
                <p className="text-xs text-emerald-400 font-mono-label mt-1">{p.savings}</p>
              )}
            </div>

            <ul className="space-y-2 border-t border-gold/20 pt-5">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm font-serif text-cream-2">
                  <Check className="h-4 w-4 text-gold mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            {isPro ? (
              <Button onClick={portal} disabled={pending === "portal"} className="w-full" variant="outline">
                {pending === "portal" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Crown className="h-4 w-4 mr-2" />
                )}
                Управлять подпиской
              </Button>
            ) : (
              <Button onClick={checkout} disabled={pending === "checkout" || !stripeEnabled} className="w-full gap-2">
                {pending === "checkout" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                {stripeEnabled ? "Открыть Pro" : "Скоро · Stripe настраивается"}
              </Button>
            )}
          </div>
        </div>

        {/* FAQ-lite */}
        <div className="rounded-xl border border-border bg-card/30 p-5 space-y-3">
          <h3 className="font-display text-base">Частые вопросы</h3>
          <div className="space-y-3 text-sm font-serif text-cream-2">
            <div>
              <p className="text-cream font-medium">Можно отменить?</p>
              <p>Да, в любой момент через Customer Portal — доступ останется до конца оплаченного периода.</p>
            </div>
            <div>
              <p className="text-cream font-medium">Что если Free хватает?</p>
              <p>Отлично, оставайся на Free. Pro нужен только когда 10 запросов/день перестают хватать (обычно в финальные 2 месяца до дедлайнов).</p>
            </div>
            <div>
              <p className="text-cream font-medium">Возврат?</p>
              <p>Если AI не помог — напиши <span className="text-gold">hello@entrium.ai</span> в течение 7 дней, вернём за месяц без вопросов.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

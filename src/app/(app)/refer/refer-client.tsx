"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Gift, Copy, Send, Share2, MessageCircle,
  Check, X, Users, Sparkles,
} from "lucide-react"
import type { ReferralStatus } from "@/lib/referrals/actions"
import { cn } from "@/lib/utils"

const REWARD = 10

export function ReferClient({ status }: { status: ReferralStatus }) {
  const [copied, setCopied] = useState(false)

  if (!status.code) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 text-center">
          <p className="font-display text-lg">Реферальный код пока не сгенерирован</p>
          <p className="font-mono-label text-sm text-cream-3 mt-2">
            Перезагрузи страницу или вернись после следующего входа.
          </p>
        </div>
      </div>
    )
  }

  const inviteText =
    `Использую Entrium AI — поступаю с AI-консультантом. ` +
    `Зарегистрируйся по моей ссылке и оба получим +${REWARD} запросов: ` +
    status.link

  function copyLink() {
    navigator.clipboard?.writeText(status.link)
    setCopied(true)
    toast.success("Ссылка скопирована")
    setTimeout(() => setCopied(false), 2000)
  }

  function shareTelegram() {
    const url = `https://t.me/share/url?url=${encodeURIComponent(status.link)}&text=${encodeURIComponent("Вот мой инвайт в Entrium AI ✨ +" + REWARD + " запросов на старт.")}`
    window.open(url, "_blank")
  }

  function shareWhatsapp() {
    const url = `https://wa.me/?text=${encodeURIComponent(inviteText)}`
    window.open(url, "_blank")
  }

  function shareTwitter() {
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(inviteText)}`
    window.open(url, "_blank")
  }

  function shareNative() {
    if (typeof navigator !== "undefined" && (navigator as Navigator).share) {
      ;(navigator as Navigator).share({
        title: "Entrium AI",
        text: "Поступай с AI-консультантом — +10 запросов на старт",
        url: status.link,
      })
    } else {
      copyLink()
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
        {/* Hero */}
        <section className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 via-card/40 to-transparent p-6 sm:p-8 space-y-4">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-gold/20 shrink-0">
              <Gift className="h-6 w-6 text-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-2xl sm:text-3xl tracking-tight">
                Делись Entrium — получай запросы
              </h2>
              <p className="font-serif text-cream-2 leading-relaxed mt-1">
                За каждого друга, кто зарегистрируется по твоей ссылке и заполнит профиль —{" "}
                <span className="text-gold font-medium">+{REWARD} запросов</span> в твой бонусный пул.
                У друга сразу +{REWARD} запросов на старт.
              </p>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-3 gap-3">
          <Stat label="Приглашено" value={status.totalReferred} icon={Users} />
          <Stat label="Завершили онбординг" value={status.completed} icon={Check} highlight={status.completed > 0} />
          <Stat label="Бонус-запросы" value={status.bonusCredits} icon={Sparkles} highlight={status.bonusCredits > 0} />
        </section>

        {/* Link card */}
        <section className="rounded-xl border border-border bg-card/40 p-5 space-y-4">
          <div className="space-y-2">
            <p className="font-mono-label text-[11px] text-cream-3 uppercase tracking-wide">Твоя ссылка</p>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5">
              <code className="text-sm font-mono text-cream-2 truncate flex-1 min-w-0">{status.link}</code>
              <Button variant="ghost" size="sm" onClick={copyLink} className="gap-1.5 shrink-0">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Скопировано" : "Копировать"}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button onClick={shareTelegram} variant="outline" className="gap-2">
              <Send className="h-4 w-4" />
              Telegram
            </Button>
            <Button onClick={shareWhatsapp} variant="outline" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
            <Button onClick={shareTwitter} variant="outline" className="gap-2">
              <Share2 className="h-4 w-4" />
              X / Twitter
            </Button>
            <Button onClick={shareNative} className="gap-2 ml-auto">
              <Share2 className="h-4 w-4" />
              Поделиться
            </Button>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono-label text-cream-3 pt-2 border-t border-border/40">
            <Badge variant="outline" className="text-[10px] py-0 font-mono">
              code: {status.code}
            </Badge>
            <span>· можно вводить вручную при регистрации</span>
          </div>
        </section>

        {/* Recent referrals */}
        <section className="space-y-3">
          <h3 className="font-display text-lg">Недавние рефералы</h3>
          {status.recentReferrals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-card/20 p-6 text-center space-y-2">
              <Users className="h-6 w-6 text-cream-3 mx-auto" />
              <p className="font-serif text-sm text-cream-3">Пока никого. Поделись ссылкой выше →</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {status.recentReferrals.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card/40 p-3"
                >
                  <div
                    className={cn(
                      "grid h-8 w-8 place-items-center rounded-lg shrink-0",
                      r.completed ? "bg-emerald-500/15 text-emerald-300" : "bg-cream-3/10 text-cream-3"
                    )}
                  >
                    {r.completed ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-sm truncate">
                      {r.full_name ?? "Без имени"}
                    </p>
                    <p className="font-mono-label text-[10px] text-cream-3 truncate">
                      {r.completed ? "Заполнил профиль" : "Зарегистрировался · ждём онбординга"}
                    </p>
                  </div>
                  {r.completed ? (
                    <Badge className="text-[9px] py-0 px-1.5 bg-gold/15 text-gold border-gold/30">
                      +{REWARD}
                    </Badge>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* How it works */}
        <section className="rounded-xl border border-border bg-card/30 p-5">
          <h3 className="font-display text-base mb-3">Как это работает</h3>
          <ol className="space-y-2 text-sm font-serif text-cream-2 list-decimal pl-5">
            <li>Скопируй и пришли свою реферальную ссылку другу</li>
            <li>Друг регистрируется по ссылке (или вручную вводит код {status.code})</li>
            <li>Когда друг закончит онбординг — оба получаете +{REWARD} запросов</li>
            <li>Бонус-запросы используются после исчерпания дневного лимита</li>
          </ol>
        </section>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  icon: Icon,
  highlight,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card/40 p-4",
        highlight ? "border-gold/30" : "border-border"
      )}
    >
      <div className="flex items-center gap-1.5 text-cream-3 mb-1.5">
        <Icon className={cn("h-3.5 w-3.5", highlight && "text-gold")} />
        <span className="text-[10px] sm:text-[11px] font-mono-label uppercase tracking-wide truncate">
          {label}
        </span>
      </div>
      <p className={cn("font-display tracking-tight text-2xl sm:text-3xl", highlight && "text-gold")}>
        {value}
      </p>
    </div>
  )
}

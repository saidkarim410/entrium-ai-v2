"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, Check, CalendarClock, Sparkles, Lightbulb, Zap, Gift } from "lucide-react"
import {
  Sheet, SheetContent, SheetTrigger, SheetTitle, SheetClose,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { listNotifications, markRead, markAllRead } from "@/lib/notifications/actions"
import type { Notification, NotificationType } from "@/lib/notifications/types"
import { cn } from "@/lib/utils"

const ICONS: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  deadline: CalendarClock,
  agent_done: Sparkles,
  tip: Lightbulb,
  system: Zap,
  referral: Gift,
}

const COLORS: Record<NotificationType, string> = {
  deadline: "text-rose-300 bg-rose-500/15",
  agent_done: "text-gold bg-gold/15",
  tip: "text-blue-300 bg-blue-500/15",
  system: "text-cream-2 bg-cream-3/15",
  referral: "text-emerald-300 bg-emerald-500/15",
}

export function NotificationsBell({
  initialUnread = 0,
  variant = "sidebar",
}: {
  initialUnread?: number
  variant?: "sidebar" | "compact"
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[] | null>(null)
  const [unread, setUnread] = useState(initialUnread)
  const [pending, startTransition] = useTransition()

  // Fetch list when sheet opens
  useEffect(() => {
    if (!open || items !== null) return
    listNotifications(20).then((rows) => {
      setItems(rows)
      setUnread(rows.filter((n) => !n.read_at).length)
    })
  }, [open, items])

  // Refresh unread count whenever sheet closes (in case new ones arrived)
  useEffect(() => {
    if (open) return
    // Optionally re-fetch unread count via server action — keeping it simple
  }, [open])

  function onItemClick(n: Notification) {
    if (!n.read_at) {
      setItems((prev) => prev?.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)) ?? null)
      setUnread((u) => Math.max(0, u - 1))
      startTransition(async () => {
        await markRead(n.id)
        router.refresh()
      })
    }
    if (n.link) {
      setOpen(false)
      router.push(n.link)
    }
  }

  function clearAll() {
    if (unread === 0) return
    setItems((prev) => prev?.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })) ?? null)
    setUnread(0)
    startTransition(async () => {
      await markAllRead()
      router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Уведомления"
        className={cn(
          "relative inline-flex items-center justify-center transition-colors",
          variant === "sidebar"
            ? "h-9 w-9 rounded-lg text-cream-2 hover:bg-accent hover:text-foreground"
            : "h-9 w-9 rounded-lg text-cream-2 hover:text-cream"
        )}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 px-1 place-items-center rounded-full bg-rose-500 text-[10px] font-mono-label text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </SheetTrigger>
      <SheetContent
        side="right"
        className="rounded-l-2xl w-full sm:max-w-md max-h-screen overflow-y-auto"
      >
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3 border-b border-border/40">
          <SheetTitle className="font-display text-lg">Уведомления</SheetTitle>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll} disabled={pending} className="gap-1.5">
              <Check className="h-3 w-3" />
              Все прочитано
            </Button>
          )}
        </div>

        {items === null ? (
          <div className="p-8 text-center font-mono-label text-xs text-cream-3">Загрузка...</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <Bell className="h-8 w-8 text-cream-3 mx-auto" />
            <p className="font-display text-base">Тут пусто</p>
            <p className="font-serif text-sm text-cream-2 max-w-xs mx-auto">
              Когда появится что-то важное — дедлайн, готовая миссия, бонус — увидишь здесь.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            {items.map((n) => {
              const Icon = ICONS[n.type] ?? Bell
              const colorCls = COLORS[n.type] ?? COLORS.system
              return (
                <li key={n.id}>
                  <SheetClose
                    render={
                      <button
                        type="button"
                        onClick={() => onItemClick(n)}
                        className={cn(
                          "w-full text-left flex items-start gap-3 px-4 py-3.5 hover:bg-accent transition-colors",
                          !n.read_at && "bg-card/40"
                        )}
                      >
                        <div className={cn("grid h-8 w-8 place-items-center rounded-lg shrink-0", colorCls)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-start gap-2">
                            <p
                              className={cn(
                                "font-display text-sm flex-1 min-w-0",
                                !n.read_at && "text-foreground"
                              )}
                            >
                              {n.title}
                            </p>
                            {!n.read_at && (
                              <span className="h-1.5 w-1.5 rounded-full bg-gold mt-1.5 shrink-0" />
                            )}
                          </div>
                          {n.body && (
                            <p className="font-serif text-xs text-cream-2 leading-relaxed line-clamp-2">
                              {n.body}
                            </p>
                          )}
                          <p className="font-mono-label text-[10px] text-cream-3">
                            {timeAgo(n.created_at)}
                          </p>
                        </div>
                      </button>
                    }
                  />
                </li>
              )
            })}
          </ul>
        )}

        <div className="border-t border-border/40 p-4 mt-2">
          <Link
            href="/applications"
            onClick={() => setOpen(false)}
            className="text-xs font-mono-label text-cream-3 hover:text-gold transition-colors"
          >
            Подключи Telegram в /settings — будем дублировать важное в @entriumleedbot
            <Badge variant="outline" className="ml-2 text-[9px] py-0">→</Badge>
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime()
  const diff = Date.now() - t
  const min = Math.floor(diff / 60_000)
  if (min < 1) return "только что"
  if (min < 60) return `${min} мин назад`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `${hrs} ч назад`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days} дн. назад`
  return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" })
}

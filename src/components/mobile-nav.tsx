"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { LangSwitcher } from "@/components/lang-switcher"
import {
  Sheet, SheetContent, SheetTrigger, SheetTitle, SheetClose,
} from "@/components/ui/sheet"
import {
  LayoutDashboard, Bot, LayoutGrid, MoreHorizontal,
  Brain, Sparkles, Map, FileText, MessageSquare, Award, GraduationCap,
  Mail, FileUser, Wallet, ShieldCheck, History, UserCog, LogOut, ListChecks, Crown, Gift, CalendarDays, Trophy, Star,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

type ProfileShape = {
  email: string
  full_name?: string | null
  tier: string
}

const TOOLS: Array<{ slug: string; name: string; icon: LucideIcon }> = [
  { slug: "profile", name: "Профиль", icon: Brain },
  { slug: "analyzer", name: "Шансы", icon: Sparkles },
  { slug: "tracker", name: "Roadmap", icon: Map },
  { slug: "university", name: "Универы", icon: GraduationCap },
  { slug: "scholarship", name: "Стипендии", icon: Award },
  { slug: "essay", name: "Эссе", icon: FileText },
  { slug: "interview", name: "Interview", icon: MessageSquare },
  { slug: "recommendation", name: "Рекомендации", icon: Mail },
  { slug: "cv", name: "CV", icon: FileUser },
  { slug: "cost", name: "Бюджет", icon: Wallet },
  { slug: "reviewer", name: "Reviewer", icon: ShieldCheck },
]

const BROWSE: Array<{ href: string; name: string; icon: LucideIcon }> = [
  { href: "/shortlist", name: "Shortlist · ⭐", icon: Star },
  { href: "/universities", name: "Все университеты", icon: GraduationCap },
  { href: "/scholarships", name: "Все стипендии", icon: Award },
]

const ACCOUNT: Array<{ href: string; name: string; icon: LucideIcon }> = [
  { href: "/settings", name: "Профиль абитуриента", icon: UserCog },
  { href: "/activities", name: "Activities (Common App)", icon: Trophy },
  { href: "/applications", name: "Мои заявки", icon: ListChecks },
  { href: "/calendar", name: "Календарь", icon: CalendarDays },
  { href: "/history", name: "История", icon: History },
  { href: "/refer", name: "Рефералы · +10", icon: Gift },
]

export function MobileNav({
  profile,
  logoutAction,
}: {
  profile: ProfileShape
  logoutAction: () => Promise<void> | void
}) {
  const pathname = usePathname()
  const [toolsOpen, setToolsOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href)

  return (
    <>
      <nav
        aria-label="Mobile navigation"
        className={cn(
          "fixed bottom-0 left-0 right-0 z-40 lg:hidden",
          "h-16 border-t border-border/60 bg-popover/95 backdrop-blur",
          "grid grid-cols-4"
        )}
      >
        <NavTab
          href="/dashboard"
          label="Главная"
          icon={LayoutDashboard}
          active={isActive("/dashboard")}
        />
        <NavTab
          href="/agent"
          label="Agent"
          icon={Bot}
          active={isActive("/agent")}
          highlight
        />

        {/* Tools sheet trigger */}
        <Sheet open={toolsOpen} onOpenChange={setToolsOpen}>
          <SheetTrigger
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 px-1 transition-colors",
              pathname.startsWith("/tools/")
                ? "text-gold"
                : "text-cream-3 hover:text-cream"
            )}
          >
            <LayoutGrid className="h-5 w-5" />
            <span className="text-[10px] font-mono-label">Tools</span>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="rounded-t-2xl max-h-[85vh] overflow-y-auto pt-3"
          >
            <SheetTitle className="px-4 font-display text-lg">11 AI инструментов</SheetTitle>
            <div className="grid grid-cols-3 gap-2 p-4">
              {TOOLS.map(({ slug, name, icon: Icon }) => (
                <SheetClose
                  key={slug}
                  render={
                    <Link
                      href={`/tools/${slug}`}
                      className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card/40 p-3 hover:bg-card hover:border-gold/40 transition-colors text-center"
                    >
                      <Icon className="h-5 w-5 text-gold" />
                      <span className="text-[11px] font-serif text-cream-2 leading-tight">{name}</span>
                    </Link>
                  }
                />
              ))}
            </div>
            <div className="px-4 pb-2 text-xs font-mono-label text-cream-3 uppercase tracking-wider">
              Каталог
            </div>
            <div className="grid grid-cols-2 gap-2 px-4 pb-6">
              {BROWSE.map(({ href, name, icon: Icon }) => (
                <SheetClose
                  key={href}
                  render={
                    <Link
                      href={href}
                      className="flex items-center gap-2 rounded-lg border border-border bg-card/40 p-3 hover:bg-card hover:border-gold/40 transition-colors"
                    >
                      <Icon className="h-4 w-4 text-gold" />
                      <span className="text-sm font-serif text-cream-2">{name}</span>
                    </Link>
                  }
                />
              ))}
            </div>
          </SheetContent>
        </Sheet>

        {/* More sheet (account + history + logout) */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 px-1 transition-colors",
              pathname.startsWith("/settings") || pathname.startsWith("/history")
                ? "text-gold"
                : "text-cream-3 hover:text-cream"
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-mono-label">Ещё</span>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="rounded-t-2xl max-h-[85vh] overflow-y-auto pt-3"
          >
            <SheetTitle className="px-4 font-display text-lg">Аккаунт</SheetTitle>

            <div className="px-4 pt-2 pb-4">
              <div className="rounded-xl border border-border bg-card/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">
                    {profile.full_name ?? profile.email}
                  </span>
                  <Badge variant={profile.tier === "pro" ? "default" : "secondary"} className="text-[10px]">
                    {profile.tier === "pro" ? "Pro" : "Free"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground truncate">{profile.email}</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 px-4 pb-3">
              <span className="text-sm font-mono-label text-cream-3">Язык интерфейса</span>
              <LangSwitcher size="sm" />
            </div>

            <div className="px-2 pb-3">
              <SheetClose
                render={
                  <Link
                    href="/pricing"
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                      profile.tier === "pro"
                        ? "hover:bg-accent text-cream-2"
                        : "bg-gold/10 border border-gold/20 text-gold hover:bg-gold/20"
                    )}
                  >
                    <Crown className="h-4 w-4" />
                    {profile.tier === "pro" ? "Управлять Pro" : "Открыть Pro"}
                  </Link>
                }
              />
            </div>

            <div className="space-y-1 px-2 pb-4">
              {ACCOUNT.map(({ href, name, icon: Icon }) => (
                <SheetClose
                  key={href}
                  render={
                    <Link
                      href={href}
                      className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm hover:bg-accent transition-colors"
                    >
                      <Icon className="h-4 w-4 text-gold" />
                      {name}
                    </Link>
                  }
                />
              ))}
            </div>

            <form action={logoutAction} className="border-t border-border/40 p-4">
              <button
                type="submit"
                className="flex w-full items-center justify-start gap-3 rounded-lg px-3 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Выйти
              </button>
            </form>
          </SheetContent>
        </Sheet>
      </nav>
    </>
  )
}

function NavTab({
  href,
  label,
  icon: Icon,
  active,
  highlight,
}: {
  href: string
  label: string
  icon: LucideIcon
  active: boolean
  highlight?: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 px-1 transition-colors",
        active ? "text-gold" : "text-cream-3 hover:text-cream",
        highlight && !active && "text-cream"
      )}
    >
      <span className="relative">
        <Icon className="h-5 w-5" />
        {highlight && (
          <span className="absolute -top-0.5 -right-1 h-1.5 w-1.5 rounded-full bg-gold" />
        )}
      </span>
      <span className="text-[10px] font-mono-label">{label}</span>
    </Link>
  )
}

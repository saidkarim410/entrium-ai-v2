import { redirect } from "next/navigation"
import Link from "next/link"
import { getCurrentProfile } from "@/lib/supabase/server"
import { logoutAction } from "@/app/(auth)/actions"
import { getT } from "@/lib/i18n/server"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LangSwitcher } from "@/components/lang-switcher"
import dynamic from "next/dynamic"
// Lazy-load the floating Counselor chat — it's heavy (AI SDK client) and
// not needed for first paint. Loaded on client after main content renders.
const CounselorWidget = dynamic(
  () => import("@/components/counselor-widget").then((m) => m.CounselorWidget),
  { loading: () => null }
)
import { MobileNav } from "@/components/mobile-nav"
import { NotificationsBell } from "@/components/notifications-bell"
// CmdK is only needed when user actually presses Ctrl+K — defer chunk
const CmdK = dynamic(
  () => import("@/components/cmd-k").then((m) => m.CmdK),
  { loading: () => null }
)
// Ctrl+/ keyboard shortcuts cheat sheet — same defer treatment
const KbdOverlay = dynamic(
  () => import("@/components/kbd-overlay").then((m) => m.KbdOverlay),
  { loading: () => null }
)
import { CmdKTrigger } from "@/components/cmd-k-trigger"
import { MobileSearchTrigger } from "@/components/mobile-search-trigger"
import { unreadCount } from "@/lib/notifications/actions"
import {
  Sparkles, Brain, Sparkles as SparklesIcon, Map, FileText,
  MessageSquare, Award, GraduationCap, LogOut, LayoutDashboard, Mail, FileUser, Wallet, ShieldCheck,
  History, UserCog, Bot, ListChecks, Crown, Gift, CalendarDays, Trophy, Heart,
} from "lucide-react"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/login")

  const t = await getT()
  const unread = await unreadCount()
  const tools = [
    { slug: "profile", name: t.sidebar.tool_profile, icon: Brain },
    { slug: "analyzer", name: t.sidebar.tool_analyzer, icon: SparklesIcon },
    { slug: "tracker", name: t.sidebar.tool_tracker, icon: Map },
    { slug: "university", name: t.sidebar.tool_university, icon: GraduationCap },
    { slug: "scholarship", name: t.sidebar.tool_scholarship, icon: Award },
    { slug: "essay", name: t.sidebar.tool_essay, icon: FileText },
    { slug: "interview", name: t.sidebar.tool_interview, icon: MessageSquare },
    { slug: "recommendation", name: t.sidebar.tool_recommendation, icon: Mail },
    { slug: "cv", name: t.sidebar.tool_cv, icon: FileUser },
    { slug: "cost", name: t.sidebar.tool_cost, icon: Wallet },
    { slug: "reviewer", name: t.sidebar.tool_reviewer, icon: ShieldCheck },
  ]
  const browse = [
    { href: "/shortlist", name: "Shortlist · ❤", icon: Heart },
    { href: "/universities", name: t.sidebar.all_universities, icon: GraduationCap },
    { href: "/scholarships", name: t.sidebar.all_scholarships, icon: Award },
  ]
  const account = [
    { href: "/settings", name: "Профиль абитуриента", icon: UserCog },
    { href: "/activities", name: "Activities (Common App)", icon: Trophy },
    { href: "/essays", name: "Эссе", icon: FileText },
    { href: "/applications", name: "Мои заявки", icon: ListChecks },
    { href: "/calendar", name: "Календарь", icon: CalendarDays },
    { href: "/history", name: "История", icon: History },
    { href: "/refer", name: "Рефералы · +10", icon: Gift },
  ]

  return (
    <div className="grid h-screen lg:grid-cols-[260px_1fr]">
      {/* U-11 (TZ): keyboard-only "skip to content" — first focusable
          element on every page so screen-reader / keyboard users can
          bypass the sidebar nav. The .skip-link CSS in globals.css
          hides it off-screen until it receives focus. */}
      <a href="#main" className="skip-link">
        К содержимому
      </a>
      <aside className="hidden lg:flex flex-col border-r border-border/40 bg-card/30" aria-label="Главная навигация">
        <div className="flex h-16 items-center justify-between px-6 border-b border-border/40">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--brand-red)] text-white">
              <Heart className="h-4 w-4 fill-current" />
            </span>
            <span>Entrium AI</span>
          </Link>
          {/* Only the bell stays next to the logo — language switcher moved
              to the user-card footer below so the brand area isn't crowded. */}
          <NotificationsBell initialUnread={unread} variant="sidebar" />
        </div>

        {/* Cmd+K search trigger pinned right under header */}
        <div className="px-3 pt-3">
          <CmdKTrigger />
        </div>
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          <Link
            href="/agent"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground bg-gold/10 border border-gold/20 hover:bg-gold/15 transition-colors"
          >
            <Bot className="h-4 w-4 text-gold" />
            <span>AI Agent</span>
            <Badge variant="default" className="ml-auto text-[9px] py-0 px-1.5 bg-gold/20 text-gold border-gold/30">NEW</Badge>
          </Link>
          <div className="pt-4 pb-2 px-3 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
            {t.sidebar.tools}
          </div>
          {tools.map(({ slug, name, icon: Icon }) => (
            <Link
              key={slug}
              href={`/tools/${slug}`}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Icon className="h-4 w-4" />
              {name}
            </Link>
          ))}
          <div className="pt-4 pb-2 px-3 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
            {t.sidebar.browse}
          </div>
          {browse.map(({ href, name, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Icon className="h-4 w-4" />
              {name}
            </Link>
          ))}
          <div className="pt-4 pb-2 px-3 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
            Аккаунт
          </div>
          {account.map(({ href, name, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Icon className="h-4 w-4" />
              {name}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border/40 p-3">
          <div className="rounded-lg bg-accent/50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium truncate">{profile.full_name ?? profile.email}</span>
              <Badge variant={profile.tier === "pro" ? "default" : "secondary"} className="text-[10px]">
                {profile.tier === "pro" ? t.common.pro : t.common.free}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground truncate">{profile.email}</p>
            {profile.tier !== "pro" && (
              <Link
                href="/pricing"
                className="mt-3 flex items-center gap-2 rounded-md bg-gold/15 hover:bg-gold/25 border border-gold/30 px-3 py-2 text-xs font-medium text-gold transition-colors"
              >
                <Crown className="h-3.5 w-3.5" />
                Открыть Pro
              </Link>
            )}
            {profile.tier === "pro" && (
              <Link
                href="/pricing"
                className="mt-3 flex items-center gap-2 rounded-md hover:bg-accent px-3 py-2 text-xs text-muted-foreground transition-colors"
              >
                <Crown className="h-3.5 w-3.5" />
                Управлять Pro
              </Link>
            )}
            <form action={logoutAction} className="mt-2">
              <Button type="submit" variant="ghost" size="sm" className="w-full justify-start gap-2 h-8">
                <LogOut className="h-3.5 w-3.5" />
                {t.nav.logout}
              </Button>
            </form>
          </div>
          {/* Language switcher — sits at the bottom of the sidebar
              alongside the user card, less prominent than the logo,
              still discoverable. */}
          <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border/40">
            <span className="font-mono-label text-[10px] text-cream-3 uppercase tracking-wider">
              Язык
            </span>
            <LangSwitcher size="sm" />
          </div>
        </div>
      </aside>

      <main
        id="main"
        className="flex flex-col h-[calc(100dvh-4rem)] lg:h-screen overflow-hidden"
      >
        {children}
      </main>

      {/* Mobile-only floating Search + Bell (top-right) */}
      <div className="fixed top-2.5 right-3 z-30 lg:hidden flex items-center gap-1">
        <MobileSearchTrigger />
        <div className="rounded-lg bg-popover/85 backdrop-blur border border-border/50 p-0.5">
          <NotificationsBell initialUnread={unread} variant="compact" />
        </div>
      </div>

      {/* CmdK dialog rendered once globally — Ctrl+K hotkey works everywhere,
          sidebar CmdKTrigger and MobileSearchTrigger both fire `cmdk:open`
          custom event which this single instance listens for */}
      <CmdK />
      <KbdOverlay />

      <MobileNav
        profile={{ email: profile.email, full_name: profile.full_name, tier: profile.tier }}
        logoutAction={logoutAction}
      />
      <CounselorWidget />
    </div>
  )
}

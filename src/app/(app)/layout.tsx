import { redirect } from "next/navigation"
import Link from "next/link"
import { getCurrentProfile } from "@/lib/supabase/server"
import { logoutAction } from "@/app/(auth)/actions"
import { getT } from "@/lib/i18n/server"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LangSwitcher } from "@/components/lang-switcher"
import { CounselorWidget } from "@/components/counselor-widget"
import { MobileNav } from "@/components/mobile-nav"
import {
  Sparkles, Brain, Sparkles as SparklesIcon, Map, FileText,
  MessageSquare, Award, GraduationCap, LogOut, LayoutDashboard, Mail, FileUser, Wallet, ShieldCheck,
  History, UserCog, Bot, ListChecks,
} from "lucide-react"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/login")

  const t = await getT()
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
    { href: "/universities", name: t.sidebar.all_universities, icon: GraduationCap },
    { href: "/scholarships", name: t.sidebar.all_scholarships, icon: Award },
  ]
  const account = [
    { href: "/settings", name: "Профиль абитуриента", icon: UserCog },
    { href: "/applications", name: "Мои заявки", icon: ListChecks },
    { href: "/history", name: "История", icon: History },
  ]

  return (
    <div className="grid h-screen lg:grid-cols-[260px_1fr]">
      <aside className="hidden lg:flex flex-col border-r border-border/40 bg-card/30">
        <div className="flex h-16 items-center justify-between px-6 border-b border-border/40">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-foreground text-background">
              <Sparkles className="h-4 w-4" />
            </span>
            <span>Entrium AI</span>
          </Link>
          <LangSwitcher size="icon" />
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
            <form action={logoutAction} className="mt-3">
              <Button type="submit" variant="ghost" size="sm" className="w-full justify-start gap-2 h-8">
                <LogOut className="h-3.5 w-3.5" />
                {t.nav.logout}
              </Button>
            </form>
          </div>
        </div>
      </aside>

      <main className="flex flex-col h-[calc(100dvh-4rem)] lg:h-screen overflow-hidden">{children}</main>
      <MobileNav
        profile={{ email: profile.email, full_name: profile.full_name, tier: profile.tier }}
        logoutAction={logoutAction}
      />
      <CounselorWidget />
    </div>
  )
}

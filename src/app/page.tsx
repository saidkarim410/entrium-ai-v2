import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { LangSwitcher } from "@/components/lang-switcher"
import { getT } from "@/lib/i18n/server"
import { Sparkles, Brain, Map, FileText, Wand2, MessageSquare, Award, GraduationCap } from "lucide-react"

const ICONS = {
  profile: Brain,
  analyzer: Sparkles,
  tracker: Map,
  university: GraduationCap,
  scholarship: Award,
  essay: FileText,
  humanizer: Wand2,
  interview: MessageSquare,
} as const

export const dynamic = "force-dynamic"

export default async function LandingPage() {
  const t = await getT()
  const tools = (Object.keys(ICONS) as (keyof typeof ICONS)[]).map((k) => ({
    key: k,
    Icon: ICONS[k],
    title: t.tools[k].title,
    description: t.tools[k].desc,
  }))

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-foreground text-background">
              <Sparkles className="h-4 w-4" />
            </span>
            <span>Entrium AI</span>
          </Link>
          <nav className="flex items-center gap-2">
            <LangSwitcher />
            <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              {t.nav.signin}
            </Link>
            <Link href="/signup" className={buttonVariants({ size: "sm" })}>
              {t.nav.signup}
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border/40">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(120,119,198,0.15),transparent)]" />
          <div className="container mx-auto px-4 py-20 lg:py-32">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/50 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {t.landing.badge}
              </div>
              <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance md:text-6xl lg:text-7xl">
                {t.landing.h1_top}
                <br />
                <span className="bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                  {t.landing.h1_bottom}
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground text-balance">
                {t.landing.sub}
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <Link href="/signup" className={buttonVariants({ size: "lg", className: "h-12 px-8 text-base" })}>
                  {t.landing.cta_primary}
                </Link>
                <Link href="#tools" className={buttonVariants({ variant: "outline", size: "lg", className: "h-12 px-8 text-base" })}>
                  {t.landing.cta_secondary}
                </Link>
              </div>
              <p className="mt-6 text-xs text-muted-foreground">{t.landing.cta_note}</p>
            </div>
          </div>
        </section>

        <section id="tools" className="border-b border-border/40 py-20 lg:py-32">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{t.landing.tools_h2}</h2>
              <p className="mt-4 text-muted-foreground">{t.landing.tools_sub}</p>
            </div>
            <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {tools.map(({ key, Icon, title, description }) => (
                <div
                  key={key}
                  className="group rounded-2xl border border-border/60 bg-card/50 p-6 backdrop-blur transition-all hover:border-border hover:bg-card"
                >
                  <Icon className="h-6 w-6 text-foreground/80 transition-transform group-hover:scale-110" />
                  <h3 className="mt-4 font-medium tracking-tight">{title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 lg:py-32">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{t.landing.cta2_h2}</h2>
              <p className="mt-4 text-muted-foreground">{t.landing.cta2_sub}</p>
              <Link href="/signup" className={buttonVariants({ size: "lg", className: "mt-10 h-12 px-8 text-base" })}>
                {t.landing.cta_primary}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40 py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground md:flex-row">
          <p>© 2026 Entrium AI</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </>
  )
}

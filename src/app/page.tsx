import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { LangSwitcher } from "@/components/lang-switcher"
import { getLocale } from "@/lib/i18n/server"
import { LANDING } from "./landing-content"
import {
  ArrowRight, Sparkles, Bot, MessageCircle, Map, Award,
  GraduationCap, FileText, ShieldCheck, FileUser, Wallet, Brain, Mail,
  ListChecks, CalendarDays, Send, Upload, Globe, Gift, Share2, Zap, type LucideIcon,
} from "lucide-react"

export const dynamic = "force-dynamic"

const TOOL_ICONS: LucideIcon[] = [
  Brain, Sparkles, Map, GraduationCap, Award, FileText, MessageCircle, Mail, FileUser, Wallet, ShieldCheck,
]

const PLATFORM_ICONS: LucideIcon[] = [Bot, MessageCircle, ListChecks, Upload, CalendarDays, Send]

const HOW_ICONS: LucideIcon[] = [Brain, Bot, ListChecks]

const REASON_ICONS: LucideIcon[] = [Brain, Globe, Send, Share2, Gift, Zap]

export default async function LandingPage() {
  const locale = await getLocale()
  const t = LANDING[locale]

  return (
    <div className="min-h-screen bg-background text-cream">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gold text-background font-display font-bold text-base">E</span>
            <span className="font-display text-lg tracking-tight">Entrium</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 font-mono-label text-cream-3 text-xs uppercase tracking-wider">
            <a href="#tools" className="hover:text-cream transition-colors">{t.navTools}</a>
            <a href="#platform" className="hover:text-cream transition-colors">{t.navPlatform}</a>
            <a href="#how" className="hover:text-cream transition-colors">{t.navHow}</a>
            <a href="#faq" className="hover:text-cream transition-colors">{t.navFaq}</a>
          </nav>
          <div className="flex items-center gap-2">
            <LangSwitcher size="sm" />
            <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              {t.cta.signin}
            </Link>
            <Link href="/signup" className={buttonVariants({ size: "sm" })}>
              {t.cta.start}
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section id="main" className="relative overflow-hidden border-b border-border/40">
        <div className="container mx-auto px-4 py-16 sm:py-24 lg:py-28">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-xs font-mono-label text-gold uppercase tracking-wider">
              <Sparkles className="h-3 w-3" />
              {t.hero.badge}
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.05]">
              {t.hero.title.line1} <span className="italic text-gold">{t.hero.title.accent}</span>
              {t.hero.title.line2}
            </h1>
            <p className="font-serif text-lg text-cream-2 leading-relaxed max-w-2xl mx-auto">
              {t.hero.sub}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link href="/signup" className={buttonVariants({ size: "lg" })}>
                {t.cta.start}
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Link>
              <Link href="/agent" className={buttonVariants({ variant: "outline", size: "lg" })}>
                <Bot className="h-4 w-4 mr-1.5 text-gold" />
                {t.cta.tryAgent}
              </Link>
            </div>
            <p className="font-mono-label text-[11px] text-cream-3 uppercase tracking-wider pt-3">
              {t.hero.note}
            </p>
          </div>

          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {t.stats.map((s, i) => (
              <div key={i} className="text-center">
                <p className="font-display text-3xl sm:text-4xl tracking-tight text-gold">{s.number}</p>
                <p className="font-mono-label text-[10px] text-cream-3 uppercase tracking-wider mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Platform features ────────────────────────────────────────── */}
      <section id="platform" className="border-b border-border/40 py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <p className="font-mono-label text-[11px] text-gold uppercase tracking-wider mb-3">{t.platform.tag}</p>
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-3">{t.platform.h2}</h2>
            <p className="font-serif text-cream-2 leading-relaxed">{t.platform.sub}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {t.platform.items.map((f, i) => {
              const Icon = PLATFORM_ICONS[i] ?? Sparkles
              return (
                <div key={i} className="group rounded-xl border border-border bg-card/40 p-5 hover:border-gold/40 hover:bg-card transition-all">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-gold/15 group-hover:bg-gold/25 transition-colors mb-4">
                    <Icon className="h-5 w-5 text-gold" />
                  </div>
                  <h3 className="font-display text-lg mb-1.5">{f.title}</h3>
                  <p className="font-serif text-sm text-cream-2 leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── 11 tools ─────────────────────────────────────────────────── */}
      <section id="tools" className="border-b border-border/40 py-16 sm:py-24 bg-card/20">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <p className="font-mono-label text-[11px] text-gold uppercase tracking-wider mb-3">{t.tools.tag}</p>
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-3">{t.tools.h2}</h2>
            <p className="font-serif text-cream-2 leading-relaxed">{t.tools.sub}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-5xl mx-auto">
            {t.tools.items.map((tool, i) => {
              const Icon = TOOL_ICONS[i] ?? Sparkles
              return (
                <div key={i} className="rounded-xl border border-border bg-card/60 p-4 hover:border-gold/30 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-gold/10 shrink-0">
                      <Icon className="h-4 w-4 text-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-base">{tool.title}</h3>
                      <p className="font-serif text-sm text-cream-3 leading-relaxed mt-0.5">{tool.desc}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section id="how" className="border-b border-border/40 py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <p className="font-mono-label text-[11px] text-gold uppercase tracking-wider mb-3">{t.how.tag}</p>
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight">{t.how.h2}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {t.how.steps.map((s, i) => {
              const Icon = HOW_ICONS[i] ?? Sparkles
              return (
                <div key={i} className="rounded-xl border border-border bg-card/40 p-6 space-y-3 relative">
                  <span className="absolute top-4 right-4 font-display text-4xl text-gold/20">{s.step}</span>
                  <Icon className="h-6 w-6 text-gold" />
                  <h3 className="font-display text-lg">{s.title}</h3>
                  <p className="font-serif text-sm text-cream-2 leading-relaxed">{s.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Why us ───────────────────────────────────────────────────── */}
      <section className="border-b border-border/40 py-16 sm:py-24 bg-card/20">
        <div className="container mx-auto px-4 max-w-4xl">
          <p className="font-mono-label text-[11px] text-gold uppercase tracking-wider text-center mb-3">{t.why.tag}</p>
          <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-center mb-12">{t.why.h2}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {t.why.reasons.map((r, i) => {
              const Icon = REASON_ICONS[i] ?? Sparkles
              return (
                <div key={i} className="rounded-xl border border-border bg-card/40 p-5 flex gap-4">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-gold/15 shrink-0">
                    <Icon className="h-5 w-5 text-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-base mb-1">{r.title}</h3>
                    <p className="font-serif text-sm text-cream-2 leading-relaxed">{r.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section id="faq" className="border-b border-border/40 py-16 sm:py-24">
        <div className="container mx-auto px-4 max-w-3xl">
          <p className="font-mono-label text-[11px] text-gold uppercase tracking-wider text-center mb-3">{t.faq.tag}</p>
          <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-center mb-12">{t.faq.h2}</h2>
          <div className="space-y-3">
            {t.faq.items.map((f, i) => (
              <details key={i} className="group rounded-xl border border-border bg-card/40 p-5 open:border-gold/30">
                <summary className="cursor-pointer flex items-center justify-between gap-3 list-none">
                  <span className="font-display text-base sm:text-lg">{f.q}</span>
                  <span className="font-mono-label text-cream-3 group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="font-serif text-sm text-cream-2 leading-relaxed mt-3 pt-3 border-t border-border/40">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="font-display text-3xl sm:text-5xl tracking-tight leading-tight">{t.finalCta.h2}</h2>
            <p className="font-serif text-lg text-cream-2 leading-relaxed">{t.finalCta.sub}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link href="/signup" className={buttonVariants({ size: "lg" })}>
                {t.cta.start}
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Link>
              <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
                {t.cta.haveAccount}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-border/40 py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-gold text-background font-display font-bold text-sm">E</span>
              <span className="font-display tracking-tight">Entrium</span>
              <span className="font-mono-label text-[10px] text-cream-3 uppercase tracking-wider ml-2">
                {t.footer.tagline}
              </span>
            </div>
            <nav className="flex flex-wrap items-center gap-5 font-mono-label text-xs text-cream-3">
              <Link href="/privacy" className="hover:text-gold transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-gold transition-colors">Terms</Link>
              <a href="mailto:hello@entrium.ai" className="hover:text-gold transition-colors">hello@entrium.ai</a>
              <a href="https://t.me/entriumleedbot" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors inline-flex items-center gap-1">
                <Send className="h-3 w-3" /> @entriumleedbot
              </a>
            </nav>
          </div>
          <p className="font-mono-label text-[10px] text-cream-3 text-center mt-6">{t.footer.copyright}</p>
        </div>
      </footer>
    </div>
  )
}

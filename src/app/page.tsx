import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { LangSwitcher } from "@/components/lang-switcher"
import { getLocale } from "@/lib/i18n/server"
import { LANDING } from "./landing-content"
import { EntriumLogo } from "@/components/landing/entrium-logo"
import {
  Aurora,
  CountUp,
  MagneticButton,
  Reveal,
  Typewriter,
} from "@/components/landing/animations"
import {
  ArrowRight, Sparkles, Bot, MessageCircle, Map, Award,
  GraduationCap, FileText, ShieldCheck, FileUser, Wallet, Brain, Mail,
  ListChecks, CalendarDays, Send, Upload, Globe, Gift, Share2, Zap,
  type LucideIcon,
} from "lucide-react"

export const dynamic = "force-dynamic"

const TOOL_ICONS: LucideIcon[] = [
  Brain, Sparkles, Map, GraduationCap, Award, FileText, MessageCircle, Mail, FileUser, Wallet, ShieldCheck,
]
const PLATFORM_ICONS: LucideIcon[] = [Bot, MessageCircle, ListChecks, Upload, CalendarDays, Send]
const HOW_ICONS: LucideIcon[] = [Brain, Bot, ListChecks]
const REASON_ICONS: LucideIcon[] = [Brain, Globe, Send, Share2, Gift, Zap]

/* AI-demo typewriter copy — three short Claude outputs that cycle in the hero
   mock terminal. Russian, because that is the primary locale of the landing. */
const TYPEWRITER_LINES = [
  "Шанс на MIT: 6.4/10 — нужен +90 SAT и одна сильная активность.",
  "Найдено 14 стипендий под твой профиль. Топ-3 на экран.",
  "Roadmap готов: 12 месяцев, 47 задач, дедлайн ближе всего — Common App 1 ноября.",
]

export default async function LandingPage() {
  const locale = await getLocale()
  const t = LANDING[locale]

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Top brand bar — thin red rule like on the posts ─────────────── */}
      <div className="h-1 brand-rule" aria-hidden />

      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center" aria-label="Entrium">
            <EntriumLogo className="text-xl" />
          </Link>
          <nav className="hidden md:flex items-center gap-7 font-mono-label text-foreground/70 text-xs uppercase tracking-wider">
            <a href="#tools" className="hover:text-[var(--brand-red)] transition-colors">{t.navTools}</a>
            <a href="#platform" className="hover:text-[var(--brand-red)] transition-colors">{t.navPlatform}</a>
            <a href="#how" className="hover:text-[var(--brand-red)] transition-colors">{t.navHow}</a>
            <a href="#faq" className="hover:text-[var(--brand-red)] transition-colors">{t.navFaq}</a>
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="hidden sm:block">
              <LangSwitcher size="sm" />
            </span>
            <span className="sm:hidden">
              <LangSwitcher size="icon" />
            </span>
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
      <section id="main" className="relative overflow-hidden border-b border-border">
        {/* Soft red aurora behind the hero */}
        <Aurora className="opacity-70" />
        {/* Subtle dotted-map texture echoing the printed posts */}
        <div className="absolute inset-0 dotted-map opacity-40 pointer-events-none" aria-hidden />

        <div className="container relative mx-auto px-4 pt-16 pb-20 sm:pt-24 sm:pb-28">
          {/* Editorial meta strip (top-right of the printed posts) */}
          <div className="flex items-start justify-between mb-12 gap-6">
            <div className="brand-eyebrow font-mono-label text-foreground/70 leading-relaxed">
              <div>TOP 2027</div>
              <div>QS WORLD RANKING</div>
              <div className="text-[var(--brand-red)]">AI ADMISSIONS COPILOT</div>
            </div>
            <div className="brand-eyebrow font-mono-label text-foreground/70 leading-relaxed text-right">
              <div className="brand-eyebrow" style={{ paddingLeft: 0, paddingRight: 12 }}>
                <span>{t.hero.badge}</span>
              </div>
            </div>
          </div>

          {/* Headline — chromatic split in true brand style */}
          <Reveal>
            <h1 className="font-display font-extrabold tracking-tight leading-[0.92] text-5xl sm:text-7xl lg:text-8xl uppercase">
              {t.hero.title.line1}
              <br />
              <span className="text-[var(--brand-red)]">{t.hero.title.accent}</span>
              {t.hero.title.line2}
            </h1>
          </Reveal>

          {/* Sub + AI typewriter terminal side-by-side on desktop */}
          <div className="mt-10 grid lg:grid-cols-2 gap-10 items-start">
            <Reveal delay={120}>
              <p className="text-lg sm:text-xl text-foreground/75 leading-relaxed max-w-xl">
                {t.hero.sub}
              </p>
              <div className="flex flex-col sm:flex-row items-start gap-3 pt-6">
                <MagneticButton>
                  <Link href="/signup" className={buttonVariants({ size: "lg" })}>
                    {t.cta.start}
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Link>
                </MagneticButton>
                <MagneticButton strength={0.15}>
                  <Link href="/agent" className={buttonVariants({ variant: "outline", size: "lg" })}>
                    <Bot className="h-4 w-4 mr-1.5 text-[var(--brand-red)]" />
                    {t.cta.tryAgent}
                  </Link>
                </MagneticButton>
              </div>
              <p className="font-mono-label text-foreground/60 pt-4">{t.hero.note}</p>
            </Reveal>

            <Reveal delay={240}>
              {/* AI demo terminal — mimics a Claude output card */}
              <div className="rounded-2xl border border-foreground/12 bg-card shadow-[0_24px_60px_-30px_rgba(0,0,0,0.25)] overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--brand-red)]" />
                    <span className="font-mono-label text-foreground/70">CLAUDE · LIVE OUTPUT</span>
                  </div>
                  <span className="font-mono-label text-foreground/50">v4.5</span>
                </div>
                <div className="px-5 py-6 min-h-[180px] flex flex-col gap-3">
                  <div className="font-mono-label text-[var(--brand-red)]">› AI · АНАЛИЗ ПРОФИЛЯ</div>
                  <div className="text-foreground text-base sm:text-lg leading-relaxed">
                    <Typewriter lines={TYPEWRITER_LINES} />
                  </div>
                  <div className="mt-auto pt-4 border-t border-border flex items-center justify-between font-mono-label text-foreground/60">
                    <span>Sonnet 4.5</span>
                    <span>streaming · 1.4s</span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Stats — count-up on intersection */}
          <Reveal delay={360}>
            <div className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-8 max-w-4xl">
              {t.stats.map((s, i) => (
                <div key={i} className="brand-eyebrow">
                  <p className="font-display text-4xl sm:text-5xl tracking-tight leading-none text-foreground">
                    <CountUp value={s.number} />
                  </p>
                  <p className="font-mono-label text-foreground/65 mt-2">{s.label}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Closing red rule, matches the bottom of the printed posts */}
        <div className="h-1 brand-rule" aria-hidden />
      </section>

      {/* ── Platform features ────────────────────────────────────────── */}
      <section id="platform" className="border-b border-border py-20 sm:py-28">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="max-w-2xl mb-14">
              <p className="brand-eyebrow font-mono-label text-[var(--brand-red)] mb-4">
                {t.platform.tag}
              </p>
              <h2 className="font-display font-extrabold tracking-tight text-4xl sm:text-5xl lg:text-6xl uppercase leading-[0.95]">
                {t.platform.h2}
              </h2>
              <p className="mt-5 text-lg text-foreground/70 leading-relaxed">{t.platform.sub}</p>
            </div>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {t.platform.items.map((f, i) => {
              const Icon = PLATFORM_ICONS[i] ?? Sparkles
              return (
                <Reveal key={i} delay={i * 60}>
                  <div className="card-hover group h-full rounded-2xl border border-border bg-card p-6">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--brand-red-soft)] mb-5 group-hover:bg-[var(--brand-red)] transition-colors">
                      <Icon className="h-5 w-5 text-[var(--brand-red)] group-hover:text-white transition-colors" />
                    </div>
                    <h3 className="font-display font-extrabold text-xl tracking-tight mb-2">{f.title}</h3>
                    <p className="text-foreground/70 leading-relaxed">{f.desc}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── 11 tools ─────────────────────────────────────────────────── */}
      <section id="tools" className="border-b border-border py-20 sm:py-28 bg-secondary">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="max-w-2xl mb-14">
              <p className="brand-eyebrow font-mono-label text-[var(--brand-red)] mb-4">
                {t.tools.tag}
              </p>
              <h2 className="font-display font-extrabold tracking-tight text-4xl sm:text-5xl lg:text-6xl uppercase leading-[0.95]">
                {t.tools.h2}
              </h2>
              <p className="mt-5 text-lg text-foreground/70 leading-relaxed">{t.tools.sub}</p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl">
            {t.tools.items.map((tool, i) => {
              const Icon = TOOL_ICONS[i] ?? Sparkles
              const num = String(i + 1).padStart(2, "0")
              return (
                <Reveal key={i} delay={i * 40}>
                  <div className="card-hover h-full rounded-2xl border border-border bg-card p-5 flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--brand-red-soft)]">
                        <Icon className="h-[18px] w-[18px] text-[var(--brand-red)]" />
                      </div>
                      <span className="font-mono-label text-foreground/40">{num}</span>
                    </div>
                    <h3 className="font-display font-extrabold text-lg tracking-tight mb-1">{tool.title}</h3>
                    <p className="text-sm text-foreground/65 leading-relaxed">{tool.desc}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section id="how" className="border-b border-border py-20 sm:py-28">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="max-w-2xl mb-14">
              <p className="brand-eyebrow font-mono-label text-[var(--brand-red)] mb-4">
                {t.how.tag}
              </p>
              <h2 className="font-display font-extrabold tracking-tight text-4xl sm:text-5xl lg:text-6xl uppercase leading-[0.95]">
                {t.how.h2}
              </h2>
            </div>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl">
            {t.how.steps.map((s, i) => {
              const Icon = HOW_ICONS[i] ?? Sparkles
              return (
                <Reveal key={i} delay={i * 120}>
                  <div className="card-hover relative h-full rounded-2xl border border-border bg-card p-7">
                    <span
                      className="absolute top-5 right-6 font-display font-extrabold text-7xl leading-none text-[color-mix(in_srgb,var(--brand-red)_15%,transparent)]"
                      aria-hidden
                    >
                      {s.step}
                    </span>
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--brand-red-soft)] mb-5">
                      <Icon className="h-5 w-5 text-[var(--brand-red)]" />
                    </div>
                    <h3 className="font-display font-extrabold text-xl tracking-tight mb-2 leading-tight">{s.title}</h3>
                    <p className="text-foreground/70 leading-relaxed">{s.desc}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Why us ───────────────────────────────────────────────────── */}
      <section className="border-b border-border py-20 sm:py-28 bg-secondary">
        <div className="container mx-auto px-4 max-w-5xl">
          <Reveal>
            <div className="mb-14">
              <p className="brand-eyebrow font-mono-label text-[var(--brand-red)] mb-4">
                {t.why.tag}
              </p>
              <h2 className="font-display font-extrabold tracking-tight text-4xl sm:text-5xl lg:text-6xl uppercase leading-[0.95]">
                {t.why.h2}
              </h2>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-2 gap-5">
            {t.why.reasons.map((r, i) => {
              const Icon = REASON_ICONS[i] ?? Sparkles
              return (
                <Reveal key={i} delay={i * 70}>
                  <div className="card-hover h-full rounded-2xl border border-border bg-card p-6 flex gap-4">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--brand-red-soft)] shrink-0">
                      <Icon className="h-5 w-5 text-[var(--brand-red)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-extrabold text-lg tracking-tight mb-1">{r.title}</h3>
                      <p className="text-foreground/70 leading-relaxed">{r.desc}</p>
                    </div>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section id="faq" className="border-b border-border py-20 sm:py-28">
        <div className="container mx-auto px-4 max-w-3xl">
          <Reveal>
            <div className="mb-14">
              <p className="brand-eyebrow font-mono-label text-[var(--brand-red)] mb-4">
                {t.faq.tag}
              </p>
              <h2 className="font-display font-extrabold tracking-tight text-4xl sm:text-5xl lg:text-6xl uppercase leading-[0.95]">
                {t.faq.h2}
              </h2>
            </div>
          </Reveal>
          <div className="space-y-3">
            {t.faq.items.map((f, i) => (
              <Reveal key={i} delay={i * 40}>
                <details className="group rounded-xl border border-border bg-card p-5 open:border-[color-mix(in_srgb,var(--brand-red)_40%,transparent)] transition-colors">
                  <summary className="cursor-pointer flex items-center justify-between gap-3 list-none">
                    <span className="font-display font-extrabold text-base sm:text-lg tracking-tight">{f.q}</span>
                    <span className="font-mono-label text-[var(--brand-red)] group-open:rotate-45 transition-transform text-base">+</span>
                  </summary>
                  <p className="text-foreground/75 leading-relaxed mt-3 pt-3 border-t border-border">
                    {f.a}
                  </p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        <Aurora className="opacity-50" />
        <div className="container relative mx-auto px-4">
          <Reveal>
            <div className="max-w-4xl mx-auto text-center space-y-7">
              <h2 className="font-display font-extrabold tracking-tight uppercase text-4xl sm:text-6xl lg:text-7xl leading-[0.95]">
                {t.finalCta.h2}
              </h2>
              <p className="text-lg sm:text-xl text-foreground/75 leading-relaxed">{t.finalCta.sub}</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
                <MagneticButton>
                  <Link href="/signup" className={buttonVariants({ size: "lg" })}>
                    {t.cta.start}
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Link>
                </MagneticButton>
                <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
                  {t.cta.haveAccount}
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-border py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <EntriumLogo className="text-base" animateHeart={false} />
              <span className="font-mono-label text-foreground/60 ml-2">
                {t.footer.tagline}
              </span>
            </div>
            <nav className="flex flex-wrap items-center gap-5 font-mono-label text-foreground/65">
              <Link href="/privacy" className="hover:text-[var(--brand-red)] transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-[var(--brand-red)] transition-colors">Terms</Link>
              <a href="mailto:hello@entrium.ai" className="hover:text-[var(--brand-red)] transition-colors">hello@entrium.ai</a>
              <a href="https://t.me/entriumleedbot" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--brand-red)] transition-colors inline-flex items-center gap-1">
                <Send className="h-3 w-3" /> @entriumleedbot
              </a>
            </nav>
          </div>
          <p className="font-mono-label text-foreground/55 text-center mt-6">{t.footer.copyright}</p>
        </div>
        {/* Closing red rule */}
        <div className="h-1 brand-rule mt-8" aria-hidden />
      </footer>
    </div>
  )
}

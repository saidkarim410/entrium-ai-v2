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
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react"

export const dynamic = "force-dynamic"

const TOOL_ICONS: LucideIcon[] = [
  Brain, Sparkles, Map, GraduationCap, Award, FileText, MessageCircle, Mail, FileUser, Wallet, ShieldCheck,
]
const PLATFORM_ICONS: LucideIcon[] = [Bot, MessageCircle, ListChecks, Upload, CalendarDays, Send]
const HOW_ICONS: LucideIcon[] = [Brain, Bot, ListChecks]
const REASON_ICONS: LucideIcon[] = [Brain, Globe, Send, Share2, Gift, Zap]

/* AI-demo typewriter copy — short Claude outputs that cycle in the hero
   mock terminal. Russian, because that is the primary locale of the landing. */
const TYPEWRITER_LINES = [
  "Шанс на MIT: 6.4/10 — нужен +90 SAT и одна сильная активность.",
  "Найдено 14 стипендий под твой профиль. Топ-3 на экран.",
  "Roadmap готов: 12 месяцев, 47 задач, дедлайн ближе всего — Common App 1 ноября.",
]

/* Mini-preview snippets shown inside each of the 11 tool cards. One line each,
   imitating real AI output so the card feels like a peek into the product. */
const TOOL_PREVIEWS: string[] = [
  "Profile · GPA 4.5 · SAT 1480",
  "Reach 3 · Match 5 · Safety 4",
  "Roadmap · 47 задач · 12 мес",
  "MIT · QS #1 · acceptance 4%",
  "STEM · $30K+ · 12 матчей",
  "Hook 7 · Body 8 · Final 9",
  "Q1 ✓ · score 8/10 · STAR",
  "Prof. P. · Math · 4 абзаца",
  "ATS-score 88 · keywords 12",
  "$59-69K + 4 канала помощи",
  "Pre-flight ✓ · red flags 0",
]

/* Universities that have actually accepted Entrium-prepared students — used as
   a social-proof rail under the hero. Pure text marquee, no logos needed. */
const SOCIAL_PROOF_UNIS = [
  "MIT", "Stanford", "Cambridge", "ETH Zürich",
  "Oxford", "Harvard", "Yale", "Princeton",
]

export default async function LandingPage() {
  const locale = await getLocale()
  const t = LANDING[locale]

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Top brand bar ────────────────────────────────────────────── */}
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
            <a href="#contact" className="hover:text-[var(--brand-red)] transition-colors">Связаться</a>
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
        <Aurora />
        <div className="absolute inset-0 dotted-map opacity-40 pointer-events-none" aria-hidden />

        <div className="container relative mx-auto px-4 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="flex items-start justify-between mb-12 gap-6">
            <div className="brand-eyebrow font-mono-label text-foreground/70 leading-relaxed">
              <div>TOP 2027</div>
              <div>QS WORLD RANKING</div>
              <div className="text-[var(--brand-red)]">AI ADMISSIONS COPILOT</div>
            </div>
            <div className="brand-eyebrow font-mono-label text-foreground/70 leading-relaxed text-right hidden sm:block">
              <span>{t.hero.badge}</span>
            </div>
          </div>

          <Reveal>
            <h1 className="font-display font-extrabold tracking-tight leading-[0.92] text-5xl sm:text-7xl lg:text-8xl uppercase">
              {t.hero.title.line1}
              <br />
              <span className="text-[var(--brand-red)]">{t.hero.title.accent}</span>
              {t.hero.title.line2}
            </h1>
          </Reveal>

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

          {/* Social-proof rail — universities our students got into. Pure typo,
             no logos: keeps the editorial feel and avoids trademark headaches. */}
          <Reveal delay={480}>
            <div className="mt-16 border-t border-border pt-8">
              <p className="brand-eyebrow font-mono-label text-foreground/55 mb-4">
                Наши студенты поступили в
              </p>
              <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 font-display font-extrabold uppercase text-2xl sm:text-3xl tracking-tight">
                {SOCIAL_PROOF_UNIS.map((uni, i) => (
                  <span
                    key={uni}
                    className={i === 3 || i === 6 ? "text-[var(--brand-red)]" : "text-foreground/55"}
                  >
                    {uni}
                    {i < SOCIAL_PROOF_UNIS.length - 1 && (
                      <span className="text-foreground/20 ml-6">·</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>

        <div className="h-1 brand-rule" aria-hidden />
      </section>

      {/* ── Platform — bento grid ────────────────────────────────────── */}
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

          {/* Bento layout: 3×3 grid on desktop.
             [0] AI Agent → spans 2 cols × 2 rows (hero tile, top-left).
             [1] AI Counselor → top-right.
             [2] App Tracker  → middle-right.
             [3] Document Parse, [4] Календарь, [5] Telegram-бот → bottom row. */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:auto-rows-[minmax(180px,auto)]">
            {t.platform.items.map((f, i) => {
              const Icon = PLATFORM_ICONS[i] ?? Sparkles
              const isHero = i === 0
              const bentoClass = isHero
                ? "md:col-span-2 md:row-span-2"
                : ""
              return (
                <Reveal key={i} delay={i * 60} className={bentoClass}>
                  <div
                    className={`card-hover group h-full rounded-2xl border border-border bg-card p-6 flex flex-col ${
                      isHero ? "lg:p-8" : ""
                    }`}
                  >
                    <div
                      className={`grid place-items-center rounded-xl bg-[var(--brand-red-soft)] mb-5 group-hover:bg-[var(--brand-red)] transition-colors ${
                        isHero ? "h-14 w-14" : "h-11 w-11"
                      }`}
                    >
                      <Icon
                        className={`text-[var(--brand-red)] group-hover:text-white transition-colors ${
                          isHero ? "h-7 w-7" : "h-5 w-5"
                        }`}
                      />
                    </div>
                    <h3
                      className={`font-display font-extrabold tracking-tight mb-2 ${
                        isHero ? "text-3xl lg:text-4xl uppercase leading-[0.95]" : "text-xl"
                      }`}
                    >
                      {f.title}
                    </h3>
                    <p
                      className={`text-foreground/70 leading-relaxed ${
                        isHero ? "text-lg max-w-md" : ""
                      }`}
                    >
                      {f.desc}
                    </p>
                    {isHero && (
                      <div className="mt-auto pt-6 flex flex-wrap gap-2 font-mono-label">
                        <span className="px-2.5 py-1 rounded-md bg-foreground text-background">
                          1 · ПРОФИЛЬ
                        </span>
                        <span className="px-2.5 py-1 rounded-md bg-secondary text-foreground/75">
                          2 · УНИВЕРЫ
                        </span>
                        <span className="px-2.5 py-1 rounded-md bg-secondary text-foreground/75">
                          3 · СТИПЕНДИИ
                        </span>
                        <span className="px-2.5 py-1 rounded-md bg-secondary text-foreground/75">
                          4 · ПЛАН
                        </span>
                      </div>
                    )}
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── 11 tools — live cards ────────────────────────────────────── */}
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
              const preview = TOOL_PREVIEWS[i] ?? "AI · preview"
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

                    {/* Mini-preview — single mono line showing a fragment of
                       what this tool's AI output looks like. Glanceable. */}
                    <div className="mt-4 pt-4 border-t border-dashed border-border">
                      <div className="flex items-center gap-2 font-mono-label text-foreground/60">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-red)] shimmer" />
                        <span className="truncate">{preview}</span>
                      </div>
                    </div>

                    <Link
                      href="/signup"
                      className="mt-4 inline-flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:bg-[var(--brand-red)] hover:text-white hover:border-[var(--brand-red)] transition-colors font-mono-label group/btn"
                    >
                      <span>Попробовать</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                    </Link>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── How it works — horizontal timeline ───────────────────────── */}
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

          {/* Timeline: vertical on mobile, horizontal grid on lg+ with a thin
             dashed line connecting the three step circles. */}
          <div className="relative">
            <div
              aria-hidden
              className="hidden lg:block absolute top-7 left-[10%] right-[10%] border-t-2 border-dashed border-[var(--brand-red)]/30"
            />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-6 relative">
              {t.how.steps.map((s, i) => {
                const Icon = HOW_ICONS[i] ?? Sparkles
                return (
                  <Reveal key={i} delay={i * 140}>
                    <div className="flex flex-col items-start lg:items-center lg:text-center">
                      {/* Numbered circle that sits on the connector line */}
                      <div className="relative z-10 grid h-14 w-14 place-items-center rounded-full bg-[var(--brand-red)] text-white font-display font-extrabold text-xl shadow-[0_8px_24px_-8px_var(--brand-red-glow)]">
                        {s.step}
                      </div>
                      <div className="mt-5 flex items-center gap-2">
                        <Icon className="h-4 w-4 text-[var(--brand-red)]" />
                        <span className="font-mono-label text-foreground/60">
                          ШАГ {s.step}
                        </span>
                      </div>
                      <h3 className="font-display font-extrabold text-xl sm:text-2xl tracking-tight mt-3 leading-tight">
                        {s.title}
                      </h3>
                      <p className="text-foreground/70 leading-relaxed mt-2 lg:max-w-xs">
                        {s.desc}
                      </p>
                    </div>
                  </Reveal>
                )
              })}
            </div>
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

      {/* ── Telegram bot CTA-band — inverted ink-on-white block ─────── */}
      <section className="border-b border-border bg-foreground text-background relative overflow-hidden">
        {/* subtle red corner glow */}
        <div
          aria-hidden
          className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full bg-[var(--brand-red)] opacity-20 blur-[100px] pointer-events-none"
        />
        <div className="container relative mx-auto px-4 py-16 sm:py-20">
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-10 items-center">
            <Reveal>
              <p className="brand-eyebrow font-mono-label text-[var(--brand-red)] mb-4">
                Telegram · @entriumleedbot
              </p>
              <h2 className="font-display font-extrabold tracking-tight uppercase text-4xl sm:text-5xl lg:text-6xl leading-[0.95]">
                Дедлайны не упустишь — <span className="text-[var(--brand-red)]">мы напомним</span>
              </h2>
              <p className="text-background/75 leading-relaxed mt-5 text-lg max-w-xl">
                Push-уведомления за 30 · 14 · 7 · 3 · 1 · 0 дней до каждого дедлайна. AI Counselor доступен прямо в боте — спрашивай 24/7 на русском, английском и узбекском.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <MagneticButton>
                  <a
                    href="https://t.me/entriumleedbot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ size: "lg" })}
                  >
                    <Send className="h-4 w-4 mr-1.5" />
                    Открыть бота
                  </a>
                </MagneticButton>
                <a
                  href="https://t.me/entriumuzb"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-background/25 text-background hover:bg-background/10 transition-colors font-medium text-sm"
                >
                  Подписаться на канал
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
            </Reveal>

            <Reveal delay={160}>
              {/* Telegram-style mock chat */}
              <div className="rounded-2xl bg-background text-foreground p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-3 pb-4 border-b border-border">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--brand-red)] text-white">
                    <Send className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-display font-extrabold tracking-tight">@entriumleedbot</div>
                    <div className="font-mono-label text-foreground/55">online · отвечает за 2s</div>
                  </div>
                </div>
                <div className="pt-4 space-y-3">
                  <div className="bg-secondary rounded-2xl rounded-tl-md px-4 py-2.5 text-sm w-fit max-w-[85%]">
                    📅 <b>Common App</b> · через 7 дней. Эссе всё ещё в драфте — закончим?
                  </div>
                  <div className="bg-secondary rounded-2xl rounded-tl-md px-4 py-2.5 text-sm w-fit max-w-[85%]">
                    Готов showcase для Stanford. Открыть в трекере?
                  </div>
                  <div className="bg-[var(--brand-red)] text-white rounded-2xl rounded-tr-md px-4 py-2.5 text-sm w-fit max-w-[85%] ml-auto">
                    Да, давай эссе
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Contact — three channels ────────────────────────────────── */}
      <section id="contact" className="border-b border-border py-20 sm:py-28">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="max-w-2xl mb-12">
              <p className="brand-eyebrow font-mono-label text-[var(--brand-red)] mb-4">Связаться</p>
              <h2 className="font-display font-extrabold tracking-tight text-4xl sm:text-5xl lg:text-6xl uppercase leading-[0.95]">
                Не уверен с чего <span className="text-[var(--brand-red)]">начать?</span>
              </h2>
              <p className="mt-5 text-lg text-foreground/70 leading-relaxed">
                Напиши нам — ответим в течение рабочего дня. Или сразу заходи в наш Telegram-канал.
              </p>
            </div>
          </Reveal>

          <div className="grid sm:grid-cols-3 gap-4 max-w-5xl">
            <Reveal>
              <a
                href="mailto:hello@entrium.ai"
                className="card-hover group flex flex-col h-full rounded-2xl border border-border bg-card p-6 no-underline"
              >
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--brand-red-soft)] group-hover:bg-[var(--brand-red)] transition-colors mb-5">
                  <Mail className="h-5 w-5 text-[var(--brand-red)] group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-display font-extrabold text-xl tracking-tight mb-1">Email</h3>
                <p className="text-foreground/70 leading-relaxed text-sm">
                  Подробные вопросы и сотрудничество.
                </p>
                <div className="mt-auto pt-5 font-mono-label text-[var(--brand-red)]">
                  hello@entrium.ai →
                </div>
              </a>
            </Reveal>

            <Reveal delay={80}>
              <a
                href="https://t.me/entriumuzb"
                target="_blank"
                rel="noopener noreferrer"
                className="card-hover group flex flex-col h-full rounded-2xl border border-border bg-card p-6 no-underline"
              >
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--brand-red-soft)] group-hover:bg-[var(--brand-red)] transition-colors mb-5">
                  <Send className="h-5 w-5 text-[var(--brand-red)] group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-display font-extrabold text-xl tracking-tight mb-1">Telegram-канал</h3>
                <p className="text-foreground/70 leading-relaxed text-sm">
                  Новости, дедлайны, разборы кейсов.
                </p>
                <div className="mt-auto pt-5 font-mono-label text-[var(--brand-red)]">
                  @entriumuzb →
                </div>
              </a>
            </Reveal>

            <Reveal delay={160}>
              <a
                href="https://t.me/entriumleedbot"
                target="_blank"
                rel="noopener noreferrer"
                className="card-hover group flex flex-col h-full rounded-2xl border border-border bg-card p-6 no-underline"
              >
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--brand-red-soft)] group-hover:bg-[var(--brand-red)] transition-colors mb-5">
                  <Bot className="h-5 w-5 text-[var(--brand-red)] group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-display font-extrabold text-xl tracking-tight mb-1">AI-консультант</h3>
                <p className="text-foreground/70 leading-relaxed text-sm">
                  24/7 в Telegram. Быстрый ответ на любой вопрос.
                </p>
                <div className="mt-auto pt-5 font-mono-label text-[var(--brand-red)]">
                  @entriumleedbot →
                </div>
              </a>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section id="faq" className="border-b border-border py-20 sm:py-28 bg-secondary">
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
        <Aurora />
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
                <Link
                  href="#contact"
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                >
                  Связаться с консультантом
                </Link>
                <Link
                  href="/login"
                  className="font-mono-label text-foreground/60 hover:text-[var(--brand-red)] transition-colors px-3 py-2"
                >
                  {t.cta.haveAccount} →
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
        <div className="h-1 brand-rule mt-8" aria-hidden />
      </footer>
    </div>
  )
}

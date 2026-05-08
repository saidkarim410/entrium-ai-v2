import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { LangSwitcher } from "@/components/lang-switcher"
import {
  ArrowRight, Sparkles, Bot, MessageCircle, Map, Award,
  GraduationCap, FileText, ShieldCheck, FileUser, Wallet, Brain, Mail,
  ListChecks, CalendarDays, Send, Upload, Globe, Gift, Share2, Zap,
} from "lucide-react"

export const dynamic = "force-dynamic"

const TOOLS = [
  { icon: Brain, title: "Профиль · диагностика", desc: "AI смотрит на твой профиль глазами admission officer" },
  { icon: Sparkles, title: "Шансы поступления", desc: "Реалистичная оценка по reach/match/safety категориям" },
  { icon: Map, title: "Roadmap · трекер", desc: "Персональный план на 6-12 месяцев с дедлайнами" },
  { icon: GraduationCap, title: "University Advisor", desc: "Подбор из 1500+ универов под профиль" },
  { icon: Award, title: "Scholarship Matcher", desc: "Стипендии под гражданство, профиль, страну" },
  { icon: FileText, title: "Essay Coach", desc: "Структура, angles, редактура, anti-cliché" },
  { icon: MessageCircle, title: "Interview Trainer", desc: "Тренировка admission interview" },
  { icon: Mail, title: "Recommendation Letter", desc: "Помощь с request письмами и редактурой" },
  { icon: FileUser, title: "CV / Resume Builder", desc: "ATS-friendly CV для US / EU / Academic" },
  { icon: Wallet, title: "Cost Calculator", desc: "Tuition + проживание + visa с учётом стипендий" },
  { icon: ShieldCheck, title: "Mock Application Reviewer", desc: "Брутальный review до отправки" },
] as const

const PLATFORM = [
  {
    icon: Bot,
    title: "AI Agent",
    desc: "Один клик → 4 шага: оценка шансов, подбор универов, стипендии, план. Sequential pipeline.",
  },
  {
    icon: MessageCircle,
    title: "AI Counselor",
    desc: "Плавающий чат на каждой странице. Знает твой профиль и заявки. Доступен в @entriumleedbot.",
  },
  {
    icon: ListChecks,
    title: "Application Tracker",
    desc: "Список «куда подаю». Per-app AI «что делать дальше», auto-checklist, дедлайны.",
  },
  {
    icon: Upload,
    title: "Document Parse",
    desc: "Кидай PDF transcript / SAT report / CV — AI извлечёт поля и заполнит профиль.",
  },
  {
    icon: CalendarDays,
    title: "Календарь дедлайнов",
    desc: "Месячная сетка всех заявок с цветовой кодировкой по приоритету.",
  },
  {
    icon: Send,
    title: "Telegram-бот",
    desc: "Push-уведомления о дедлайнах за 30/14/7/3/1/0 дней + Counselor прямо в TG.",
  },
] as const

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Заполни профиль за 3 минуты",
    desc: "Или загрузи transcript / CV — AI извлечёт оценки, тесты и активности автоматически.",
    icon: Brain,
  },
  {
    step: "2",
    title: "Запусти AI Agent",
    desc: "За 5 минут: оценка шансов → шорт-лист универов из 1500+ → подходящие стипендии → 12-месячный план.",
    icon: Bot,
  },
  {
    step: "3",
    title: "Подавай и получай уведомления",
    desc: "Application Tracker ведёт каждую заявку. Telegram + email напомнят о дедлайнах.",
    icon: ListChecks,
  },
] as const

const FAQS = [
  {
    q: "Сколько стоит?",
    a: "Free версия даёт 10 запросов в день — этого хватает большинству на старте. Pro нужен в финальные 1-2 месяца до дедлайнов, когда нагрузка пиковая. Можно отказаться в любой момент.",
  },
  {
    q: "Чем это отличается от ChatGPT?",
    a: "ChatGPT не знает твой профиль, не помнит контекст между сессиями, не имеет базы 1500+ университетов с QS-рейтингами и не отслеживает дедлайны. Здесь всё связано: профиль → инструменты → заявки → уведомления.",
  },
  {
    q: "Какая модель используется?",
    a: "Pro — Claude Sonnet 4.5 (самая сильная для академического анализа). Free — Claude Haiku 4.5 (быстрая, бесплатная для тебя). Документы парсятся через Sonnet с vision capability.",
  },
  {
    q: "Что с приватностью?",
    a: "Профиль хранится в Supabase Postgres с RLS — видишь только ты. Документы парсятся в памяти и не сохраняются. Эссе передаются в Anthropic API в рамках их политики ZDR. Удаление аккаунта удаляет всё.",
  },
  {
    q: "Это работает на узбекском / английском?",
    a: "Да. Интерфейс на RU / EN / UZ, AI отвечает на твоём языке автоматически. Telegram-бот тоже подстраивается.",
  },
  {
    q: "Можно поделиться профилем с консультантом?",
    a: "Да. В /settings есть тогл «Публичная ссылка» — генерирует /p/your-name. Контакты и заметки скрыты, видно только академический контекст и список заявок.",
  },
] as const

export default function LandingPage() {
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
            <a href="#tools" className="hover:text-cream transition-colors">11 AI tools</a>
            <a href="#platform" className="hover:text-cream transition-colors">Платформа</a>
            <a href="#how" className="hover:text-cream transition-colors">Как работает</a>
            <a href="#faq" className="hover:text-cream transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <LangSwitcher size="sm" />
            <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Войти
            </Link>
            <Link href="/signup" className={buttonVariants({ size: "sm" })}>
              Начать
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="container mx-auto px-4 py-16 sm:py-24 lg:py-28">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-xs font-mono-label text-gold uppercase tracking-wider">
              <Sparkles className="h-3 w-3" />
              AI-консультант · Claude Sonnet 4.5
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.05]">
              Поступай <span className="italic text-gold">с AI-консультантом</span>,
              <br className="hidden sm:block" /> а не в одиночку
            </h1>
            <p className="font-serif text-lg text-cream-2 leading-relaxed max-w-2xl mx-auto">
              11 AI-инструментов, 1500+ университетов, твой профиль и дедлайны в одном месте.
              Push-уведомления в Telegram, parse документов, AI Agent для полного admission package.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link href="/signup" className={buttonVariants({ size: "lg" })}>
                Начать бесплатно
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Link>
              <Link
                href="/agent"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                <Bot className="h-4 w-4 mr-1.5 text-gold" />
                Попробовать AI Agent
              </Link>
            </div>
            <p className="font-mono-label text-[11px] text-cream-3 uppercase tracking-wider pt-3">
              Free: 10 запросов/день · без карты · отписка одним кликом
            </p>
          </div>

          {/* Stats strip */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            <Stat number="1500+" label="университетов в базе" />
            <Stat number="11" label="AI инструментов" />
            <Stat number="3" label="языка (RU/EN/UZ)" />
            <Stat number="∞" label="заявок отследить" />
          </div>
        </div>
      </section>

      {/* ── Platform features ────────────────────────────────────────── */}
      <section id="platform" className="border-b border-border/40 py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <p className="font-mono-label text-[11px] text-gold uppercase tracking-wider mb-3">Платформа</p>
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-3">
              Не просто чат, а связанная экосистема
            </h2>
            <p className="font-serif text-cream-2 leading-relaxed">
              Профиль, заявки, AI-инструменты и уведомления связаны между собой. Контекст не теряется.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PLATFORM.map((f) => (
              <div
                key={f.title}
                className="group rounded-xl border border-border bg-card/40 p-5 hover:border-gold/40 hover:bg-card transition-all"
              >
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-gold/15 group-hover:bg-gold/25 transition-colors mb-4">
                  <f.icon className="h-5 w-5 text-gold" />
                </div>
                <h3 className="font-display text-lg mb-1.5">{f.title}</h3>
                <p className="font-serif text-sm text-cream-2 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 11 tools ─────────────────────────────────────────────────── */}
      <section id="tools" className="border-b border-border/40 py-16 sm:py-24 bg-card/20">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <p className="font-mono-label text-[11px] text-gold uppercase tracking-wider mb-3">11 AI инструментов</p>
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-3">
              На каждый этап admission funnel
            </h2>
            <p className="font-serif text-cream-2 leading-relaxed">
              Каждый инструмент специализирован под одну задачу — глубже, чем универсальный чат.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-5xl mx-auto">
            {TOOLS.map((t) => (
              <div
                key={t.title}
                className="rounded-xl border border-border bg-card/60 p-4 hover:border-gold/30 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-gold/10 shrink-0">
                    <t.icon className="h-4 w-4 text-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-base">{t.title}</h3>
                    <p className="font-serif text-sm text-cream-3 leading-relaxed mt-0.5">{t.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section id="how" className="border-b border-border/40 py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <p className="font-mono-label text-[11px] text-gold uppercase tracking-wider mb-3">Как это работает</p>
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight">
              От профиля до подачи за 3 шага
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.step} className="rounded-xl border border-border bg-card/40 p-6 space-y-3 relative">
                <span className="absolute top-4 right-4 font-display text-4xl text-gold/20">{s.step}</span>
                <s.icon className="h-6 w-6 text-gold" />
                <h3 className="font-display text-lg">{s.title}</h3>
                <p className="font-serif text-sm text-cream-2 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why us ───────────────────────────────────────────────────── */}
      <section className="border-b border-border/40 py-16 sm:py-24 bg-card/20">
        <div className="container mx-auto px-4 max-w-4xl">
          <p className="font-mono-label text-[11px] text-gold uppercase tracking-wider text-center mb-3">
            Почему Entrium
          </p>
          <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-center mb-12">
            Главное отличие — связность
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Reason
              icon={Brain}
              title="Single Profile"
              desc="Заполни один раз — auto-fill во все 11 инструментов. Документы парсятся AI."
            />
            <Reason
              icon={Globe}
              title="1500+ университетов в базе"
              desc="Полный QS World Rankings 2026 с vector search. AI рекомендует, основываясь на реальных данных, не придумывает."
            />
            <Reason
              icon={Send}
              title="Telegram + email"
              desc="Push о дедлайнах за 30/14/7/3/1/0 дней. Counselor прямо в @entriumleedbot."
            />
            <Reason
              icon={Share2}
              title="Public sharing"
              desc="Покажи свой admission package одним URL — для ментора, родителей, консультанта."
            />
            <Reason
              icon={Gift}
              title="Реферальная программа"
              desc="+10 бонус-запросов за каждого друга, кто заполнит профиль. И ему +10 на старт."
            />
            <Reason
              icon={Zap}
              title="Pro = безлимит"
              desc="Когда 10/день перестают хватать в финальные месяцы — Pro c Claude Sonnet 4.5 и AI Agent."
            />
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section id="faq" className="border-b border-border/40 py-16 sm:py-24">
        <div className="container mx-auto px-4 max-w-3xl">
          <p className="font-mono-label text-[11px] text-gold uppercase tracking-wider text-center mb-3">
            Вопросы
          </p>
          <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-center mb-12">
            Частые вопросы
          </h2>
          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <details
                key={i}
                className="group rounded-xl border border-border bg-card/40 p-5 open:border-gold/30"
              >
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
            <h2 className="font-display text-3xl sm:text-5xl tracking-tight leading-tight">
              Поступление — не место для одиночества
            </h2>
            <p className="font-serif text-lg text-cream-2 leading-relaxed">
              Бесплатно, без карты, отписка одним кликом. Заполни профиль за 3 минуты — получи AI-консультанта,
              который реально знает твою ситуацию.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link href="/signup" className={buttonVariants({ size: "lg" })}>
                Начать бесплатно
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Link>
              <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
                У меня уже есть аккаунт
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
                AI · Admission
              </span>
            </div>
            <nav className="flex flex-wrap items-center gap-5 font-mono-label text-xs text-cream-3">
              <Link href="/privacy" className="hover:text-gold transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-gold transition-colors">Terms</Link>
              <a href="mailto:hello@entrium.ai" className="hover:text-gold transition-colors">hello@entrium.ai</a>
              <a
                href="https://t.me/entriumleedbot"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gold transition-colors inline-flex items-center gap-1"
              >
                <Send className="h-3 w-3" /> @entriumleedbot
              </a>
            </nav>
          </div>
          <p className="font-mono-label text-[10px] text-cream-3 text-center mt-6">
            © 2026 Entrium · Сделано с любовью для абитуриентов
          </p>
        </div>
      </footer>
    </div>
  )
}

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div className="text-center">
      <p className="font-display text-3xl sm:text-4xl tracking-tight text-gold">{number}</p>
      <p className="font-mono-label text-[10px] text-cream-3 uppercase tracking-wider mt-1">{label}</p>
    </div>
  )
}

function Reason({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  desc: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-5 flex gap-4">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-gold/15 shrink-0">
        <Icon className="h-5 w-5 text-gold" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-display text-base mb-1">{title}</h3>
        <p className="font-serif text-sm text-cream-2 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

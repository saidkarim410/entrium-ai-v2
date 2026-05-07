import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { LangSwitcher } from "@/components/lang-switcher"
import { getT } from "@/lib/i18n/server"
import {
  ArrowRight, Sparkles, BookOpen, Mic, Map, Check, ShieldCheck, CreditCard, BadgeCheck,
} from "lucide-react"

export const dynamic = "force-dynamic"

const TARGET_UNIS = ["MIT", "Stanford", "Harvard", "Cambridge", "Oxford", "ETH Zürich", "NUS", "KAIST"]

export default async function LandingPage() {
  const t = await getT()

  return (
    <div className="min-h-screen bg-background text-cream">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gold text-background font-display font-bold text-base">E</span>
            <span className="font-display text-lg tracking-tight">Entrium</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 font-mono-label text-cream-3">
            <a href="#features" className="hover:text-cream transition-colors">Возможности</a>
            <a href="#how" className="hover:text-cream transition-colors">Как работает</a>
            <a href="#pricing" className="hover:text-cream transition-colors">Цены</a>
            <a href="#faq" className="hover:text-cream transition-colors">Вопросы</a>
          </nav>
          <div className="flex items-center gap-2">
            <LangSwitcher />
            <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Войти
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1 rounded-md bg-gold px-3.5 py-1.5 text-xs font-medium text-background hover:bg-gold-soft transition-colors"
            >
              Начать
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_45%_at_50%_-5%,rgba(201,168,76,0.15),transparent)]" />
        <div className="container mx-auto px-4 py-20 lg:py-32 grid lg:grid-cols-[1.1fr_1fr] gap-16 items-center">
          <div>
            <p className="font-mono-label text-cream-3 mb-6">● AI-консультант по поступлению</p>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl leading-[1.05] text-balance">
              Твой шанс на<br />
              <span className="italic text-gold">MIT</span> · <span className="italic text-gold">Stanford</span><br />
              <span className="italic text-gold">Cambridge</span> · <span className="italic text-gold">ETH</span>
            </h1>
            <p className="mt-7 text-lg text-cream-2 font-serif max-w-xl leading-relaxed">
              Entrium — AI-платформа для поступления в топовые университеты мира.
              Создана для студентов из Узбекистана и СНГ.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-gold px-6 h-12 text-sm font-medium text-background rounded-md hover:bg-gold-soft transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                Начать бесплатно
              </Link>
              <a
                href="#how"
                className="inline-flex items-center gap-2 border border-border px-6 h-12 text-sm rounded-md hover:bg-card transition-colors"
              >
                Как это работает
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <p className="mt-6 font-mono-label text-cream-3">Без карты · Регистрация через Google</p>
          </div>

          {/* Mockup card */}
          <div className="relative">
            <div className="rounded-xl border border-border bg-card/50 backdrop-blur p-6 accent-strip">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p className="font-mono-label text-cream-3">AI · Анализ профиля</p>
                  <p className="font-display text-3xl text-gold mt-1">7.6<span className="text-lg text-cream-3">/10</span></p>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-gold/30 bg-gold/10">
                  <Sparkles className="h-3 w-3 text-gold" />
                  <span className="font-mono-label text-gold text-[9px]">AI Analysis</span>
                </div>
              </div>
              <div className="space-y-3">
                <p className="font-mono-label text-cream-3">Сильные стороны</p>
                <ul className="space-y-2 text-sm text-cream-2 font-serif">
                  <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> GPA выше требований топ-30 США</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> Олимпиадный опыт в STEM</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> Активное лидерство в школе</li>
                </ul>
              </div>
              <div className="mt-5 pt-5 border-t border-border grid grid-cols-3 gap-3">
                <div>
                  <p className="font-mono-label text-cream-3">Цель</p>
                  <p className="font-display text-base mt-1">MIT</p>
                </div>
                <div>
                  <p className="font-mono-label text-cream-3">Совпадение</p>
                  <p className="font-display text-base text-gold mt-1">74%</p>
                </div>
                <div>
                  <p className="font-mono-label text-cream-3">Дефицит</p>
                  <p className="font-display text-base text-amber-500 mt-1">SAT</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Universities marquee */}
        <div className="border-t border-border/40 py-8 bg-card/20">
          <div className="container mx-auto px-4 flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
            <p className="font-mono-label text-cream-3">Помогаем поступать в</p>
            {TARGET_UNIS.map((u) => (
              <span key={u} className="font-display italic text-cream/80 text-lg">{u}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-b border-border/40 py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mb-16">
            <p className="font-mono-label text-cream-3 mb-3">Что внутри</p>
            <h2 className="font-display text-4xl md:text-5xl">
              Четыре инструмента,<br />заменяющих <span className="italic text-gold">консультанта</span>
            </h2>
            <p className="mt-5 text-cream-2 font-serif text-lg">
              Каждый инструмент работает на актуальных AI-моделях и адаптирован под реалии поступления из СНГ.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <FeatureCard
              icon={Sparkles}
              tag="AI · Анализ"
              accent="gold"
              title="Глубокий разбор твоего профиля"
              description="AI оценит шансы по каждому целевому вузу, найдёт слабые места и предложит конкретные шаги — за минуты, а не недели."
              bullets={[
                "Реалистичная оценка по 10-балльной шкале",
                "Сравнение с типичными профилями поступивших",
                "Персональные рекомендации до конца года",
              ]}
              mockup={
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono-label text-cream-3">AI · Результат</span>
                    <span className="font-display text-2xl text-gold">7.4<span className="text-sm text-cream-3">/10</span></span>
                  </div>
                  <ul className="space-y-2 text-sm font-serif text-cream-2">
                    <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> Подать SAT в декабре, цель 1500+</li>
                    <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> Усилить эссе личным нарративом</li>
                    <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> Расширить активность через волонтёрство</li>
                  </ul>
                </div>
              }
            />

            <FeatureCard
              icon={BookOpen}
              tag="AI · Эссе"
              accent="purple"
              title="Тренер для эссе уровня Ivy"
              description="Coach, Analyze и Humanize — три режима, которые превращают черновик в эссе, попадающее в стиль и стандарты топовых вузов."
              bullets={[
                "Поэтапная обратная связь по структуре и тону",
                "Распознаёт «AI-почерк» и помогает писать живо",
                "Адаптировано под Common App и UCAS промпты",
              ]}
              mockup={
                <div>
                  <p className="font-mono-label text-cream-3 mb-2">Черновик</p>
                  <p className="text-sm font-serif text-cream-2 italic mb-4 line-clamp-3 leading-relaxed">
                    «Когда я впервые открыл задачник по олимпиадной математике в 8 классе,
                    я не понимал, зачем кому-то решать задачи без явной пользы…»
                  </p>
                  <div className="border-t border-border pt-3">
                    <p className="font-mono-label text-cream-3 mb-2">AI обратная связь</p>
                    <ul className="space-y-1.5 text-xs text-cream-2">
                      <li className="flex gap-2"><span className="text-emerald-500">✓</span> Сильное открытие — конкретная сцена</li>
                      <li className="flex gap-2"><span className="text-amber-500">!</span> Второй абзац требует усиления связи с университетом</li>
                      <li className="flex gap-2"><span className="text-amber-500">!</span> Заключение слишком абстрактное</li>
                    </ul>
                  </div>
                </div>
              }
            />

            <FeatureCard
              icon={Mic}
              tag="AI · Интервью"
              accent="blue"
              title="Тренировка интервью с обратной связью"
              description="Реальные вопросы из практики приёмных комиссий. AI оценивает ответы по структуре STAR и подсказывает, как улучшить."
              bullets={[
                "Вопросы под конкретный вуз и программу",
                "Оценка по 10-балльной шкале с разбором",
                "Доступно на русском, английском и узбекском",
              ]}
              mockup={
                <div>
                  <p className="font-mono-label text-cream-3 mb-2">Вопрос</p>
                  <p className="text-sm font-serif text-cream-2 italic mb-4 leading-relaxed">
                    «Расскажи о моменте, когда ты столкнулся с неудачей. Чему это тебя научило?»
                  </p>
                  <div className="flex items-center gap-3 pt-3 border-t border-border">
                    <span className="font-display text-2xl text-emerald-500">8.2<span className="text-sm text-cream-3">/10</span></span>
                    <p className="text-xs text-cream-2 font-serif">
                      Хорошая структура STAR. Уточни конкретный результат и добавь долгосрочный урок.
                    </p>
                  </div>
                </div>
              }
            />

            <FeatureCard
              icon={Map}
              tag="Процесс · Трекер"
              accent="amber"
              title="Персональный план месяц за месяцем"
              description="AI составит детальную дорожную карту до подачи документов — с задачами по тестам, эссе, активностям и дедлайнам."
              bullets={[
                "Учитывает твои слабые места и целевые вузы",
                "Разбивает год на конкретные действия",
                "Перегенерация при изменении обстоятельств",
              ]}
              mockup={
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-mono-label text-cream-3">Сентябрь 2026</span>
                    <span className="font-mono-label text-gold">50% · 2/4</span>
                  </div>
                  <ul className="space-y-2">
                    {[
                      { t: "Финализировать список Common App", c: "Заявка", done: true },
                      { t: "Записать первую версию Personal Statement", c: "Эссе", done: true },
                      { t: "Запросить рекомендательные письма", c: "Документы", done: false },
                      { t: "Подать на CSS Profile", c: "Финансы", done: false },
                    ].map((task, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs font-serif">
                        <span className={`h-3.5 w-3.5 shrink-0 rounded-sm border ${task.done ? "bg-gold border-gold" : "border-border"}`} />
                        <span className={task.done ? "line-through text-cream-3" : "text-cream-2"}>{task.t}</span>
                        <span className="ml-auto font-mono-label text-cream-3 text-[8px]">{task.c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              }
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-b border-border/40 py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mb-16">
            <p className="font-mono-label text-cream-3 mb-3">Как это работает</p>
            <h2 className="font-display text-4xl md:text-5xl">
              Три шага до <span className="italic text-gold">приёмной комиссии</span>
            </h2>
            <p className="mt-5 text-cream-2 font-serif text-lg">
              От пустого профиля до готового плана поступления — за один вечер, а не за месяцы переписки с консультантом.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { num: "01", title: "Заполни профиль", desc: "Расскажи о себе, своих оценках, целях и вузах мечты. Один экран, никакой бюрократии." },
              { num: "02", title: "AI разберёт твой профиль", desc: "Глубокий анализ за минуту. Сильные стороны, реальные шансы, чёткие зоны для роста." },
              { num: "03", title: "Получи персональный план", desc: "Дорожная карта по месяцам: эссе, тесты, активности, дедлайны. Всё в одном месте." },
            ].map((step) => (
              <div key={step.num} className="rounded-xl border border-border bg-card/40 p-7">
                <p className="font-display text-5xl text-gold/60 mb-5">{step.num}</p>
                <h3 className="font-display text-xl mb-3">{step.title}</h3>
                <p className="font-serif text-cream-2 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-b border-border/40 py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mb-16">
            <p className="font-mono-label text-cream-3 mb-3">Цены</p>
            <h2 className="font-display text-4xl md:text-5xl">
              Прозрачно. <span className="italic text-gold">Без скрытых платежей.</span>
            </h2>
            <p className="mt-5 text-cream-2 font-serif text-lg">
              Начни с разового анализа или открой все инструменты подпиской. Отменить можно в любой момент.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
            {/* One-time */}
            <div className="rounded-xl border border-border bg-card/40 p-7 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-4 w-4 text-cream-3" />
                <span className="font-mono-label text-cream-3">Разовая покупка</span>
              </div>
              <h3 className="font-display text-2xl mb-2">AI-анализ профиля</h3>
              <p className="font-serif text-cream-2 text-sm mb-6 leading-relaxed">
                Глубокий разбор шансов поступления и персональные рекомендации. Доступ навсегда.
              </p>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="font-display text-5xl text-cream">$5</span>
                <span className="font-mono-label text-cream-3">один раз</span>
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {[
                  "AI-анализ профиля по 10 параметрам",
                  "Реалистичная оценка шансов по каждому вузу",
                  "Конкретные next steps на 3 месяца",
                  "Доступ к результатам навсегда",
                ].map((item) => (
                  <li key={item} className="flex gap-2 text-sm font-serif text-cream-2">
                    <Check className="h-4 w-4 text-gold mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="block w-full text-center border border-border py-3 rounded-md font-mono-label hover:bg-card transition-colors">
                Начать с анализа
              </Link>
            </div>

            {/* Subscription */}
            <div className="relative rounded-xl border-2 border-gold/40 bg-card/60 p-7 flex flex-col accent-strip">
              <div className="absolute -top-3 left-7 px-3 py-1 rounded-full bg-gold text-background flex items-center gap-1.5">
                <BadgeCheck className="h-3 w-3" />
                <span className="font-mono-label text-[9px]">Рекомендуем</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-gold" />
                <span className="font-mono-label text-cream-3">Подписка</span>
              </div>
              <h3 className="font-display text-2xl mb-2">Полный доступ</h3>
              <p className="font-serif text-cream-2 text-sm mb-6 leading-relaxed">
                Все инструменты Entrium: анализ, эссе, интервью, трекер, диагностика и рекомендации.
              </p>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="font-display text-5xl text-gold">$18</span>
                <span className="font-mono-label text-cream-3">в месяц</span>
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {[
                  "Всё, что входит в разовую покупку",
                  "AI-тренер для эссе с тремя режимами",
                  "Тренировка интервью под конкретный вуз",
                  "Персональный трекер с месячным планом",
                ].map((item) => (
                  <li key={item} className="flex gap-2 text-sm font-serif text-cream-2">
                    <Check className="h-4 w-4 text-gold mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="block w-full text-center bg-gold text-background py-3 rounded-md font-medium hover:bg-gold-soft transition-colors">
                Оформить подписку
              </Link>
            </div>
          </div>

          <p className="mt-8 font-mono-label text-cream-3 flex items-center gap-2">
            <ShieldCheck className="h-3 w-3" />
            Платежи через Stripe · Безопасно · Без скрытых условий
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-b border-border/40 py-20 lg:py-28">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="mb-12">
            <p className="font-mono-label text-cream-3 mb-3">Частые вопросы</p>
            <h2 className="font-display text-4xl md:text-5xl">Что обычно <span className="italic text-gold">спрашивают</span></h2>
          </div>
          <div className="space-y-3">
            {[
              { q: "Это просто ChatGPT с другим интерфейсом?", a: "Нет. Entrium использует специализированные промпты, разработанные под admission processes Ivy League и UK/EU университетов. Плюс собственная база 1500+ университетов QS, 300+ стипендий и знание реалий поступления из СНГ. ChatGPT может ответить на вопрос — Entrium ведёт тебя по всему пути." },
              { q: "Что с моими данными?", a: "Хранятся в зашифрованном виде на серверах Supabase (AWS). Row Level Security гарантирует, что ты видишь только свои данные. Удаление аккаунта удаляет всё. Полная политика — в /privacy." },
              { q: "Можно ли отменить подписку?", a: "Да, в любой момент через Stripe Customer Portal. Доступ останется до конца оплаченного периода. Возврат за неиспользованное время не предусмотрен, но и обязательств нет." },
              { q: "Что если AI-анализ не помог?", a: "Свяжись с hello@entrium.ai в течение 7 дней — вернём $5 за разовый анализ без вопросов. Подписку можно отменить с любого момента." },
              { q: "Платформа только на русском?", a: "Нет — RU, EN, UZ. Переключатель в правом верхнем углу. AI-инструменты понимают и отвечают на всех трёх языках." },
              { q: "У меня есть школьный консультант. Зачем мне это?", a: "Entrium дополняет, не заменяет. Консультант знает тебя — Entrium знает тысячи кейсов поступления. Используй вместе: AI-анализ перед встречей с консультантом → конкретные вопросы → результат глубже за то же время." },
            ].map((item, i) => (
              <details key={i} className="group rounded-lg border border-border bg-card/40 overflow-hidden">
                <summary className="flex items-center justify-between cursor-pointer p-5 list-none">
                  <span className="font-display text-base">{item.q}</span>
                  <span className="font-display text-2xl text-gold transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="px-5 pb-5 text-cream-2 font-serif text-sm leading-relaxed">{item.a}</div>
              </details>
            ))}
          </div>
          <p className="mt-10 text-cream-2 font-serif text-center">
            Не нашёл ответ? Напиши нам: <a href="mailto:hello@entrium.ai" className="text-gold hover:underline">hello@entrium.ai</a>
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="font-display text-4xl md:text-6xl">
            Начни поступление <span className="italic text-gold">сегодня</span>
          </h2>
          <p className="mt-6 font-serif text-lg text-cream-2 leading-relaxed">
            Один вечер на профиль и анализ — и у тебя есть план на год вперёд.
            Бесплатная регистрация, без обязательств.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 mt-10 bg-gold px-8 h-13 py-3.5 text-sm font-medium text-background rounded-md hover:bg-gold-soft transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Создать аккаунт
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-6 font-mono-label text-cream-3">Регистрация через Google · 30 секунд</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            <div>
              <Link href="/" className="flex items-center gap-2 mb-4">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-gold text-background font-display font-bold">E</span>
                <span className="font-display text-lg">Entrium</span>
              </Link>
              <p className="text-sm text-cream-2 font-serif leading-relaxed">
                AI-консультант по поступлению в зарубежные университеты для студентов из Узбекистана и СНГ.
              </p>
            </div>
            <div>
              <h3 className="font-mono-label text-cream-3 mb-4">Продукт</h3>
              <ul className="space-y-2 text-sm font-serif text-cream-2">
                <li><a href="#features" className="hover:text-gold transition-colors">Возможности</a></li>
                <li><a href="#how" className="hover:text-gold transition-colors">Как работает</a></li>
                <li><a href="#pricing" className="hover:text-gold transition-colors">Цены</a></li>
                <li><a href="#faq" className="hover:text-gold transition-colors">Вопросы</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-mono-label text-cream-3 mb-4">Компания</h3>
              <ul className="space-y-2 text-sm font-serif text-cream-2">
                <li><Link href="/privacy" className="hover:text-gold transition-colors">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-gold transition-colors">Terms</Link></li>
                <li><a href="mailto:hello@entrium.ai" className="hover:text-gold transition-colors">Связаться</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-mono-label text-cream-3 mb-4">Контакты</h3>
              <ul className="space-y-2 text-sm font-serif text-cream-2">
                <li><a href="mailto:hello@entrium.ai" className="hover:text-gold transition-colors">hello@entrium.ai</a></li>
                <li><a href="https://t.me/entriumuzb" target="_blank" rel="noopener" className="hover:text-gold transition-colors">Telegram канал</a></li>
                <li><Link href="/login" className="hover:text-gold transition-colors">Войти в аккаунт</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border/40 flex flex-col md:flex-row justify-between gap-3 text-cream-3">
            <p className="font-mono-label">© 2026 Entrium · Сделано в Узбекистане</p>
            <div className="flex gap-5">
              <Link href="/terms" className="font-mono-label hover:text-cream transition-colors">Условия</Link>
              <Link href="/privacy" className="font-mono-label hover:text-cream transition-colors">Конфиденциальность</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon: Icon, tag, accent, title, description, bullets, mockup,
}: {
  icon: typeof Sparkles
  tag: string
  accent: "gold" | "purple" | "blue" | "amber"
  title: string
  description: string
  bullets: string[]
  mockup: React.ReactNode
}) {
  const accentMap = {
    gold: "text-gold",
    purple: "text-violet-400",
    blue: "text-sky-400",
    amber: "text-amber-500",
  }
  return (
    <div className="rounded-xl border border-border bg-card/40 overflow-hidden">
      <div className="p-7">
        <div className="flex items-center gap-2 mb-4">
          <Icon className={`h-4 w-4 ${accentMap[accent]}`} />
          <span className="font-mono-label text-cream-3">{tag}</span>
        </div>
        <h3 className="font-display text-2xl mb-3 leading-tight">{title}</h3>
        <p className="font-serif text-cream-2 text-sm mb-5 leading-relaxed">{description}</p>
        <ul className="space-y-2 mb-6">
          {bullets.map((b) => (
            <li key={b} className="flex gap-2 text-sm font-serif text-cream-2">
              <Check className="h-4 w-4 text-gold mt-0.5 shrink-0" />
              {b}
            </li>
          ))}
        </ul>
      </div>
      <div className="border-t border-border bg-background/40 p-6 accent-strip">{mockup}</div>
    </div>
  )
}

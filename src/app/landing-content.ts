import type { Locale } from "@/lib/i18n/dict"

/**
 * Landing page content per locale. Server component picks the right one
 * via getLocale() — keeps page.tsx free of i18n branching.
 */

type Tool = { title: string; desc: string }
type PlatformFeat = { title: string; desc: string }
type Step = { step: string; title: string; desc: string }
type Reason = { title: string; desc: string }
type FAQ = { q: string; a: string }
type Stat = { number: string; label: string }

export type LandingCopy = {
  navTools: string
  navPlatform: string
  navHow: string
  navFaq: string
  cta: { signin: string; start: string; tryAgent: string; haveAccount: string }
  hero: {
    badge: string
    title: { line1: string; accent: string; line2: string }
    sub: string
    note: string
  }
  stats: Stat[]
  platform: { tag: string; h2: string; sub: string; items: PlatformFeat[] }
  tools: { tag: string; h2: string; sub: string; items: Tool[] }
  how: { tag: string; h2: string; steps: Step[] }
  why: { tag: string; h2: string; reasons: Reason[] }
  faq: { tag: string; h2: string; items: FAQ[] }
  finalCta: { h2: string; sub: string }
  footer: { tagline: string; copyright: string }
}

export const LANDING: Record<Locale, LandingCopy> = {
  ru: {
    navTools: "11 AI tools",
    navPlatform: "Платформа",
    navHow: "Как работает",
    navFaq: "FAQ",
    cta: {
      signin: "Войти",
      start: "Начать",
      tryAgent: "Попробовать AI Agent",
      haveAccount: "У меня уже есть аккаунт",
    },
    hero: {
      badge: "AI-консультант · Claude Sonnet 4.5",
      title: {
        line1: "Поступай",
        accent: "с AI-консультантом",
        line2: ", а не в одиночку",
      },
      sub: "11 AI-инструментов, 1500+ университетов, твой профиль и дедлайны в одном месте. Push-уведомления в Telegram, parse документов, AI Agent для полного admission package.",
      note: "Free: 10 запросов/день · без карты · отписка одним кликом",
    },
    stats: [
      { number: "1500+", label: "университетов в базе" },
      { number: "11", label: "AI инструментов" },
      { number: "3", label: "языка (RU / EN / UZ)" },
      { number: "∞", label: "заявок отследить" },
    ],
    platform: {
      tag: "Платформа",
      h2: "Не просто чат, а связанная экосистема",
      sub: "Профиль, заявки, AI-инструменты и уведомления связаны между собой. Контекст не теряется.",
      items: [
        { title: "AI Agent", desc: "Один клик → 4 шага: оценка шансов, подбор универов, стипендии, план. Sequential pipeline." },
        { title: "AI Counselor", desc: "Плавающий чат на каждой странице. Знает твой профиль и заявки. Доступен в Telegram." },
        { title: "Application Tracker", desc: "Список «куда подаю». Per-app AI «что делать дальше», auto-checklist, дедлайны." },
        { title: "Document Parse", desc: "Кидай PDF transcript / SAT report / CV — AI извлечёт поля и заполнит профиль." },
        { title: "Календарь дедлайнов", desc: "Месячная сетка всех заявок с цветовой кодировкой по приоритету." },
        { title: "Telegram-бот", desc: "Push-уведомления о дедлайнах за 30 / 14 / 7 / 3 / 1 / 0 дней + Counselor прямо в TG." },
      ],
    },
    tools: {
      tag: "11 AI инструментов",
      h2: "На каждый этап admission funnel",
      sub: "Каждый инструмент специализирован под одну задачу — глубже, чем универсальный чат.",
      items: [
        { title: "Профиль · диагностика", desc: "AI смотрит на твой профиль глазами admission officer" },
        { title: "Шансы поступления", desc: "Реалистичная оценка по reach / match / safety категориям" },
        { title: "Roadmap · трекер", desc: "Персональный план на 6-12 месяцев с дедлайнами" },
        { title: "University Advisor", desc: "Подбор из 1500+ универов под профиль" },
        { title: "Scholarship Matcher", desc: "Стипендии под гражданство, профиль, страну" },
        { title: "Essay Coach", desc: "Структура, angles, редактура, anti-cliché" },
        { title: "Interview Trainer", desc: "Тренировка admission interview · текст и ГОЛОС" },
        { title: "Recommendation Letter", desc: "Помощь с request письмами и редактурой" },
        { title: "CV / Resume Builder", desc: "ATS-friendly CV для US / EU / Academic" },
        { title: "Cost Calculator", desc: "Tuition + проживание + visa с учётом стипендий" },
        { title: "Mock Application Reviewer", desc: "Брутальный review до отправки" },
      ],
    },
    how: {
      tag: "Как это работает",
      h2: "От профиля до подачи за 3 шага",
      steps: [
        { step: "1", title: "Заполни профиль за 3 минуты", desc: "Или загрузи transcript / CV — AI извлечёт оценки, тесты и активности автоматически." },
        { step: "2", title: "Запусти AI Agent", desc: "За 5 минут: оценка шансов → шорт-лист универов из 1500+ → подходящие стипендии → 12-месячный план." },
        { step: "3", title: "Подавай и получай уведомления", desc: "Application Tracker ведёт каждую заявку. Telegram + email напомнят о дедлайнах." },
      ],
    },
    why: {
      tag: "Почему Entrium",
      h2: "Главное отличие — связность",
      reasons: [
        { title: "Single Profile", desc: "Заполни один раз — auto-fill во все 11 инструментов. Документы парсятся AI." },
        { title: "1500+ университетов в базе", desc: "Полный QS World Rankings 2026 с vector search. AI рекомендует, основываясь на реальных данных, не придумывает." },
        { title: "Telegram + email", desc: "Push о дедлайнах за 30/14/7/3/1/0 дней. Counselor прямо в Telegram." },
        { title: "Public sharing", desc: "Покажи свой admission package одним URL — для ментора, родителей, консультанта." },
        { title: "Реферальная программа", desc: "+10 бонус-запросов за каждого друга, кто заполнит профиль. И ему +10 на старт." },
        { title: "Pro = безлимит", desc: "Когда 10/день перестают хватать в финальные месяцы — Pro c Claude Sonnet 4.5 и AI Agent." },
      ],
    },
    faq: {
      tag: "Вопросы",
      h2: "Частые вопросы",
      items: [
        { q: "Сколько стоит?", a: "Free версия даёт 10 запросов в день — этого хватает большинству на старте. Pro нужен в финальные 1-2 месяца до дедлайнов, когда нагрузка пиковая. Можно отказаться в любой момент." },
        { q: "Чем это отличается от ChatGPT?", a: "ChatGPT не знает твой профиль, не помнит контекст между сессиями, не имеет базы 1500+ университетов с QS-рейтингами и не отслеживает дедлайны. Здесь всё связано: профиль → инструменты → заявки → уведомления." },
        { q: "Какая модель используется?", a: "Pro — Claude Sonnet 4.5 (самая сильная для академического анализа). Free — Claude Haiku 4.5 (быстрая, бесплатная для тебя). Voice-режим интервью использует OpenAI Realtime API. Документы парсятся через Sonnet с vision capability." },
        { q: "Что с приватностью?", a: "Профиль хранится в Supabase Postgres с RLS — видишь только ты. Документы парсятся в памяти и не сохраняются. Эссе передаются в Anthropic API в рамках их политики ZDR. Удаление аккаунта удаляет всё." },
        { q: "Это работает на узбекском / английском?", a: "Да. Интерфейс на RU / EN / UZ, AI отвечает на твоём языке автоматически. Telegram-бот тоже подстраивается." },
        { q: "Можно поделиться профилем с консультантом?", a: "Да. В /settings есть тогл «Публичная ссылка» — генерирует /p/your-name. Контакты и заметки скрыты, видно только академический контекст и список заявок." },
      ],
    },
    finalCta: {
      h2: "Поступление — не место для одиночества",
      sub: "Бесплатно, без карты, отписка одним кликом. Заполни профиль за 3 минуты — получи AI-консультанта, который реально знает твою ситуацию.",
    },
    footer: {
      tagline: "AI · Admission",
      copyright: "© 2026 Entrium · Сделано с любовью для абитуриентов",
    },
  },

  // ── ENGLISH ──────────────────────────────────────────────────────────────
  en: {
    navTools: "11 AI tools",
    navPlatform: "Platform",
    navHow: "How it works",
    navFaq: "FAQ",
    cta: {
      signin: "Sign in",
      start: "Get started",
      tryAgent: "Try AI Agent",
      haveAccount: "I already have an account",
    },
    hero: {
      badge: "AI counselor · Claude Sonnet 4.5",
      title: {
        line1: "Apply",
        accent: "with an AI counselor",
        line2: ", not alone",
      },
      sub: "11 AI tools, 1500+ universities, your profile and deadlines in one place. Telegram push, document parsing, AI Agent for a complete admission package.",
      note: "Free: 10 requests/day · no card · unsubscribe in one click",
    },
    stats: [
      { number: "1500+", label: "universities in DB" },
      { number: "11", label: "AI tools" },
      { number: "3", label: "languages (RU / EN / UZ)" },
      { number: "∞", label: "applications tracked" },
    ],
    platform: {
      tag: "Platform",
      h2: "Not just a chat — a connected ecosystem",
      sub: "Profile, applications, AI tools, and notifications are wired together. Context doesn't get lost.",
      items: [
        { title: "AI Agent", desc: "One click → 4 steps: chances, university shortlist, scholarships, plan. Sequential pipeline." },
        { title: "AI Counselor", desc: "Floating chat on every page. Knows your profile and applications. Also available in Telegram." },
        { title: "Application Tracker", desc: "List of where you're applying. Per-app AI \"what's next,\" auto-checklist, deadlines." },
        { title: "Document Parse", desc: "Drop a PDF transcript / SAT report / CV — AI extracts fields and fills your profile." },
        { title: "Deadline Calendar", desc: "Monthly grid of all applications, color-coded by priority." },
        { title: "Telegram bot", desc: "Push reminders 30 / 14 / 7 / 3 / 1 / 0 days before deadline + Counselor inside TG." },
      ],
    },
    tools: {
      tag: "11 AI tools",
      h2: "One for every stage of admission",
      sub: "Each tool is specialized for a single job — deeper than a generic chat.",
      items: [
        { title: "Profile · Diagnostic", desc: "AI looks at your profile through an admission officer's eyes" },
        { title: "Admission Chances", desc: "Realistic reach / match / safety categorization" },
        { title: "Roadmap · Tracker", desc: "Personal 6-12 month plan with deadlines" },
        { title: "University Advisor", desc: "Picks from 1500+ universities matched to your profile" },
        { title: "Scholarship Matcher", desc: "Scholarships by citizenship, profile, country" },
        { title: "Essay Coach", desc: "Structure, angles, line edits, anti-cliché" },
        { title: "Interview Trainer", desc: "Admission interview practice · text AND VOICE" },
        { title: "Recommendation Letter", desc: "Help with request emails and edits" },
        { title: "CV / Resume Builder", desc: "ATS-friendly CV for US / EU / Academic" },
        { title: "Cost Calculator", desc: "Tuition + living + visa, accounting for scholarships" },
        { title: "Mock Application Reviewer", desc: "Brutal pre-submission review" },
      ],
    },
    how: {
      tag: "How it works",
      h2: "Profile to submission in 3 steps",
      steps: [
        { step: "1", title: "Fill your profile in 3 minutes", desc: "Or upload transcript / CV — AI extracts grades, tests, and activities automatically." },
        { step: "2", title: "Run the AI Agent", desc: "5 min: chances → shortlist from 1500+ → matching scholarships → 12-month plan." },
        { step: "3", title: "Apply and get reminders", desc: "Application Tracker handles each application. Telegram + email warn you about deadlines." },
      ],
    },
    why: {
      tag: "Why Entrium",
      h2: "The killer feature is connectedness",
      reasons: [
        { title: "Single Profile", desc: "Fill once — auto-fills all 11 tools. Documents parsed by AI." },
        { title: "1500+ universities in DB", desc: "Full QS World Rankings 2026 with vector search. AI recommends from real data, doesn't hallucinate." },
        { title: "Telegram + email", desc: "Push reminders 30/14/7/3/1/0 days out. Counselor inside Telegram too." },
        { title: "Public sharing", desc: "Show your admission package via one URL — to a mentor, parents, counselor." },
        { title: "Referral program", desc: "+10 bonus requests for every friend who completes their profile. They get +10 on day one." },
        { title: "Pro = unlimited", desc: "When 10/day stops being enough in the final months — Pro with Claude Sonnet 4.5 and AI Agent." },
      ],
    },
    faq: {
      tag: "FAQ",
      h2: "Frequently asked",
      items: [
        { q: "How much does it cost?", a: "Free gives you 10 AI requests a day — enough for most students starting out. Pro is for the final 1-2 months before deadlines, when load peaks. Cancel anytime." },
        { q: "How is this different from ChatGPT?", a: "ChatGPT doesn't know your profile, doesn't remember context across sessions, has no DB of 1500+ universities with QS rankings, and doesn't track deadlines. Here, everything is connected: profile → tools → applications → notifications." },
        { q: "Which model do you use?", a: "Pro — Claude Sonnet 4.5 (strongest for academic analysis). Free — Claude Haiku 4.5 (fast, free for you). Voice interview uses OpenAI Realtime API. Documents are parsed via Sonnet's vision capability." },
        { q: "What about privacy?", a: "Your profile lives in Supabase Postgres with RLS — only you see it. Documents are parsed in memory and never stored. Essays go through the Anthropic API under their ZDR policy. Deleting your account deletes everything." },
        { q: "Does it work in Uzbek / English?", a: "Yes. UI is RU / EN / UZ, and the AI responds in your language automatically. The Telegram bot adapts too." },
        { q: "Can I share my profile with a counselor?", a: "Yes. In /settings there's a \"Public link\" toggle that generates /p/your-name. Contacts and notes are hidden — only academic context and the list of applications are visible." },
      ],
    },
    finalCta: {
      h2: "Applying isn't a place for being alone",
      sub: "Free, no card, unsubscribe in one click. Fill your profile in 3 minutes — get an AI counselor who actually knows your situation.",
    },
    footer: {
      tagline: "AI · Admission",
      copyright: "© 2026 Entrium · Made with love for applicants",
    },
  },

  // ── O'ZBEKCHA ────────────────────────────────────────────────────────────
  uz: {
    navTools: "11 AI vosita",
    navPlatform: "Platforma",
    navHow: "Qanday ishlaydi",
    navFaq: "FAQ",
    cta: {
      signin: "Kirish",
      start: "Boshlash",
      tryAgent: "AI Agent ni sinab ko'ring",
      haveAccount: "Akkauntim allaqachon bor",
    },
    hero: {
      badge: "AI maslahatchi · Claude Sonnet 4.5",
      title: {
        line1: "Hujjat topshir",
        accent: "AI maslahatchi bilan",
        line2: ", yolg'iz emas",
      },
      sub: "11 ta AI vosita, 1500+ universitet, profiling va muddatlar bir joyda. Telegram push, hujjatlarni avtomatik tahlil, to'liq admission paket uchun AI Agent.",
      note: "Free: kunlik 10 so'rov · karta talab qilinmaydi · bir bosishda obunani bekor qilish",
    },
    stats: [
      { number: "1500+", label: "universitet bazasi" },
      { number: "11", label: "AI vosita" },
      { number: "3", label: "til (RU / EN / UZ)" },
      { number: "∞", label: "ariza kuzatish" },
    ],
    platform: {
      tag: "Platforma",
      h2: "Oddiy chat emas — bog'langan ekotizim",
      sub: "Profil, arizalar, AI vositalar va xabarnomalar bir-biri bilan bog'langan. Kontekst yo'qolmaydi.",
      items: [
        { title: "AI Agent", desc: "Bir bosish → 4 bosqich: imkoniyatlarni baholash, universitetlar tanlovi, stipendiyalar, reja. Ketma-ket pipeline." },
        { title: "AI Maslahatchi", desc: "Har bir sahifada qalqib turuvchi chat. Profilingiz va arizalaringizni biladi. Telegramda ham ishlaydi." },
        { title: "Application Tracker", desc: "Qaysi universitetlarga ariza topshirayotganingiz ro'yxati. Har bir ariza uchun AI «keyingi qadam», auto-checklist, muddatlar." },
        { title: "Document Parse", desc: "PDF transcript / SAT report / CV ni yuklang — AI maydonlarni chiqarib, profilni to'ldiradi." },
        { title: "Muddat kalendari", desc: "Barcha arizalarning oylik jadvali, prioritet bo'yicha rangli." },
        { title: "Telegram bot", desc: "Muddatdan 30 / 14 / 7 / 3 / 1 / 0 kun oldin push xabarnomalar + Telegramdagi Counselor." },
      ],
    },
    tools: {
      tag: "11 AI vosita",
      h2: "Admission jarayonining har bir bosqichi uchun",
      sub: "Har bir vosita bitta vazifaga moslashtirilgan — universal chatdan chuqurroq.",
      items: [
        { title: "Profil · Diagnostika", desc: "AI sizning profilingizga admission officer ko'zi bilan qaraydi" },
        { title: "Qabul imkoniyatlari", desc: "Realistik reach / match / safety kategoriyalari" },
        { title: "Roadmap · Tracker", desc: "Muddatli 6-12 oylik shaxsiy reja" },
        { title: "University Advisor", desc: "Profilingizga mos 1500+ universitetdan tanlash" },
        { title: "Scholarship Matcher", desc: "Fuqarolik, profil, mamlakat bo'yicha stipendiyalar" },
        { title: "Essay Coach", desc: "Tuzilma, yondashuvlar, taqrir, anti-klishe" },
        { title: "Interview Trainer", desc: "Admission interview mashqi · matn VA OVOZ" },
        { title: "Recommendation Letter", desc: "Tavsiyanomalar uchun xat va tahrir yordami" },
        { title: "CV / Resume Builder", desc: "ATS-do'st CV: US / EU / Academic" },
        { title: "Cost Calculator", desc: "Tuition + yashash + visa, stipendiyalarni hisobga olib" },
        { title: "Mock Application Reviewer", desc: "Topshirishdan oldin qattiq review" },
      ],
    },
    how: {
      tag: "Qanday ishlaydi",
      h2: "Profildan topshirishgacha 3 qadam",
      steps: [
        { step: "1", title: "Profilni 3 daqiqada to'ldiring", desc: "Yoki transcript / CV ni yuklang — AI baholar, testlar va faollikni avtomatik chiqaradi." },
        { step: "2", title: "AI Agent ni ishga tushiring", desc: "5 daqiqada: imkoniyatlar → 1500+ dan shortlist → mos stipendiyalar → 12 oylik reja." },
        { step: "3", title: "Topshiring va eslatma oling", desc: "Application Tracker har bir arizani kuzatadi. Telegram + email muddatlarni eslatadi." },
      ],
    },
    why: {
      tag: "Nega Entrium",
      h2: "Asosiy farq — bog'liqlik",
      reasons: [
        { title: "Single Profile", desc: "Bir marta to'ldiring — barcha 11 vositada auto-fill. Hujjatlar AI orqali tahlil qilinadi." },
        { title: "Bazada 1500+ universitet", desc: "Vector qidiruv bilan to'liq QS World Rankings 2026. AI haqiqiy ma'lumotlar asosida tavsiya beradi, o'ylab topmaydi." },
        { title: "Telegram + email", desc: "30/14/7/3/1/0 kun oldin push xabarnomalar. Counselor Telegramda ham ishlaydi." },
        { title: "Public sharing", desc: "Admission paketingizni bitta URL orqali ko'rsating — mentorga, ota-onaga, maslahatchiga." },
        { title: "Referal dasturi", desc: "Profilini to'ldirgan har bir do'st uchun +10 bonus so'rov. Unga ham boshlanishida +10." },
        { title: "Pro = cheksiz", desc: "Yakuniy oylarda kunlik 10 yetmay qolganda — Claude Sonnet 4.5 va AI Agent bilan Pro." },
      ],
    },
    faq: {
      tag: "Savollar",
      h2: "Tez-tez beriladigan savollar",
      items: [
        { q: "Narxi qancha?", a: "Free versiya kuniga 10 ta so'rov beradi — boshlanishda ko'pchilikka yetadi. Pro yakuniy 1-2 oyda muddatlardan oldin yuklama eng yuqori bo'lganda kerak. Istalgan vaqtda bekor qilish mumkin." },
        { q: "Bu ChatGPT'dan qanday farq qiladi?", a: "ChatGPT sizning profilingizni bilmaydi, sessiyalararo kontekstni eslab qolmaydi, 1500+ universitet bazasi yo'q va muddatlarni kuzatmaydi. Bu yerda hammasi bog'langan: profil → vositalar → arizalar → xabarnomalar." },
        { q: "Qaysi modeldan foydalaniladi?", a: "Pro — Claude Sonnet 4.5 (akademik tahlil uchun eng kuchli). Free — Claude Haiku 4.5 (tez, siz uchun bepul). Ovozli interview uchun OpenAI Realtime API. Hujjatlar Sonnet vision capability orqali tahlil qilinadi." },
        { q: "Maxfiylik bilan nima bo'ladi?", a: "Profil RLS bilan Supabase Postgres'da saqlanadi — faqat siz ko'rasiz. Hujjatlar xotirada tahlil qilinib, saqlanmaydi. Esselar Anthropic API ga ZDR siyosati doirasida yuboriladi. Akkauntni o'chirish hammasini o'chiradi." },
        { q: "U o'zbek / ingliz tilida ishlaydimi?", a: "Ha. Interfeys RU / EN / UZ, AI sizning tilingizda avtomatik javob beradi. Telegram bot ham moslashadi." },
        { q: "Profilni maslahatchiga ulashish mumkinmi?", a: "Ha. /settings da «Public link» tugmasi bor — /p/your-name yaratadi. Kontaktlar va izohlar yashirin, faqat akademik kontekst va arizalar ro'yxati ko'rinadi." },
      ],
    },
    finalCta: {
      h2: "Hujjat topshirish — yolg'izlik joyi emas",
      sub: "Bepul, kartasiz, bir bosishda obuna bekor. Profilni 3 daqiqada to'ldiring — vaziyatingizni haqiqatan ham biladigan AI maslahatchi oling.",
    },
    footer: {
      tagline: "AI · Admission",
      copyright: "© 2026 Entrium · Abituriyentlar uchun mehr bilan yaratilgan",
    },
  },
}

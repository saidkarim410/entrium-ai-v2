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
      start: "Начать бесплатно",
      tryAgent: "Попробовать AI Agent",
      haveAccount: "У меня уже есть аккаунт",
    },
    hero: {
      badge: "Edu AI #1 в СНГ · Entrium AI",
      title: {
        line1: "Поступай",
        accent: "с AI-консультантом",
        line2: ", а не в одиночку",
      },
      sub: "100+ наших ребят уже учатся в LSE, NYU, Sapienza, Purdue, UCW. Узнай свои реальные шансы в топ-100 за 60 секунд — без консультанта за $300/час.",
      note: "Бесплатный старт · Без карты · 10 AI-запросов в день",
    },
    stats: [
      { number: "100+", label: "поступили в топ-вузы" },
      { number: "2000+", label: "диагностик профиля" },
      { number: "1500+", label: "вузов в базе QS 2026" },
      { number: "11", label: "AI-инструментов" },
    ],
    platform: {
      tag: "Платформа",
      h2: "Не чат — рабочая система поступления",
      sub: "Профиль, заявки, AI и уведомления связаны. Один раз заполняешь — работает на всех 11 инструментах. Контекст не теряется между сессиями.",
      items: [
        { title: "AI Agent", desc: "Один клик → диагностика → шорт-лист вузов из 1500+ → подходящие стипендии → план на 12 месяцев. За 5 минут." },
        { title: "AI Counselor", desc: "Знает твой профиль и заявки. Отвечает в браузере и в Telegram. На русском, английском, узбекском." },
        { title: "Application Tracker", desc: "Куда подаёшь, что осталось, что просрочено. AI напомнит и подскажет следующий шаг по каждой заявке." },
        { title: "Document Parse", desc: "Кинь PDF-transcript, SAT report или CV — AI вытащит оценки, тесты, активности и сам заполнит профиль." },
        { title: "Календарь дедлайнов", desc: "Все заявки на одном экране, с цветами по приоритету. Без хаоса в голове и стикеров на холодильнике." },
        { title: "Telegram-бот", desc: "Push за 30 / 14 / 7 / 3 / 1 день до дедлайна. AI-консультант доступен прямо в чате — 24/7." },
      ],
    },
    tools: {
      tag: "11 AI инструментов",
      h2: "На каждый этап поступления",
      sub: "Каждый инструмент натренирован под одну задачу. Глубже и точнее, чем универсальный чат — это разница между «спросил у друга» и «пошёл к специалисту».",
      items: [
        { title: "Профиль · диагностика", desc: "Разбор профиля глазами офицера приёмной комиссии — без воды и комплиментов." },
        { title: "Шансы поступления", desc: "Reach / Match / Safety по каждому вузу. Реалистично, на основе твоих оценок и тестов." },
        { title: "Roadmap · трекер", desc: "Персональный план на 6–12 месяцев. Перегенерируется, если меняется ситуация." },
        { title: "University Advisor", desc: "Подбор из 1500+ вузов QS 2026 — под профиль, бюджет, регион." },
        { title: "Scholarship Matcher", desc: "Стипендии под гражданство и профиль. 300+ международных программ в базе." },
        { title: "Essay Coach", desc: "Структура, hook, body, концовка. Anti-cliché. Адаптировано под Common App и UCAS." },
        { title: "Interview Trainer", desc: "Реальные вопросы под конкретный вуз. Текст и ГОЛОС, оценка по STAR-методу." },
        { title: "Recommendation Letter", desc: "Помощь с request-письмом учителю и редактура готового рекомендательного." },
        { title: "CV / Resume Builder", desc: "ATS-friendly CV в трёх форматах: US, EU, Academic. Готово к подаче." },
        { title: "Cost Calculator", desc: "Tuition + жильё + виза. Минус стипендии, которые тебе реально светят." },
        { title: "Mock Application Reviewer", desc: "Брутальный review всей заявки перед отправкой. Ловит то, что не заметит автор." },
      ],
    },
    how: {
      tag: "Как это работает",
      h2: "От профиля до подачи — 3 шага",
      steps: [
        { step: "1", title: "Заполни профиль за 3 минуты", desc: "Или загрузи transcript / CV — AI сам вытащит оценки, тесты и активности." },
        { step: "2", title: "Запусти AI Agent", desc: "Через 5 минут у тебя на руках: оценка шансов, шорт-лист вузов, стипендии и план на год." },
        { step: "3", title: "Подавай и не пропускай дедлайны", desc: "Application Tracker и Telegram-бот ведут каждую заявку. Ты пишешь эссе — мы напоминаем." },
      ],
    },
    why: {
      tag: "Почему Entrium",
      h2: "Что делает нас другими",
      reasons: [
        { title: "Не выдумывает — считает", desc: "1500+ вузов и 300+ стипендий из официального QS API. Vector search ищет по смыслу, AI не придумывает названия." },
        { title: "Знает реалии СНГ", desc: "Промпты натренированы под профили из Узбекистана, России, Казахстана. AI учитывает локальные тесты и систему оценок." },
        { title: "Один профиль — 11 инструментов", desc: "Заполнил один раз — auto-fill во всех инструментах. Документы парсятся AI, не надо вбивать вручную." },
        { title: "Telegram-бот вместо календаря", desc: "Push за 30/14/7/3/1 день — не упустишь Common App или UCAS. AI-консультант доступен прямо в чате." },
        { title: "Открытая ссылка для ментора", desc: "Покажи свой admission package одним URL — родителям, ментору, школьному консультанту. Контакты скрыты." },
        { title: "Дополняет, а не заменяет", desc: "Не вместо живого консультанта — вместе с ним. AI делает рутинную аналитику, ты с человеком обсуждаешь решения." },
      ],
    },
    faq: {
      tag: "Вопросы",
      h2: "Частые вопросы",
      items: [
        { q: "Сколько стоит?", a: "Бесплатный старт — 10 AI-запросов в день, навсегда. Этого хватает большинству до финальных месяцев. Pro — $18/мес (Entrium AI Pro + безлимит, отписка в один клик) или $5 за разовый глубокий анализ. Карту просим только когда сам решаешь подключить Pro." },
        { q: "Это просто ChatGPT с другим интерфейсом?", a: "Нет. У нас специализированный promptarium, натренированный под admission (а не general chat). База QS 2026 с реальными данными. Знание реалий поступления из СНГ. Tracker дедлайнов, Telegram-бот, парсер документов. ChatGPT не знает твой профиль и забывает контекст." },
        { q: "Кто за этим стоит?", a: "Команда Entrium — консалтинговое агентство в Узбекистане, помогающее ребятам из СНГ поступать в зарубежные вузы. 100+ поступивших за всё время, 2000+ диагностик. AI-платформа — это наш продукт, в который мы зашили опыт всех консультаций." },
        { q: "А если AI ошибётся?", a: "AI даёт оценку, не диагноз. Все выводы можно проверить и обсудить с живым консультантом — мы добавим контакт после первого анализа. Refund-политика: если разовый анализ не помог — деньги возвращаем." },
        { q: "Что с моими данными?", a: "Профиль в Supabase с RLS — видишь только ты. Документы парсятся в памяти, не сохраняются. Эссе обрабатываются AI-провайдером под ZDR-политику (не используются для обучения). Удаление аккаунта удаляет всё." },
        { q: "На каких языках?", a: "Интерфейс и AI: RU / EN / UZ. Эссе можно писать на английском, разбор — на русском. Telegram-бот подстраивается под твой язык автоматически." },
        { q: "Зачем это, если у меня уже есть консультант?", a: "AI дополняет, не заменяет. Консультант ограничен по времени, AI работает 24/7. Эссе можно прогонять между сессиями с консультантом, диагностику обновлять каждый месяц. В итоге консультант фокусируется на стратегии — рутина на нас." },
      ],
    },
    finalCta: {
      h2: "Хватит гадать. Узнай свои шансы.",
      sub: "100+ ребят из СНГ уже поступили в LSE, NYU, Sapienza, Purdue. Заполни профиль за 3 минуты — получи реалистичную оценку шансов и план действий. Без карты, без подписки.",
    },
    footer: {
      tagline: "AI · Admission · СНГ",
      copyright: "© 2026 Entrium · Сделано в Узбекистане для абитуриентов СНГ",
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
      badge: "AI counselor · Entrium AI",
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
        { title: "Pro = unlimited", desc: "When 10/day stops being enough in the final months — Pro with Entrium AI Pro and AI Agent." },
      ],
    },
    faq: {
      tag: "FAQ",
      h2: "Frequently asked",
      items: [
        { q: "How much does it cost?", a: "Free gives you 10 AI requests a day — enough for most students starting out. Pro is for the final 1-2 months before deadlines, when load peaks. Cancel anytime." },
        { q: "How is this different from ChatGPT?", a: "ChatGPT doesn't know your profile, doesn't remember context across sessions, has no DB of 1500+ universities with QS rankings, and doesn't track deadlines. Here, everything is connected: profile → tools → applications → notifications." },
        { q: "Which model do you use?", a: "Pro — Entrium AI Pro (strongest for academic analysis). Free — Entrium AI (fast, free for you). Voice interview uses real-time speech models. Documents are parsed via the same vision-enabled AI." },
        { q: "What about privacy?", a: "Your profile lives in Supabase Postgres with RLS — only you see it. Documents are parsed in memory and never stored. Essays go through our AI provider under a ZDR (zero-data-retention) policy. Deleting your account deletes everything." },
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
      badge: "AI maslahatchi · Entrium AI",
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
        { title: "Pro = cheksiz", desc: "Yakuniy oylarda kunlik 10 yetmay qolganda — Entrium AI Pro va AI Agent bilan Pro." },
      ],
    },
    faq: {
      tag: "Savollar",
      h2: "Tez-tez beriladigan savollar",
      items: [
        { q: "Narxi qancha?", a: "Free versiya kuniga 10 ta so'rov beradi — boshlanishda ko'pchilikka yetadi. Pro yakuniy 1-2 oyda muddatlardan oldin yuklama eng yuqori bo'lganda kerak. Istalgan vaqtda bekor qilish mumkin." },
        { q: "Bu ChatGPT'dan qanday farq qiladi?", a: "ChatGPT sizning profilingizni bilmaydi, sessiyalararo kontekstni eslab qolmaydi, 1500+ universitet bazasi yo'q va muddatlarni kuzatmaydi. Bu yerda hammasi bog'langan: profil → vositalar → arizalar → xabarnomalar." },
        { q: "Qaysi modeldan foydalaniladi?", a: "Pro — Entrium AI Pro (akademik tahlil uchun eng kuchli). Free — Entrium AI (tez, siz uchun bepul). Ovozli interview uchun real-time nutq modeli. Hujjatlar bir xil vision-imkoniyatli AI orqali tahlil qilinadi." },
        { q: "Maxfiylik bilan nima bo'ladi?", a: "Profil RLS bilan Supabase Postgres'da saqlanadi — faqat siz ko'rasiz. Hujjatlar xotirada tahlil qilinib, saqlanmaydi. Esselar AI-provayder tomonidan ZDR (zero-data-retention) siyosati doirasida qayta ishlanadi. Akkauntni o'chirish hammasini o'chiradi." },
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

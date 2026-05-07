@AGENTS.md

# Entrium AI v2 — Project Context for Claude

> AI-powered university admissions platform for Russian/English/Uzbek-speaking students applying to international universities.
> This file is the **single source of truth** for project context, AI tool prompts (ported from v1), and diagnostic procedures.

---

## 1. Production URLs & Resources

- **Live site (v2):** https://entrium-ai-v2.vercel.app
- **Original brand site:** https://entrium.ai · hello@entrium.ai · t.me/entriumuzb
- **GitHub repo:** https://github.com/saidkarim410/entrium-ai-v2 (auto-deploy on push to `main`)
- **Vercel project:** `prj_JiUijuqXlVnuG6OVjLBXf5o7pUtq` (team `team_MPhSFfSFW1AFxP4nHcdpGxpZ`)
- **Supabase project:** `zcbbpqfdyqavdubzrgaf` (`https://zcbbpqfdyqavdubzrgaf.supabase.co`)
- **Old v1 (legacy):** https://github.com/saidkarim410/entrium-ai (folder `C:\Users\Huawei\Documents\entrium-ai`)
- **Telegram bot:** `@entriumleedbot` (chat group `-5273439557`)
- **Telegram channel (public):** https://t.me/entriumuzb

### Owner & Brand
- Саидкарим Турсунбаев · `tursunbaev505@gmail.com` · Telegram `@Tursunbaev01`
- Brand contact: `hello@entrium.ai`
- Tagline (RU): «Твой шанс на MIT · Stanford · Cambridge · ETH»
- Mission (RU): «Помогаем студентам из Узбекистана и СНГ поступать в Harvard, Oxford, MIT — с AI-анализом профиля и дорожной картой, построенной под каждого.»
- Footer: «© 2026 Entrium · Сделано в Узбекистане»

---

## 1.5. Product Model (from production entrium.ai)

**Pricing:**

| Tier | Price | What's in |
|---|---|---|
| **One-time AI Analysis** | $5 | AI-анализ профиля по 10 параметрам · Реалистичная оценка по каждому вузу · Конкретные next steps на 3 месяца · Доступ навсегда |
| **Subscription (Pro)** | $18/мес | Всё из разовой + AI-тренер для эссе (3 режима) + Тренировка интервью + Персональный трекер с месячным планом |

Payments: Stripe. Cancel anytime. No hidden fees.

**4 core tools (consolidated from v1's 8):**

1. **AI · Анализ профиля** — глубокий разбор шансов поступления, реалистичная оценка по 10-балльной шкале, сравнение с типичными профилями поступивших, рекомендации до конца года.
2. **AI · Эссе** — три режима (Coach / Analyze / Humanize). Адаптировано под Common App + UCAS промпты. Распознаёт «AI-почерк», помогает писать живо.
3. **AI · Интервью** — реальные вопросы под конкретный вуз и программу, оценка по STAR-методу, 10-балльная шкала, RU/EN/UZ.
4. **Процесс · Трекер** — персональный план месяц за месяцем (тесты, эссе, активности, дедлайны). Перегенерация при изменении обстоятельств.

**3-step user journey:**
1. Заполни профиль — один экран, никакой бюрократии
2. AI разберёт профиль — глубокий анализ за минуту
3. Получи персональный план — дорожная карта по месяцам

**Stats badges (для лендинга):**
- 1500+ университетов
- 300+ стипендий
- 8 AI-инструментов

**FAQ канон (используется на лендинге):**
- «Это просто ChatGPT с другим интерфейсом?» — нет, специализированный promptarium + база QS + знание реалий поступления из СНГ
- «Что с моими данными?» — RLS, encrypted, удаляются по запросу
- «Можно отменить подписку?» — да, в любой момент через Stripe
- «Что если AI-анализ не помог?» — refund политика
- «Платформа только на русском?» — RU + EN + UZ
- «Зачем если есть консультант?» — дополняет, не заменяет; работает 24/7

---

## 2. Tech Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 16 App Router (Turbopack) |
| Language | TypeScript strict |
| Styling | Tailwind CSS v4 + shadcn/ui (uses `@base-ui/react`, NOT Radix — no `asChild`) |
| Database | Supabase Postgres + pgvector |
| Auth | Supabase Auth (Email/Password + Google OAuth + Telegram Login Widget) |
| AI | Vercel AI SDK v6 (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`) |
| Models | Claude Sonnet 4.5 (Pro), Claude Haiku 4.5 (Free), `text-embedding-3-small` |
| i18n | Custom cookie-based, `src/lib/i18n/` (RU/EN/UZ) |
| Deploy | Vercel (Fluid Compute, auto-deploy via GitHub integration) |
| Monitoring | Sentry (`/monitoring` tunnel route) |
| Validation | Zod |

---

## 3. Database Schema (`entrium` schema, isolated)

The Supabase project is **shared with another product**. Our tables live in schema `entrium` (NOT `public`). PostgREST exposes both via `db_schema = "public, entrium, graphql_public"`.

| Table | Purpose |
|---|---|
| `entrium.profiles` | App-level user data (extends `auth.users`). FK: `id → auth.users(id)` |
| `entrium.usage_events` | Per-request log for rate limiting / billing |
| `entrium.tool_runs` | Saved AI tool sessions (history) |
| `entrium.universities` | 1504 unis from official QS API + 1536-dim embeddings |
| `entrium.scholarships` | 289 international scholarships + embeddings |
| `entrium.subscriptions` | Stripe Pro state |

**Triggers:**
- `on_entrium_auth_user_created` → `entrium.handle_new_user()` — auto-creates profile on `auth.users` insert. Uses `extensions.gen_random_bytes(6)` for referral code.
- `entrium.profiles_updated_at` / `subscriptions_updated_at` — auto-update `updated_at`.

**RLS:** enabled on all entrium tables. Users read/update only their own rows. `universities` and `scholarships` are public-read.

**Vector search RPC:** `entrium.match_universities()` and `entrium.match_scholarships()` use cosine similarity via ivfflat index.

---

## 4. Environment Variables (Vercel)

```
NEXT_PUBLIC_SUPABASE_URL          - public Supabase URL
NEXT_PUBLIC_SUPABASE_ANON_KEY     - public anon JWT (RLS-respecting)
SUPABASE_SERVICE_ROLE_KEY         - admin JWT (bypasses RLS, server-only)
ANTHROPIC_API_KEY                 - Claude API
OPENAI_API_KEY                    - OpenAI (embeddings only)
NEXT_PUBLIC_SITE_URL              - https://entrium-ai-v2.vercel.app
NEXT_PUBLIC_SENTRY_DSN            - Sentry tunnel
TELEGRAM_BOT_TOKEN                - bot for Telegram OAuth + lead delivery
NEXT_PUBLIC_POSTHOG_KEY           - (optional) PostHog
```

**OAuth credentials configured in Supabase Auth (not in env):**
- Google: client_id `988599634125-...apps.googleusercontent.com` + secret set via Supabase Management API.
- Redirect URI registered in Google Cloud Console: `https://zcbbpqfdyqavdubzrgaf.supabase.co/auth/v1/callback`.

---

## 5. AI Tool System Prompts (ported from v1 — production-tested)

These prompts are **battle-tested** in v1 (`legacy/index.html`). When upgrading or adding tools to v2, **prefer these prompts** over generic ones.

### 5.1 `callAI` wrapper (v1 reference)

```js
// v1 used Anthropic API directly. v2 uses Vercel AI SDK with the same model + prompts.
fetch("/api/ai", {
  method: "POST",
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",   // → "claude-sonnet-4-5-20250929" in v2
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: USER_PROMPT }]
  })
})
```

### 5.2 Essay Coach (`runEssayCoach`)

**System:**
```
Ты — элитный тренер по написанию эссе для поступления в Ivy League и топ-10 мировых университетов.
У тебя 20 лет опыта. Твои студенты поступили в Harvard, MIT, Stanford, Yale, Princeton, LSE, Oxford.
Ты пишешь ТОЛЬКО на русском языке. Ты честный, конкретный, не хвалишь плохое.
Структура твоего ответа:
## 🎯 Первое впечатление (2-3 предложения — честно)
## 💪 Что работает (конкретно)
## ⚠️ Критические проблемы (конкретно с цитатами из текста)
## ✍️ Переработанная версия (полный улучшенный текст на английском, в Ivy League стиле)
## 🔑 Ключевые уроки (3-5 пунктов — что запомнить)
```

**User template:**
```
Специальность: {major}
Целевой университет: {uni}
Фокус улучшения: {focus_tags}

ЧЕРНОВИК ЭССЕ:
{draft}

Сделай полный разбор и напиши переработанную версию на английском языке в стиле Ivy League.
```

### 5.3 Essay Analysis (`runEssayAnalysis`)

**System:**
```
Ты — строгий адмиссионный консультант Ivy League с опытом работы в приёмной комиссии Harvard и Yale.
Делаешь профессиональный разбор эссе. Пишешь на русском.
Формат:
## 📊 Общая оценка (из 10) + одно предложение вердикт
## 🏗️ Структура (оцени хук, body, заключение — что работает, что нет)
## 🎭 Голос и тон (звучит ли как живой человек или как AI/шаблон)
## 🚩 Красные флаги (клише, банальности, слабые места — цитируй)
## ✨ Лучшие моменты (что точно оставить)
## 📝 Конкретные правки (минимум 5 — цитата → исправление)
## 🏆 Шанс принятия в {target} с этим эссе (честная оценка)
```

### 5.4 Humanizer (`runHumanizer`)

**System:**
```
You are a master essay editor who transforms AI-sounding text into authentic, human writing
that gets students into Harvard, Princeton, and Yale.

Your humanization rules:
1. Remove ALL AI clichés: "delve into", "tapestry", "testament to", "in conclusion",
   "passionate about", "fostered", "multifaceted", "it is worth noting"
2. Replace passive voice with active, specific sentences
3. Add sensory details and concrete moments instead of abstract claims
4. Vary sentence length dramatically — short punchy sentences mixed with longer flowing ones
5. Use the student's actual voice, not formal academic English
6. Remove throat-clearing openers ("I have always been...")
7. Make the reader feel something in the first 2 sentences
8. Every claim needs a specific detail, not a generality
9. Target tone: {tone}
10. Target university: {uni}

Output format (respond in Russian for labels, English for the essay):
## 🧠 Что было не так (на русском — список AI-паттернов которые ты убрал)
## ✨ Гуманизированная версия (на английском — полный текст)
## 💡 Почему это работает (на русском — 3-4 объяснения)
```

**Tone presets:**
- `ivy`: ambitious, intellectually curious, confident yet humble — the voice of a brilliant 17-year-old who has seen the world
- `warm`: warm, personal, storytelling-driven — feels like a conversation with a thoughtful friend
- `confident`: direct, assertive, no filler words — every sentence earns its place
- `creative`: unique, unexpected, takes creative risks that pay off

### 5.5 Scholarship AI Search (`runScholarAI`) — uses **web_search** tool

**System:**
```
Ты — эксперт по международным стипендиям. Ищи актуальные стипендии и отвечай на русском
с конкретными данными: суммы, дедлайны, требования, ссылки.
```

Anthropic API enables `web_search_20250305` tool here. Output rendered as Markdown.

### 5.6 University AI Search (`qsAISearch`) — uses **web_search** tool

**System:**
```
Ты — эксперт по университетским рейтингам QS 2026. Сегодня {date}. Дай актуальную информацию
о запрашиваемых университетах: QS rank 2026, основные факты, требования для поступления,
чем известны, стоимость, финпомощь. Пиши на русском, кратко и структурированно с Markdown таблицами.
```

**User template:**
```
Найди информацию QS 2026: {query} страна: {country} предмет: {subject}.
Дай таблицу топ-5 университетов с QS рангом, баллом, acceptance rate, стоимостью обучения в год.
```

### 5.7 Personal Tracker (`generateTracker`) — returns **strict JSON**

**System:**
```
Ты — элитный консультант по поступлению в топовые университеты мира.
Сегодня: {today}. Год поступления студента: {year}.
Твоя задача: создать ПЕРСОНАЛЬНЫЙ детальный план подготовки к поступлению.

Ответь строго в следующем JSON формате (без markdown, только чистый JSON):
{
  "diagnosis": "Краткий анализ профиля студента — сильные стороны, слабые, шанс поступления, главные риски. 3-4 предложения на русском.",
  "score": 72,
  "months": [
    {
      "month": "Март 2026",
      "emoji": "🎯",
      "color": "#c9a84c",
      "tasks": [
        {
          "id": "t1",
          "title": "Название задачи",
          "description": "Детальное описание что делать, как, зачем",
          "priority": "high",
          "category": "tests",
          "deadline": "31 марта",
          "duration": "2 недели"
        }
      ]
    }
  ]
}

Категории: tests, essay, docs, research, activity, application, language, prep
Приоритеты: high, medium, low
Минимум 6-8 месяцев, минимум 3-5 задач в каждом месяце.
ПЕРСОНАЛИЗИРУЙ под уровень, слабые места, целевые вузы и специальность.
```

### 5.8 Reference Letter (`generateRefLetter`)

**System:**
```
Ты — эксперт по академическому письму. Напиши профессиональное рекомендательное письмо
на {language} языке. Письмо должно быть конкретным, убедительным, с деталями — не общими фразами.
Длина: 4-5 абзацев. Формат: полное готовое письмо с шапкой и подписью.
```

### 5.9 Interview Trainer — two-step (questions + scoring)

**Step 1 — Generate questions (`startInterview`):**
```
Ты — опытный интервьюер приёмной комиссии. Генерируй реальные вопросы для admission interview.
Язык вопросов: {lang}. Отвечай ТОЛЬКО JSON массивом строк — вопросы без нумерации.
```

**Step 2 — Score answer (`submitAnswer`):**
```
Ты — опытный interviewer приёмной комиссии топ-университета. Оцени ответ кандидата.
Отвечай на {lang}. Будь конкретным и строгим. Формат ответа:
СКОР: X/10
ЧТО ХОРОШО: ...
ЧТО УЛУЧШИТЬ: ...
ЛУЧШИЙ ВАРИАНТ: (1-2 предложения как ответить лучше)
```

Score parsing: regex `/СКОР:\s*(\d+)/i`. Color thresholds: ≥8 green, ≥6 amber, else red.

### 5.10 Diagnostic Categories (`DIAG_CATS`) — used by Analyzer

```
Категория        | 6-уровневая шкала (lower score = stronger profile)
-----------------|----------------------------------------------------
academic         | 🎓 Академика (SAT, GPA, олимпиады)
english          | 🌍 Английский (IELTS/TOEFL)
extracurricular  | ⚡ Внеклассная активность
essay            | ✍️  Эссе и письмо
finance          | 💰 Финансы / стипендии
strategy         | 🎯 Стратегия выбора вузов
```

Each category has 6 levels with `score` 1–6, `title`, `desc` — used to render diagnostic radar.

### 5.11 Onboarding profile structure (`obProfile`)

```ts
type OnboardProfile = {
  name: string         // студента
  major: string        // специальность
  unis: string         // целевые вузы (comma-separated)
  year: string         // год поступления (e.g. "2026")
  prog: string         // bachelor | master | phd | mba
  region: string       // USA | UK | EU | Asia | mixed
  level: string        // self-rated readiness
  gpa: string          // e.g. "4.5"
  eng: string          // e.g. "IELTS 7.0"
  sat: string          // e.g. "1450" or empty
  createdAt: string
}
```

Stored in `localStorage('entrium-ob-profile')` in v1 — should move to `entrium.profiles.onboarding_data` jsonb in v2.

---

## 6. Architecture (v2)

```
src/
├── app/
│   ├── (auth)/         login, signup pages + actions, google-button, telegram-button
│   ├── (app)/          dashboard, tools/[tool], universities, scholarships (auth-gated)
│   ├── api/
│   │   ├── chat/       Vercel AI SDK streaming endpoint
│   │   └── auth/telegram/  Telegram Login HMAC verification
│   ├── auth/callback/  Supabase OAuth code exchange
│   ├── privacy/, terms/, sitemap.ts, robots.ts, opengraph-image.tsx
│   ├── error.tsx, not-found.tsx
│   └── layout.tsx (force-dynamic for cookie locale)
├── components/ui/      shadcn (base-ui/react underneath)
├── lib/
│   ├── ai/             models, prompts, RAG (rag.ts: searchUniversities, searchScholarships)
│   ├── supabase/       admin (service_role), server (anon+cookies), middleware (proxy use)
│   ├── i18n/           dict (RU/EN/UZ), server, client provider
│   ├── env.ts          lazy-read env vars
│   └── rate-limit.ts   per-user daily quota in DB
└── proxy.ts            Next.js 16 proxy (renamed from middleware.ts)
                        Handles auth gate + 404 for unknown tool slugs
```

---

## 7. Diagnostic Procedures

### 7.1 Quick health check
```bash
# Site
curl -sS -o /dev/null -w "%{http_code}\n" https://entrium-ai-v2.vercel.app

# DB connectivity (needs $SUPABASE_ACCESS_TOKEN sbp_...)
curl -sS -X POST "https://api.supabase.com/v1/projects/zcbbpqfdyqavdubzrgaf/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"SELECT count(*) FROM entrium.profiles;"}'

# Sentry tunnel
curl -sS -o /dev/null -w "%{http_code}\n" -X POST https://entrium-ai-v2.vercel.app/monitoring

# Auth gate (must redirect 307)
curl -sS -o /dev/null -w "%{http_code}\n" --max-redirs 0 https://entrium-ai-v2.vercel.app/dashboard

# Full QA suite (35 tests)
node scripts/qa-test.mjs
```

### 7.2 Common failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| `ERR_TOO_MANY_REDIRECTS` on `/dashboard` | User auth'd but profile missing → layout redirects → proxy redirects back | `getCurrentProfile()` self-heals (creates profile via admin client). Backfill SQL: `supabase/migrations/0004_backfill_profiles.sql`. |
| Google OAuth `redirect_uri_mismatch` | OAuth Client missing Supabase callback URI | Add `https://zcbbpqfdyqavdubzrgaf.supabase.co/auth/v1/callback` to Authorized redirect URIs. |
| Google OAuth "access blocked" for non-test users | Consent screen still in `Testing` | `console.cloud.google.com/auth/audience` → PUBLISH APP. Basic scopes don't need verification. |
| Build fails: `convertToCoreMessages doesn't exist` | AI SDK v6 renamed it | Use `convertToModelMessages` (returns Promise — `await`). |
| Build fails: `asChild does not exist` on `Button` / `DropdownMenuTrigger` | New shadcn uses `@base-ui/react`, no `asChild` | Use `buttonVariants({...})` className on `<Link>` directly. |
| `function gen_random_bytes does not exist` in trigger | search_path missing extensions schema | `set search_path = entrium, public, extensions` and `extensions.gen_random_bytes(6)` explicitly. |
| Vercel deploy rejected: "Git author must have access to team" | Git config email mismatch | `git config user.email tursunbaev505@gmail.com && git commit --amend --reset-author` |
| Auth-gated routes return 200 instead of 307 | `loading.tsx` at root enables Suspense streaming → redirect after stream is soft (HTTP stays 200) | Don't put `loading.tsx` at root. Auth redirect lives in `proxy.ts` (runs before render). |
| Cookie locale always returns RU | Page is statically prerendered | Add `export const dynamic = "force-dynamic"` to root layout + landing page. |
| Vector search returns empty | Embeddings column NULL or threshold too high | `SELECT count(*) FROM entrium.universities WHERE embedding IS NULL`; lower `match_threshold` to 0.2. |
| GitHub push rejected (push protection) | Hardcoded API keys in scripts | Replace with `process.env.X`; if already in history, `rm -rf .git && git init` and force-push clean. |
| AI returns "limit_reached" too early | Free tier 5/day | Query `entrium.usage_events WHERE user_id=X AND created_at::date = today;`. Adjust `FREE_DAILY_LIMIT` in `src/lib/rate-limit.ts`. |
| OAuth creates user but no profile | Pre-existing user before trigger, or trigger error | Run backfill: `INSERT INTO entrium.profiles (id, email, ...) SELECT u.id, COALESCE(u.email, u.id::text\|\|'@unknown.local'), ... FROM auth.users u LEFT JOIN entrium.profiles p ON p.id = u.id WHERE p.id IS NULL ON CONFLICT (id) DO NOTHING;` |
| Vercel CLI shows `vercel deploy` "Unexpected error" with empty message | Git author not in team | Same as deploy-rejected fix above. |

### 7.3 Useful SQL queries

```sql
-- Users without profiles
SELECT u.id, u.email, u.raw_app_meta_data->>'provider' as provider
FROM auth.users u LEFT JOIN entrium.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Daily usage per user
SELECT user_id, count(*) FROM entrium.usage_events
WHERE created_at::date = current_date GROUP BY user_id ORDER BY count DESC;

-- Top tools by use
SELECT tool, count(*) FROM entrium.usage_events
GROUP BY tool ORDER BY count DESC;

-- Vector index health
SELECT count(*) FILTER (WHERE embedding IS NULL) AS missing_embeddings,
       count(*) AS total
FROM entrium.universities;

-- Pro subscribers
SELECT email, tier, pro_until FROM entrium.profiles WHERE tier = 'pro';
```

### 7.4 Telegram Bot diagnostics
```bash
# Verify bot is alive
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe"

# Send test message
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
  -d chat_id="$CHAT_ID" -d text="Test"
```

For Telegram Login Widget to work, run `/setdomain` in `@BotFather` → `entrium-ai-v2.vercel.app`.

---

## 7.5. Design System (from production entrium.ai)

The original entrium.ai brand uses a distinctive **dark editorial aesthetic** — gold + cream on near-black, serif typography for emphasis, mono labels for taxonomy. Adopt these tokens when polishing v2 UI.

### Typography
```
Display / Headings:  Playfair Display (serif) or Cinzel (uppercase, letter-spaced)
Body / Reading:      EB Garamond (serif, generous line-height ~1.85)
UI / Buttons:        Inter (or system sans)
Labels / Tags:       DM Mono (uppercase, letter-spacing 0.12-0.15em, 9-11px)
```

Italic serif is used for emphasis on university names (e.g., *Harvard, Oxford, MIT*).

### Color palette
```
Backgrounds:
  --bg            #0a0a0a   (page bg)
  --bg1           #121212   (card bg)
  --border        rgba(255,255,255,0.08)
  --border2       rgba(255,255,255,0.16)

Text:
  --cream         #fce8b8   (primary text on dark)
  --cream2        #d4c8a8   (secondary)
  --cream3        rgba(252,232,184,0.5)  (muted)

Accent / state:
  --gold          #c9a84c   (primary accent — buttons, highlights)
  --gold3         #e0c970   (lighter gold for hovers)
  --green         #5aaa78   (success, ≥8/10 scores)
  --amber         #c9a84c   (warning, ≥6/10 scores)
  --red           #e05050   (error, <6/10 scores)
  --purple        #9b6fc4   (Humanizer accent)
  --blue          #4a9ec4   (Universities accent)

Score color logic:
  score >= 8  → #5aaa78  (green)
  score >= 6  → #c9a84c  (amber/gold)
  score <  6  → #e05050  (red)
```

### Card pattern (used everywhere)
- Background: `var(--bg1)`
- Border: `1px solid var(--border)`
- Top accent stripe: `linear-gradient(90deg, transparent, {accent}, transparent)` height 2px
- Padding: 20-28px
- Headers in mono uppercase: «● AI ЖИВОЙ ПОИСК», «✦ РЕЗУЛЬТАТ ТРЕНЕРА»

### Button styles
- Primary: gold gradient `linear-gradient(135deg,#5a2d8a,#9b6fc4)` (purple-pink for AI actions) OR solid gold for primary CTAs
- Secondary: transparent with `border: 1px solid var(--border)`
- Mono uppercase text, letter-spacing 0.15em, 11px

### Section labels
Each section uses small mono caps as eyebrow: «● AI · АНАЛИЗ», «● ПОСТУПЛЕНИЕ · 2026», «ЦЕНЫ», «КАК ЭТО РАБОТАЕТ»

### Mockup card pattern
Throughout the landing: each tool feature has a mini "live mockup" card showing what the AI output looks like (e.g., score 7.6/10 with strengths list, essay draft with feedback, interview question with score). Cards have:
- mono label top-left (e.g., "AI · Результат")
- numeric score top-right with /10 suffix
- 3-4 list items with check/cross icons
- thin colored top border per category

### Hero animation
The original landing rotates through "MIT · Stanford · Cambridge · ETH" with italic serif. Adopt similar rotation in v2 hero.

---

## 8. Working Conventions

- **TypeScript strict** — no `any` unless interfacing with untyped third-party
- **Server-side defaults** — server components by default, "use client" only when needed (forms, hooks, browser APIs)
- **Cookies via `@supabase/ssr`** — never roll your own JWT
- **RLS-first** — every new entrium table needs RLS + appropriate policies
- **No comments unless WHY** — code should be self-explanatory; comments explain non-obvious constraints/decisions only
- **Russian primary** — UI strings live in `lib/i18n/dict.ts` under `ru` first, then translate to `en` and `uz`
- **AI prompts in `src/lib/ai/prompts.ts`** — when adding/changing tools, port from v1 prompts above (production-tested)
- **Test before claiming done** — run `node scripts/qa-test.mjs`. Should be 35/35.

---

## 9. Roadmap (priority order)

Based on the production model at entrium.ai:

| # | Feature | Status | Why |
|---|---|---|---|
| 1 | **Stripe** ($5 one-time + $18/mo Pro) | Not started | Core monetization model from entrium.ai |
| 2 | **Custom domain `entrium.ai`** + transfer DNS | Not started | Brand consolidation |
| 3 | **Onboarding flow** (port `obProfile` from v1: 5-step wizard) | Not started | Required for AI Analyzer to work |
| 4 | **AI Analyzer** with radar chart (`DIAG_CATS` from v1) | Not started | Hero feature on landing |
| 5 | **Adopt brand design tokens** (Playfair + Cinzel + EB Garamond, gold/cream palette) | Not started | Match entrium.ai aesthetic |
| 6 | **Refactor 8 tools → 4 tools UI** (Analyzer, Essay 3-mode, Interview, Tracker) | Not started | Match production model |
| 7 | **Mockup cards on landing** (live AI output previews) | Not started | Conversion-critical pattern |
| 8 | PostHog аналитика | Code ready, needs key | — |
| 9 | Email custom SMTP (Resend) | Not started | — |
| 10 | Mobile sidebar (currently desktop-only) | Not started | — |
| 11 | Cost calculator (port `calcCosts` + `COST_DATA` from v1) | Not started | — |
| 12 | Reference letter generator (port from v1) | Not started | — |
| 13 | Real-time deadlines tracker (port from v1) | Not started | — |

---

## 10. v1 vs v2 Reference

| Aspect | v1 (legacy) | v2 (current) |
|---|---|---|
| Frontend | 619KB single `index.html` (vanilla JS + dashboard.js + advisor.js) | Next.js 16 App Router, modular |
| Auth | Custom JWT + sha256 password (hardcoded fallback) | Supabase Auth (Google + email + Telegram) |
| DB | None (cookies for usage tracking) | Supabase Postgres + pgvector + RLS |
| AI proxy | `api/ai.js` direct fetch to anthropic.com | Vercel AI SDK v6 streaming |
| Universities | Hardcoded `QS_DATA` array | 1504 from real QS API + embeddings |
| i18n | None | RU/EN/UZ via `lib/i18n/` |
| Tools done | 8 (essay coach, analysis, humanizer, scholar AI, qs AI, tracker, ref letter, interview) | 8 wired up to streaming `/api/chat`; some need richer prompts (port from §5) |
| Deploy | Vercel manual | Vercel auto-deploy via GitHub `main` |

---

*Last updated: 2026-05-07 — generated from v1 logic extraction + current v2 state.*

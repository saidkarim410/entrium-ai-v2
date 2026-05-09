# ТЗ — Entrium AI v2 (Full-Stack)

> **Документ для full-stack разработчика, нанятого на доработку проекта.**
> Дата создания: 2026-05-09 · Версия 1.2 (после авто-прогонов wave 1 + 2)
> Прод: https://entrium-ai-v2.vercel.app
>
> **Wave 1 закрыт автоматически (commit `0110b8d`):**
> - Безопасность: S-2, S-3, S-4, S-5, S-6, S-8/F-6, S-9, S-10, S-12 ✅
> - UX: U-1, U-8 (примитив), U-12 ✅
> - Фичи: F-4 ✅
> - Качество: Q-1 (CI), частично S-1 (PAT убран из .git/config)
>
> **Wave 2 закрыт автоматически (commit `5b9393a`):**
> - UX: U-2 (settings sidebar nav), U-3 (applications bulk actions), U-5 (onboarding step indicator), U-7 (VoiceTextarea wrapper), U-8 применён к applications ✅
> - Фичи: F-3 (applications timeline) ✅
> - Качество: Q-2 partial (11 тестов на daysUntil/deadlineUrgency, fixed -0 regression)
>
> **Остаются на разработчика:** S-1 финал (отозвать токен в GitHub UI), S-7 (Telegram bot recreate), S-11, S-13 (2FA TOTP), S-14, U-4 (calendar views), U-6 (inline AI comments), U-9 (mobile audit), U-10 (light theme), U-11 (axe a11y), U-13 (forms unify), F-1, F-2, F-5, F-7…F-13, контент-долг, Q-2 expansion, Q-3, Q-4, Q-5.

---

## 0. Контекст продукта

**Entrium AI v2** — AI-платформа для подачи документов в зарубежные университеты. Целевая аудитория — абитуриенты из СНГ (RU/UZ/EN), школьники 11 класса и их родители.

**Что делает продукт:**
1. Хранит и показывает каталог 1500+ университетов и 289 стипендий
2. Помогает абитуриенту вести список заявок (applications), эссе и активностей в формате Common App
3. AI-инструменты: review эссе, подбор универов, финансовое моделирование, mock-интервью, генерация рекомендаций
4. Голосовой ввод (Whisper + Realtime API)
5. Telegram-бот для оповещений о дедлайнах
6. Дневной AI-фокус (cron) + еженедельный email-дайджест
7. Бесплатно 5 AI-запросов в день, Pro — без лимита (Stripe)

**Бизнес-цель ближайших 3 месяцев:** довести до стабильного state, готового продавать платным студиям-консультантам и B2C-абитуриентам.

---

## 1. Стек

| Слой | Технология | Версия |
|---|---|---|
| Frontend | Next.js (App Router, Turbopack) | 16.2.5 |
| React | React | 19.2.4 |
| Стили | Tailwind CSS | v4 |
| UI | shadcn/ui + `@base-ui/react` (НЕ Radix) | 1.4.1 |
| Иконки | lucide-react | 1.14 |
| Формы | react-hook-form + zod | 7.75 / 4.4 |
| AI | Vercel AI SDK + Anthropic + OpenAI | v6 |
| База | Supabase Postgres + pgvector + RLS | — |
| Auth | `@supabase/ssr` (chunked cookies) | 0.10 |
| Платежи | Stripe Checkout + Webhook | 22.1 |
| Email | Resend | 6.12 |
| Чат-бот | Telegram Bot API | — |
| Аналитика | PostHog | 1.37 |
| Ошибки | Sentry | 10.52 |
| Хост | Vercel (Fluid Compute) | — |

**Скрипты:**
```
npm run dev          # next dev
npm run build        # next build
npm run lint         # eslint
npm run test         # vitest run
```

---

## 2. Архитектура

### 2.1 Дерево репо

```
entrium-ai-v2/
├── src/
│   ├── app/
│   │   ├── (app)/                    # 17 страниц приложения
│   │   │   ├── activities/           # Common-App activity builder
│   │   │   ├── admin/                # админка (минимальная)
│   │   │   ├── agent/                # AI-агент freeform
│   │   │   ├── applications/        # CRUD заявок
│   │   │   ├── calendar/             # календарь дедлайнов
│   │   │   ├── dashboard/           # главная
│   │   │   ├── essays/[id]/         # редактор эссе + AI review
│   │   │   ├── history/             # история действий
│   │   │   ├── onboarding/          # 5-шаговый wizard
│   │   │   ├── pricing/             # Stripe upgrade
│   │   │   ├── profile/             # профиль абитуриента + print
│   │   │   ├── refer/               # реферальная программа
│   │   │   ├── scholarships/        # каталог + детали
│   │   │   ├── settings/            # настройки + интеграции
│   │   │   ├── shortlist/           # избранное
│   │   │   ├── tools/[tool]/        # 10 AI-инструментов
│   │   │   └── universities/        # каталог + сравнение
│   │   ├── api/                      # 23 API-неймспейса
│   │   ├── login/, signup/, p/[slug]/ # публичные
│   ├── components/                   # ~22 переиспользуемых
│   ├── lib/                          # 24 модуля доменной логики
│   └── middleware.ts (НЕТ — только supabase/middleware.ts)
├── supabase/migrations/              # 14 SQL-миграций (схема `entrium`)
├── tests/                            # 6 vitest файлов (мало!)
├── scripts/                          # backfill + maintenance
├── public/                           # статика
└── docs/TZ_FULLSTACK.md              # этот файл
```

### 2.2 Структура API (`src/app/api/`)

| Неймспейс | Назначение | Auth |
|---|---|---|
| `auth/callback` | OAuth/email-link redirect | session |
| `ai/*` | Все AI-инструменты (review, suggest, match, …) | session + checkUsage |
| `agent/*` | Freeform AI-чат | session + checkUsage |
| `chat/*` | Внутренний чат с AI | session + checkUsage |
| `applications/*` | CRUD заявок | session |
| `essays/*` | CRUD эссе + AI review | session + checkUsage |
| `activities/*` | Common-App activities | session |
| `scholarships/*` | Каталог стипендий | публ. чтение |
| `universities/*` | Каталог + сравнение | публ. чтение |
| `profile/*` | Профиль абитуриента | session |
| `cron/*` | 3 ежедневных/еженедельных задачи | `CRON_SECRET` |
| `email/*` | Resend webhook + unsubscribe | HMAC-token |
| `telegram/*` | Webhook от Telegram | `TELEGRAM_WEBHOOK_SECRET` |
| `stripe/*` | Checkout + webhook | session / Stripe sig |
| `voice/*` | Whisper transcribe | session |
| `realtime/*` | OpenAI Realtime API | session |
| `calendar.ics` | iCal subscription feed | HMAC-token |
| `daily-summary` | API для виджета | session |
| `search` | Векторный поиск | session |
| `setup`, `debug`, `health` | Утилиты | разное |
| `sentry` | Test endpoint для Sentry | dev-only |

### 2.3 База данных (Supabase Postgres, схема `entrium`)

**14 миграций**, ключевые таблицы:

| Таблица | Содержит | RLS |
|---|---|---|
| `profiles` | tier, pro_until, bonus_credits, full_name | ✅ owner |
| `applicant_profile` | personal/academic/goals JSON | ✅ owner |
| `applications` | заявки на универы | ✅ owner |
| `essays` | тексты эссе + AI review JSON | ✅ owner |
| `activities` | Common-App activities | ✅ owner |
| `universities` | каталог 1500+ универов | ✅ public read |
| `scholarships` | каталог 289 стипендий | ✅ public read |
| `usage_events` | трекер AI-вызовов для лимита | ✅ owner |
| `notifications` | inbox уведомлений | ✅ owner |
| `favorites` | избранное (унив/стип) | ✅ owner |
| `email_prefs`, `notification_prefs` | настройки | ✅ owner |
| `telegram_links` | связь user ↔ chat_id | ✅ owner |
| `profile_snapshots` | growth tracker | ✅ owner |
| `share_pages` | публичные `/p/[slug]` | ✅ public read |
| `referrals` | партнёрки | ✅ owner |

26 RLS-политик, 35 упоминаний RLS в миграциях. **Уровень покрытия RLS — приличный**, но требуется ревью при добавлении новых таблиц.

### 2.4 Cron-задачи (Vercel)

```json
[
  { "path": "/api/cron/check-deadlines", "schedule": "0 9 * * *" },
  { "path": "/api/cron/daily-summary",   "schedule": "0 6 * * *" },
  { "path": "/api/cron/weekly-digest",   "schedule": "0 18 * * 0" }
]
```

Все три проверяют `Authorization: Bearer ${CRON_SECRET}` (Vercel автоматически шлёт его в этом виде).

---

## 3. Состояние проекта

### 3.1 Что уже сделано (✅ работает на проде)

**Tier 1 — фундамент**
- ✅ Auth (Supabase email + magic link)
- ✅ Onboarding wizard (5 шагов с автосохранением)
- ✅ Дашборд + применения + универы + стипендии (CRUD)
- ✅ Profile builder с полями Common App
- ✅ Daily AI summary widget (cron)
- ✅ Notification preferences
- ✅ Favorites/shortlist
- ✅ Free 5/day + Pro tier (Stripe Checkout + Webhook)

**Tier 2 — глубина**
- ✅ Эссе-редактор + AI review (4-state UI: loading/error/review/empty)
- ✅ Voice-to-text (Whisper) на эссе и заявках
- ✅ Activity builder (Common App, до 10 пунктов)
- ✅ Profile growth snapshots
- ✅ Portfolio analytics

**Tier 3 — операционка**
- ✅ Sentry (с тоннелем `/monitoring` чтобы AdBlock не глушил)
- ✅ Bundle slim (`optimizePackageImports`)
- ✅ Базовый a11y pass
- ✅ Email infra (Resend) + preview mode
- ✅ Telegram бот (outbound работает; inbound заблокирован Bot API — см. §4.4)

**Tier 4 — продукт**
- ✅ Scholarship detail + AI match
- ✅ Application ↔ Essay auto-link
- ✅ Voice everywhere
- ✅ Cmd+/ shortcuts overlay
- ✅ AI-state primitives (`AiLoadingSkeleton`, `AiErrorCard`, `AiEmptyCta`) применены в 5 клиентах

**Контент**
- ✅ 1497/1504 (99.5 %) универов с городами
- ✅ 93/289 (32 %) стипендий с дедлайнами

### 3.2 Покрытие тестами (🔴 критично мало)

```
tests/
  applicant.test.ts
  applications.test.ts
  email.test.ts
  language.test.ts
  notifications.test.ts
  prefill.test.ts
```

**6 unit-файлов** на ~17 страниц + 23 API-неймспейса. **E2E-тестов нет** (Playwright/Cypress отсутствуют). Это — основной долг по качеству.

---

## 4. Уязвимости и проблемы безопасности

### 4.1 🔴 Критично

| # | Что | Где | Риск | Что делать |
|---|---|---|---|---|
| **S-1** | **GitHub PAT в `.git/config`** в открытом виде | локальный репо разработчика | Токен в дампе диска / случайном `cat .git/config` → push от имени владельца | `git remote set-url origin https://github.com/saidkarim410/entrium-ai-v2.git`, авторизоваться через `gh auth login` или Git Credential Manager. Токен в GitHub отозвать и пересоздать. |
| **S-2** | **`EMAIL_TOKEN_SECRET` фолбэчит на `SUPABASE_SERVICE_ROLE_KEY`** | `src/lib/env.ts:54` | Если HMAC-секрет токенов unsubscribe = service-role-ключу, утечка одного компрометирует другой. Service-role обходит RLS. | Сделать `EMAIL_TOKEN_SECRET` обязательным в проде; убрать фолбэк или фолбэчить только в dev. Сгенерировать отдельный секрет (`openssl rand -base64 64`). |
| **S-3** | **Service-role admin-клиент** используется в 3+ местах (`calendar.ics`, `daily-summary`, `search`) | `src/lib/supabase/admin.ts` | RLS обходится. Если в любом из этих эндпоинтов есть IDOR (передача `userId` параметром), атакующий читает чужие данные. | Аудит каждого вызова `supabaseAdmin`: ВСЕГДА выводить `userId` из верифицированного источника (HMAC-токен или `getCurrentProfile()`), НИКОГДА из query/body. Покрыть unit-тестами. |
| **S-4** | **Race condition в `consumeBonus`** | `src/lib/rate-limit.ts:71-82` | Read-then-write без транзакции. Два одновременных AI-вызова списывают один бонус. | Заменить на атомарный SQL: `update profiles set bonus_credits = bonus_credits - 1 where id = $1 and bonus_credits > 0 returning bonus_credits`. |
| **S-5** | **Race в `checkUsage`** | `src/lib/rate-limit.ts:14-51` | Между `count` и `recordUsage` пользователь может выстрелить N запросов и потратить >5 в день. | Атомарность через unique-индекс `(user_id, date_trunc('day', created_at))` с pre-insert или Postgres advisory-lock. Альтернатива — Redis с `INCR`. |
| **S-6** | **Нет Content-Security-Policy** | `next.config.ts:5-11` | XSS-payload (например, через `react-markdown` в публичных `/p/[slug]`) выполнится. Текущий `react-markdown` хорошо санитизирует, но CSP — defence-in-depth. | Добавить CSP: `default-src 'self'; script-src 'self' 'unsafe-inline' https://*.vercel.app https://*.posthog.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://api.openai.com https://api.anthropic.com https://*.posthog.com https://*.sentry.io;`. Тестировать на staging. |

### 4.2 🟡 Важно

| # | Что | Что делать |
|---|---|---|
| **S-7** | Telegram Bot API `setWebhook` молча отклоняет URL — webhook не работает. Outbound `sendMessage` работает (cron-уведомления уходят). | Создать новый бот через @BotFather, получить новый токен, заменить `TELEGRAM_BOT_TOKEN`. Если повторится — открыть тикет с Telegram BotSupport. Документировано в `/api/telegram/diagnose`. |
| **S-8** | Нет верхнеуровневого Next.js `middleware.ts` — авторизация дублируется в каждом layout/route. | Создать `src/middleware.ts` с логикой: проверка cookie → если на защищённом роуте без сессии → redirect `/login?next=…`. Удалить дублирующиеся проверки. |
| **S-9** | Stripe checkout не идемпотентен — двойной клик создаёт две сессии. | Добавить `idempotency_key` в `stripe.checkout.sessions.create` (UUID на сторону клиента). |
| **S-10** | В `/p/[slug]` (публичные share-страницы) HTML инжектится через `react-markdown` без явного allow-list схем. | Добавить `rehype-sanitize` или `react-markdown`'s `urlTransform` чтобы блокировать `javascript:` ссылки. |
| **S-11** | `bodySizeLimit: "2mb"` для server actions — может быть мал для voice-аплоада. | Воспроизвести с длинной записью; либо повысить, либо использовать direct-upload в Supabase Storage. |
| **S-12** | Нет Permissions-Policy для `interest-cohort=()` (FLoC), `payment=(self "https://js.stripe.com")`. | Расширить `securityHeaders` в `next.config.ts`. |
| **S-13** | Нет 2FA / TOTP для аккаунтов. | Включить через Supabase Auth → MFA TOTP (есть из коробки), добавить UI в `/settings`. |
| **S-14** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` зашит в env (это норма), но публичный `/api/health` отдаёт его косвенно через ошибки. | Логировать ошибки в Sentry, клиенту возвращать `{error: "internal"}` без деталей. |

### 4.3 🟢 Долг качества

| # | Что | Что делать |
|---|---|---|
| **Q-1** | Нет E2E-тестов | Добавить Playwright. Минимум: signup → onboarding → создать application → AI review эссе → upgrade Pro (тест-режим). |
| **Q-2** | 6 unit-файлов на 23 API + 17 страниц | Покрыть `rate-limit`, `email-token`, `applicant-profile`, `applications-CRUD`, `stripe-webhook`. Цель — 60 % statement coverage за 2 спринта. |
| **Q-3** | Нет Storybook для компонентов | Установить Storybook 8, задокументировать `ai-state.tsx`, `voice-input-button`, `markdown`, формы onboarding. |
| **Q-4** | `bonus_credits` хранится в `profiles` — миксует биллинг и профиль | Вынести в `entrium.user_credits` с историей транзакций. |
| **Q-5** | Sentry source-maps выключены (`sourcemaps: { disable: true }`) — стек-трейсы малоинформативны | Включить только для production, оставить отключённым для dev. Использовать `auth_token` Sentry в Vercel env. |

---

## 5. UI/UX — проблемы и план

### 5.1 Критичные UX-проблемы

| # | Где | Проблема | Решение |
|---|---|---|---|
| **U-1** | **Везде** | Нет undo на destructive actions (delete application/essay/activity) | Использовать `sonner` toast с кнопкой Undo (5 сек). Soft-delete: ставить `deleted_at`, чистить cron-ом через 7 дней. |
| **U-2** | **Settings** | 6 несвязанных карточек подряд — нет иерархии | Сделать левый сайдбар с вкладками: Account / Notifications / Integrations / Billing / Privacy / Danger zone. Использовать паттерн GitHub Settings. |
| **U-3** | **Applications list** | Нет bulk actions (отметить статус, удалить, экспорт) | Добавить чекбоксы + sticky toolbar при выделении (status, priority, delete, export to CSV). |
| **U-4** | **Calendar** | Один view (список) | Добавить Month/Week/List переключатель. Использовать `@base-ui/react` или мигрировать на `react-big-calendar` / FullCalendar. |
| **U-5** | **Onboarding** | Если пользователь закроет вкладку на шаге 3, при возврате не очевидно где он | Показывать прогресс «Step 3 of 5» вверху + список шагов с галочками сбоку. |
| **U-6** | **Эссе-редактор** | AI review показывается как блок текста — нет связки текст ↔ комментарий | Inline-комментарии на полях (как Google Docs). Hover на цитату → подсветка в эссе. |
| **U-7** | **Голосовой ввод** | Кнопка появляется в разных местах с разной иконкой — нет консистентности | Унифицировать `VoiceInputButton`: всегда справа от текстарии, размер 32px, иконка `Mic`/`MicOff`/`Loader`. |
| **U-8** | **Empty states** | На разных страницах разный тон (то иконка + текст, то просто текст) | Создать `<EmptyState icon title description action />` → применить везде. |
| **U-9** | **Mobile** | После последней правки часть страниц чинена, но не все. CMD+K не открывается на тач-устройствах. | Mobile audit: ресайз DevTools 375px на каждой странице. На мобильном hide Cmd+K, показать `<MobileSearchTrigger />` (он уже есть, но не на всех страницах). |
| **U-10** | **Темы** | Только тёмная тема. `next-themes` установлен но не использован. | Добавить toggle в header: System / Light / Dark. Дизайн светлой темы — отдельная задача (см. §5.3). |
| **U-11** | **Accessibility** | Контрасты `text-cream-3` на тёмном фоне — на грани 4.5:1, особенно на цветных фонах | Прогнать axe-core / Lighthouse a11y. Цель 95+. Все интерактивные элементы — focus-visible ring. |
| **U-12** | **Loading skeletons** | Применены только в AI-блоках. Списки приложений / стипендий показывают spinner | Заменить spinner на skeleton-rows везде, где есть таблица или сетка карточек. |
| **U-13** | **Forms** | Onboarding и tools-формы валидируются по-разному (где-то Zod, где-то ручной) | Унифицировать через `react-hook-form` + zod-resolver. Шаблон в `src/components/ui/form.tsx`. |

### 5.2 Дизайн-система — что не докручено

- **Шрифты:** `font-display`, `font-serif`, `font-mono-label` — 3 семейства, но не задокументированы. Создать `docs/design-tokens.md` с примерами.
- **Палитра `cream`/`gold`** — фирменная, но переменные разбросаны по Tailwind config + inline. Свести в `tailwind.config.ts` под `theme.colors.brand.*`.
- **Spacing scale** — частично 4-кратный, частично произвольный. Привести к 4/8/12/16/24/32/48.
- **Кнопки** — есть `<Button variant="ghost|outline|default">`, но размеры варьируются (h-8/h-9/h-10). Зафиксировать.

### 5.3 Светлая тема (если делать)

- Перевести все `text-cream-*`, `bg-card`, `border-border` на CSS-переменные `var(--text-primary)` / `var(--bg-card)`.
- В `globals.css` определить `:root` (light) и `.dark` (текущая тёмная).
- **Объём работы: ~2-3 дня дизайнер + 5-7 дней фронтендер.**

### 5.4 Print-views

- Сейчас есть только `/profile/print` (для экспорта в PDF).
- **Добавить:** `/applications/print` (список заявок с дедлайнами для родителей) и `/essays/[id]/print` (эссе + AI-review для распечатки).

---

## 6. Что нужно ещё внедрить (фичи)

### 6.1 Приоритет 1 (must-have для запуска платных)

| ID | Фича | Объём |
|---|---|---|
| **F-1** | **Document upload** (PDF транскрипты, рекомендательные письма, аплоад в Supabase Storage) с типами файлов и сроком жизни | 5-7 дней |
| **F-2** | **Recommender flow** — пригласить рекомендателя по email, он загружает PDF на /r/[token] без логина | 5-7 дней |
| **F-3** | **Application timeline** — визуальный таймлайн всех дедлайнов на год (Gantt-like) | 3 дня |
| **F-4** | **Smart deadlines** — авто-подсветка «осталось 7 дней» с цветовой шкалой (green→yellow→red) | 1 день |
| **F-5** | **Two-factor auth** (TOTP через Supabase MFA) | 1-2 дня |
| **F-6** | **Top-level middleware** — auth-guard для всех `/dashboard/*` роутов | 1 день |

### 6.2 Приоритет 2 (через месяц после запуска)

| ID | Фича | Объём |
|---|---|---|
| **F-7** | **Counsellor mode** — view-only доступ к профилю студента для куратора (по invite-link) | 5-7 дней |
| **F-8** | **AI essay versioning** — diff между ревизиями эссе, AI-комментарии к diff'у | 5 дней |
| **F-9** | **Mock interview** (`/tools/interview`) — голосовой режим с Realtime API уже есть, но нужен скоринг + транскрипт + метрики | 5 дней |
| **F-10** | **Bulk import** — CSV/Excel загрузка списка университетов (кейс: студия с 30 студентами) | 3 дня |
| **F-11** | **Notifications inbox v2** — read/unread, фильтры, быстрые действия | 3 дня |
| **F-12** | **Public share-pages v2** — кастом-домен, OG-image, password-protect | 3 дня |
| **F-13** | **Affiliate dashboard** — для рефереров: трекинг сколько привели, сколько заработали | 5 дней |

### 6.3 Приоритет 3 (когда придёт product-market fit)

- **Mobile app (Expo)** — переиспользовать API
- **AI «council»** — несколько LLM сравнивают рекомендации
- **Scholarship matching → autoapply** (заполнение базовой формы)
- **Marketplace репетиторов**
- **Webhook-API для партнёрских интеграций**

### 6.4 Контент-долг

| Что | Сейчас | Цель |
|---|---|---|
| Universities total | 1504 | 2500+ (добить топ-5 стран: US, UK, EU, CA, AU) |
| Universities с city | 1497 | 1500+ |
| Universities с QS rank | ? (проверить) | 80 % топ-1000 |
| Scholarships total | 289 | 500+ (добавить локальные UZ, KZ, RU) |
| Scholarships с deadline | 93 (32 %) | 80 % |
| Scholarships с amount | ? | 90 % |

**Скрипт `scripts/backfill-scholarship-deadlines.mjs`** — шаблон для пакетной заливки. Расширить второй и третий батч.

---

## 7. DevOps / окружения

### 7.1 Текущее окружение

- **Production:** Vercel (`entrium-ai-v2.vercel.app`), auto-deploy on push to `main`
- **Preview:** автоматически на каждый PR (Vercel default)
- **Local dev:** `npm run dev` + локальный `.env.local`

### 7.2 Что доделать

- **Staging env:** отдельный Vercel-проект (`entrium-ai-v2-staging`) на ветку `develop`. Отдельный Supabase-проект.
- **CI:** добавить GitHub Action: `lint + tsc + test + build` на каждый PR. Блокировать merge если красный.
- **Pre-commit hook:** Husky + lint-staged. Уже не настроен.
- **Secrets rotation:** план на 90 дней — менять `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_*`, `EMAIL_TOKEN_SECRET`.
- **Backups:** Supabase daily backup включить в Pro плане.
- **Monitoring:** Sentry уже есть. Добавить uptime-monitor (BetterUptime / Vercel Monitoring).

### 7.3 ENV переменные (полный список)

**Required:**
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
OPENAI_API_KEY
NEXT_PUBLIC_SITE_URL
EMAIL_TOKEN_SECRET            # 64-байтный рандом
CRON_SECRET                    # для Vercel Cron
```

**Optional:**
```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_ID_PRO_MONTHLY
STRIPE_PRICE_ID_PRO_YEARLY
TELEGRAM_BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET
RESEND_API_KEY
RESEND_FROM
SENTRY_AUTH_TOKEN              # для source-maps
NEXT_PUBLIC_POSTHOG_KEY
```

---

## 8. Дорожная карта (предложение)

### Спринт 1 (1 неделя) — Безопасность
- S-1: GitHub PAT rotation
- S-2: EMAIL_TOKEN_SECRET fix
- S-3: audit admin client usage
- S-4, S-5: атомарный rate-limit
- S-6: CSP header
- F-6: top-level middleware

**Готовность к выходу:** 100 % S-1…S-6 закрыто, прод не сломан.

### Спринт 2 (1 неделя) — Качество + UI/UX база
- Q-1: Playwright E2E (3 happy-path)
- Q-2: unit-coverage до 50 %
- U-1: undo paterns
- U-2: settings sidebar
- U-7: voice-input унификация
- U-8: EmptyState компонент
- U-12: skeleton-loaders везде

### Спринт 3 (1 неделя) — Фичи P1
- F-1: document upload
- F-2: recommender flow
- F-3: timeline view
- F-4: smart deadlines
- F-5: 2FA

### Спринт 4 (1 неделя) — UI polish + контент
- U-4: calendar views
- U-6: inline AI-comments в эссе
- U-10: light theme (если нужна)
- Контент: scholarships до 80 % с deadline, +500 универов

### Спринт 5+ (по фичам P2)

---

## 9. Acceptance criteria (как принять работу)

Перед каждым merge в `main` PR должен:

- [ ] `npm run lint` — 0 ошибок, 0 warning
- [ ] `npm run test` — все тесты зелёные
- [ ] `npm run build` — успешен
- [ ] `npx tsc --noEmit` — 0 ошибок
- [ ] Покрытие добавленного кода ≥ 60 %
- [ ] Lighthouse Performance ≥ 80, Accessibility ≥ 95 на затронутых страницах
- [ ] Mobile: тестировано на 375px, 768px, 1024px viewport
- [ ] Если есть DB-миграция: backward-compatible (старый код работает с новой схемой)
- [ ] Если новый ENV: задокументирован в `.env.example` и в этом ТЗ
- [ ] Sentry breadcrumbs — никаких PII в сообщениях
- [ ] Toast/error UX консистентен с `ai-state.tsx` примитивами
- [ ] PR-описание: что/зачем/как тестировать

---

## 10. Брифинг для разработчика (1 страница)

**Стек, который ты должен знать:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4, Supabase (Postgres + RLS), Vercel AI SDK v6.

**Куда смотреть в первую очередь:**
1. `src/lib/supabase/server.ts` — `getCurrentProfile()` это твой auth
2. `src/lib/rate-limit.ts` — лимиты AI-вызовов
3. `src/components/ai-state.tsx` — правильные паттерны loading/error/empty
4. `src/lib/applications/types.ts` — domain types
5. `supabase/migrations/` — схема БД, новые таблицы добавляешь туда

**Чего НЕ делаешь без спроса:**
- Не меняешь `next.config.ts` security headers
- Не используешь `supabaseAdmin` без явного userId из верифицированного источника
- Не амендишь чужие коммиты, не push --force в `main`
- Не выключаешь pre-commit hook
- Не удаляешь миграции, только добавляешь новые

**Чего ОЖИДАЕМ:**
- Каждая фича — отдельный PR, не более ~600 LOC
- Тесты вместе с кодом, не «потом»
- Если что-то не понятно — спросить, не угадывать
- Обновлять этот файл (`docs/TZ_FULLSTACK.md`) при закрытии задач

**Контакты владельца проекта:**
- Telegram: @Tursunbaev01
- GitHub: saidkarim410
- Vercel team: saidkarim410s-projects

---

## 11. Приложения

### A. Полный список AI-инструментов (`src/app/(app)/tools/`)

1. `analyzer` — анализ профиля
2. `cost` — финансовое моделирование
3. `cv` — генерация CV
4. `essay` — генератор эссе по топику
5. `interview` — mock-интервью (voice)
6. `profile` — оптимизация профиля
7. `recommendation` — генератор LOR драфта
8. `reviewer` — review эссе (то же что в editor)
9. `scholarship` — поиск стипендий
10. `tracker` — generic AI-помощник
11. `university` — подбор универов

Каждый — отдельный route с одинаковым паттерном: `useChat` или `useObject` хук + `<AiLoadingSkeleton>` пока пусто.

### B. Известные tech-debts (мини-список)

- Bonus credits хранятся в `profiles` (Q-4)
- `daily-summary` использует admin-client из-за исторических причин
- В `share-card.tsx` нет lazy-загрузки скриншотов
- Cmd+K-палитра не работает на iOS (метаклавиша)
- `applicant-profile` хранит JSON блобы вместо нормализованных таблиц
- `essay.ai_review` — JSON, не индексируется по полям

### C. Команды для быстрого старта разработчика

```bash
git clone https://github.com/saidkarim410/entrium-ai-v2.git
cd entrium-ai-v2
npm install
cp .env.example .env.local            # запросить env у владельца
npm run dev                           # http://localhost:3000

npm run lint                          # перед каждым commit
npm run test                          # перед каждым PR
npm run build                         # sanity-check production build
```

---

**Конец документа. Версия 1.0. Поддерживается в `docs/TZ_FULLSTACK.md`.**

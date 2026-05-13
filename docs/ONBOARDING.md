# Entrium AI — Developer Onboarding

> Прочитай этот документ за 15 минут — поймёшь куда ты попал, что мы строим, и где копать дальше.

---

## Слайд 1 — Что это вообще

**Entrium AI** — это AI-помощник для подачи документов в зарубежные университеты. Делается для школьников и выпускников из Узбекистана, Казахстана, России, которые хотят поступать в MIT, Stanford, Oxford, ETH, NUS и подобные.

**Боль, которую решаем:** обычный консультант по поступлению в Узбекистане берёт $3000–10000 за пакет «помощь с поступлением» — это эссе, подбор универов, рекомендательные письма, mock-интервью. Мы упаковываем то же самое в AI-инструменты + плагины + платформу за $9.99/месяц.

**Целевой рынок:**
- B2C — абитуриенты напрямую (платят $9.99/мес за Pro)
- B2B — образовательные студии-консультанты (5–30 студентов на одного куратора)

**Стадия проекта:** MVP в продакшене, ~88% базового ТЗ закрыто, готов к первым платным студиям. Контента 1504 университета и 289 стипендий уже в базе.

**Прод:** https://entrium-ai-v2.vercel.app

---

## Слайд 2 — Что делает продукт (3 минуты)

Студент логинится через Google → попадает на dashboard, где видит:

1. **AI-фокус дня** — каждое утро cron генерирует «что тебе делать сегодня» на основе твоих заявок, дедлайнов и слабых мест профиля
2. **11 AI-инструментов** — каждый узко-специализированный:
   - Profile Analyzer (диагностика шансов)
   - Tracker (12-месячный roadmap)
   - University Picker (подбор по профилю)
   - Scholarship Matcher
   - Essay Coach (Ivy-уровень review)
   - Essay Humanizer (убирает AI-клише)
   - Interview Trainer (голосовой mock-интервью через Whisper + Realtime API)
   - LOR Generator (драфт рекомендательного письма)
   - CV Builder
   - Cost Calculator
   - Reviewer
3. **AI Agent** — автономный pipeline, запускает несколько инструментов подряд (например «План на год» = tracker + analyzer + university + scholarship за один клик)
4. **Заявки** (`/applications`) — список где подаюсь, дедлайны, статусы, чек-листы. Импорт из CSV, bulk-add через AI, gantt-таймлайн, цвет-кодированные дедлайны.
5. **Эссе-редактор** — пишешь эссе → AI-review в боковой панели → версионируется
6. **Calendar** — Month/Week/List, экспорт в iCal (можно подписаться в Google Calendar)
7. **Recommenders** — приглашаешь учителя по email → он грузит PDF без регистрации по одноразовой ссылке `/r/[token]`
8. **Documents** — хранилище транскриптов и сертификатов в приватном Supabase Storage bucket
9. **Notifications inbox** — фильтры по типу, mark-all-read, deep-link на каждое событие
10. **Telegram-бот** — дублирует важные уведомления (дедлайн через 7 дней и т.п.)

**Free tier:** 5 AI-запросов в день. **Pro ($9.99/мес):** unlimited.

---

## Слайд 3 — Стек

| Слой | Технология |
|---|---|
| **Frontend** | Next.js 16 App Router (Turbopack), React 19, TypeScript strict |
| **Стили** | Tailwind v4, shadcn/ui (на `@base-ui/react`, **НЕ Radix**) |
| **Иконки/Формы** | lucide-react, react-hook-form + zod |
| **AI** | Vercel AI SDK v6 — `streamText`, `generateObject`, `useChat` |
| **LLM-провайдеры** | Anthropic Claude Sonnet 4.5 (Pro), Haiku 4.5 (Free) + OpenAI Whisper/Realtime |
| **БД** | Supabase Postgres + pgvector (для RAG-поиска универов/стипендий по embedding'ам) |
| **Auth** | `@supabase/ssr` (chunked cookies), Google OAuth |
| **Storage** | Supabase Storage (приватный bucket `documents`, 20 МБ cap) |
| **Платежи** | Stripe Checkout + Webhook (Pro tier) |
| **Email** | Resend |
| **Telegram** | Bot API (custom webhook) |
| **Аналитика/ошибки** | PostHog, Sentry (with source-maps) |
| **Хост** | Vercel (Fluid Compute, default region iad1) |
| **Cron** | Vercel Cron — 3 задачи (daily summary, weekly digest, deadline check) |

**Тесты:**
- 89 unit-тестов (vitest, mock supabase client)
- 10 Playwright smoke-тестов против live prod
- 12 RPC smoke-проверок против реальной Supabase (script `npm run test:rpc-smoke`)

---

## Слайд 4 — Архитектура одной картинкой

```
┌─────────────────────────────────────────────────────────────────┐
│  Браузер пользователя (Next.js клиент)                          │
│  - React Server Components + Client Components                  │
│  - Server Actions для мутаций                                   │
│  - useChat hook для AI-стриминга                                │
└─────────────────────────────────────────────────────────────────┘
              │                          │
              ▼                          ▼
┌─────────────────────────┐   ┌──────────────────────────────────┐
│  src/proxy.ts            │   │  src/app/api/*                  │
│  (middleware)            │   │  (API routes)                   │
│  - auth-guard            │   │  - /api/agent (multi-step AI)   │
│  - session refresh       │   │  - /api/ai (single tool)        │
│  - skip routes с HMAC    │   │  - /api/voice/transcribe        │
└─────────────────────────┘   │  - /api/cron/*  (Vercel cron)   │
                              │  - /api/stripe/webhook          │
                              │  - /api/telegram/webhook        │
                              └──────────────────────────────────┘
                                          │
                                          ▼
              ┌──────────────────────────────────────────┐
              │  src/lib/* — domain logic               │
              │  - applicant/, applications/, essays/    │
              │  - documents/, recommenders/             │
              │  - rate-limit, api-error                 │
              └──────────────────────────────────────────┘
                                          │
                  ┌───────────────────────┼───────────────────────┐
                  ▼                       ▼                       ▼
        ┌────────────────┐      ┌────────────────┐      ┌────────────────┐
        │ Supabase       │      │ Anthropic +    │      │ Resend /       │
        │ Postgres + RLS │      │ OpenAI         │      │ Telegram /     │
        │ + Storage      │      │ via Vercel AI  │      │ Stripe         │
        │ + pgvector RAG │      │ SDK            │      │                │
        └────────────────┘      └────────────────┘      └────────────────┘
```

**Ключевые архитектурные решения:**

1. **`supabaseAdmin`** (service-role) используется ТОЛЬКО на сервере, всегда после `getCurrentUser()` верификации. Никогда не пускается на клиент.
2. **Rate-limit атомарный** через SQL функцию `entrium.try_consume_quota` — она лочит row пользователя и считает usage_events в одной транзакции. (Раньше был race-condition + double-counting — см. миграции 0015→0017 в `supabase/migrations/`.)
3. **Direct-to-storage upload** для документов — server даёт signed PUT URL, browser PUTит файл напрямую, обходит 2MB лимит на server actions.
4. **Recommender flow без auth** — токен в URL = credential. `/r/[token]` рендерит форму загрузки PDF, ничего больше не требуя.
5. **`withApiError()` wrapper** в `lib/api-error.ts` — оборачивает route handlers, маскирует stack traces в prod, отправляет в Sentry.

---

## Слайд 5 — Дерево репо

```
entrium-ai-v2/
├── src/
│   ├── app/
│   │   ├── (app)/           # Залогиненные страницы (17)
│   │   │   ├── dashboard/
│   │   │   ├── applications/
│   │   │   │   ├── applications-client.tsx
│   │   │   │   ├── timeline/        # Gantt-таймлайн
│   │   │   │   ├── csv-import-dialog.tsx
│   │   │   │   └── bulk-add-dialog.tsx
│   │   │   ├── essays/[id]/         # Редактор + AI review
│   │   │   ├── calendar/            # Month/Week/List + iCal
│   │   │   ├── agent/               # Многошаговый AI pipeline
│   │   │   ├── tools/[tool]/        # 11 AI-инструментов
│   │   │   ├── settings/
│   │   │   ├── notifications/       # Inbox v2 с фильтрами
│   │   │   ├── onboarding/          # 5-шаговый wizard
│   │   │   ├── profile/{print,history}
│   │   │   ├── scholarships/, universities/, refer/, shortlist/
│   │   │   └── layout.tsx           # Sidebar + auth-guard
│   │   ├── (auth)/login,signup/     # Публичные auth-страницы
│   │   ├── r/[token]/               # Публичный recommender flow
│   │   ├── p/[slug]/                # Public share-страницы
│   │   ├── api/                     # 23 API-неймспейса
│   │   └── page.tsx                 # Лендинг
│   ├── components/
│   │   ├── ui/                      # shadcn/ui компоненты
│   │   ├── ai-state.tsx             # LoadingSkeleton + ErrorCard + EmptyCta
│   │   ├── deadline-chip.tsx        # 7-цветная шкала urgency
│   │   ├── empty-state.tsx
│   │   ├── voice-input-button.tsx   # Whisper mic
│   │   ├── voice-textarea.tsx       # Унифицированный textarea + mic
│   │   ├── section-nav.tsx          # Scroll-spy navigation
│   │   ├── documents-manager.tsx    # F-1: storage UI
│   │   ├── recommenders-manager.tsx # F-2: invite UI
│   │   ├── theme-provider.tsx       # next-themes wrapper
│   │   └── theme-toggle.tsx         # System/Light/Dark pill
│   ├── lib/
│   │   ├── ai/                      # Промпты, knowledge базы, RAG
│   │   ├── applicant/               # Профиль абитуриента (JSON в profiles.applicant_data)
│   │   ├── applications/            # Заявки, типы, deadlineUrgency()
│   │   ├── essays/, activities/, scholarships/, universities/
│   │   ├── documents/               # F-1 storage actions
│   │   ├── recommenders/            # F-2 invite actions
│   │   ├── notifications/, email/, telegram*, stripe.ts
│   │   ├── i18n/                    # RU/EN/UZ
│   │   ├── rate-limit.ts            # checkUsage / recordUsage / consumeBonus
│   │   ├── api-error.ts             # withApiError + ApiError
│   │   ├── supabase/{server,admin,middleware}.ts
│   │   └── env.ts                   # Type-safe env access
│   └── proxy.ts                     # Next 16 middleware (auth guard)
├── supabase/migrations/             # 18 SQL миграций
├── e2e/smoke.spec.ts                # Playwright
├── tests/*.test.ts                  # 11 vitest файлов
├── scripts/
│   ├── smoke-rpc.mjs                # RPC smoke против live DB
│   ├── backfill-scholarship-deadlines.mjs
│   └── md2docx.py                   # Custom MD→DOCX converter
├── docs/
│   ├── TZ_FULLSTACK.md              # Полное ТЗ
│   ├── TEST_REPORT.md               # Отчёт о тестировании
│   ├── RESEND_SETUP.md              # Гайд верификации домена
│   └── ONBOARDING.md                # Этот файл
└── vercel.json                      # Cron-задачи
```

---

## Слайд 6 — Данные

**Схема БД — отдельная schema `entrium` (не `public`):**

| Таблица | Что хранит | Размер |
|---|---|---|
| `profiles` | tier, pro_until, bonus_credits, full_name, applicant_data (JSON) | 5 строк |
| `applicant_profile` | (legacy, в новой схеме данные в `profiles.applicant_data`) | — |
| `applications` | Заявки на универы — round, deadline, status, priority, checklist | — |
| `essays` | Эссе + AI review JSON | — |
| `activities` | Common-App активности | — |
| `universities` | Каталог универов с QS rank, country, city + embeddings | **1504** |
| `scholarships` | Каталог стипендий с deadline + embeddings | **289** (136 с дедлайном) |
| `usage_events` | Трекер AI-вызовов для rate-limit | растёт |
| `notifications` | Inbox уведомлений | — |
| `favorites` | Избранное (универ/стипендия) | — |
| `email_prefs`, `notification_prefs` | Настройки в profiles JSON | — |
| `telegram_links` | user_id ↔ chat_id | — |
| `profile_snapshots` | Growth tracker — снэпшоты для diff'а | — |
| `share_pages` | Публичные `/p/[slug]` | — |
| `documents` | Индекс над storage.objects | NEW |
| `recommender_invites` | Токены для unauthenticated PDF upload | NEW |

**RLS включён на всех 14 таблицах** (owner-only кроме publish-каталогов универы/стипендии).

**Storage:**
- Bucket `documents` — приватный, 20 МБ cap, типы: pdf/png/jpeg/webp
- Layout: `documents/<user_id>/<uuid>-<filename>`
- Recommender PDF: `documents/<student_id>/recommendations/<invite_id>-<filename>`

**Cron-задачи (Vercel):**
```json
{
  "/api/cron/check-deadlines": "0 9 * * *",
  "/api/cron/daily-summary":   "0 6 * * *",
  "/api/cron/weekly-digest":   "0 18 * * 0"
}
```

Все три аутентифицированы через `CRON_SECRET` (Vercel автоматически шлёт `Authorization: Bearer ${CRON_SECRET}`).

---

## Слайд 7 — Главные потоки (3 user journeys)

### Журней 1 — Новый студент (от логина до первой AI-рекомендации)

```
1. /login → Google OAuth
2. (auth callback) → /onboarding
3. 5 шагов wizard'а: Знакомство → Академика → Цели → Опыт → Готово
   ⤷ Каждый шаг debounce-сейвится в profiles.applicant_data
4. → /dashboard
   ⤷ Daily summary widget вызывает /api/daily-summary
   ⤷ generateObject() с Claude Sonnet → JSON {greeting, focus, todos, motivation}
5. Юзер жмёт «Запустить Agent» → /agent
   ⤷ Многошаговый pipeline (например «План на год»: tracker → analyzer)
   ⤷ Стриминг ответа по NDJSON, рендер с структурированными views
```

### Журней 2 — AI Review эссе

```
1. /essays/[id] — split-pane: текст слева, AI review справа
2. Юзер пишет эссе → autosave debounce → server action
3. Юзер жмёт «Run AI Review»
   ⤷ /api/essays/[id]/review
   ⤷ checkUsage(user.id) — try_consume_quota RPC
   ⤷ generateObject() с zod-схемой → структурированный review
   ⤷ Сохраняется в essays.ai_review JSON
4. Side-panel показывает review с inline-цитатами
   ⤷ AiLoadingSkeleton пока генерируется
   ⤷ AiErrorCard если упало (с retry-кнопкой)
```

### Журней 3 — Recommender flow (F-2)

```
Студент:
1. /settings → «Рекомендатели» → «Пригласить»
2. Имя + email учителя + опц. сообщение
3. createRecommenderInvite() → INSERT в recommender_invites
   ⤷ Resend отправляет email со ссылкой /r/<token>
   ⤷ Если Resend в restricted-mode → возвращаем ссылку для копирования

Рекомендатель (без аккаунта!):
4. Открывает /r/<token>
   ⤷ loadInviteByToken() — verify token, expiry, status
   ⤷ Рендерит форму: "Здравствуйте, <name>, <studentName> просит..."
5. Загружает PDF
   ⤷ createRecommenderUploadUrl() — signed PUT URL
   ⤷ Browser PUTит файл напрямую в Supabase Storage
   ⤷ finalizeRecommenderSubmission() — INSERT в documents,
     update invite.status = 'submitted'
6. Студент видит файл в /settings → «Документы»
```

---

## Слайд 8 — Rate-limit (важный кусок)

Это самое нетривиальное место в коде. Мы запиньчили **3 продакшен-бага** здесь — поэтому покрыто тестами с разных сторон.

```ts
// src/lib/rate-limit.ts
export async function checkUsage(userId: string): Promise<UsageStatus> {
  const { data } = await supabaseAdmin.rpc("try_consume_quota", { uid: userId })
  // ...
}
```

```sql
-- supabase/migrations/0017_quota_ambiguity_fix.sql
create or replace function entrium.try_consume_quota(uid uuid)
returns table (allowed boolean, remaining int, tier text, bonus int)
language plpgsql security definer
as $$
declare
  user_tier text;       -- НЕ "tier" — иначе ambiguous с OUT-параметром!
  user_pro_until timestamptz;
  user_bonus int;
  used int;
begin
  select p.tier, p.pro_until, p.bonus_credits
    into user_tier, user_pro_until, user_bonus
    from entrium.profiles p
   where p.id = uid
   for update;  -- row-lock для serial check + insert

  -- Pro tier — unlimited
  if user_tier = 'pro' and (user_pro_until is null or user_pro_until > now()) then
    return query select true, 2147483647, 'pro'::text, coalesce(user_bonus, 0);
    return;
  end if;

  -- Free tier: count today's events
  select count(*) into used from entrium.usage_events
   where user_id = uid
     and created_at >= date_trunc('day', now() at time zone 'utc');

  if used + coalesce(user_bonus, 0) >= 5 then
    return query select false, 0, 'free'::text, coalesce(user_bonus, 0);
  else
    return query select true, 5 - used, 'free'::text, coalesce(user_bonus, 0);
  end if;
end;
$$;
```

**Уроки:**
- Любую SQL-функцию надо **smoke-test'ить вызовом**, не только `select proname from pg_proc`. Скрипт `scripts/smoke-rpc.mjs` делает это после каждой миграции.
- TS-wrapper должен **fall-through на `{allowed: false}` при ошибке RPC**, не пробрасывать throw — иначе при поломке БД все пользователи видят 500 вместо чистого «лимит достигнут».

---

## Слайд 9 — Безопасность

| Что | Где | Зачем |
|---|---|---|
| **RLS на всех 14 таблицах** | `supabase/migrations/*` | Юзер не достанет чужие данные даже если SQL injection |
| **Atomic rate-limit** | `try_consume_quota` | Burst-запросы не превышают лимит |
| **CSP** | `next.config.ts` | XSS в публичных share-страницах не выполнится |
| **HSTS preload** | `next.config.ts` | Подмена HTTP запросов невозможна |
| **withApiError** | `lib/api-error.ts` | В prod stack traces не утекают наружу |
| **rehype-sanitize** | `components/markdown.tsx` | AI-output санитизируется (`javascript:` URL блокируются) |
| **HMAC-токены** | `lib/email/index.ts` | Unsubscribe и calendar links нельзя подделать |
| **Stripe idempotency** | `api/stripe/checkout/route.ts` | Двойной клик не создаёт две подписки |
| **Permissions-Policy** | `next.config.ts` | `microphone=(self)` для voice features, всё остальное denied |

**Что в твоих руках (нет автоматизации):**
- Stripe production keys не настроены — Pro flow заглушён до тех пор
- Resend в restricted-mode (free tier без верификации домена) — приглашения шлются только на email владельца
- 2FA не включён в Supabase Auth → Providers

---

## Слайд 10 — Что работает / что не доделано

### ✅ Работает (~88% ТЗ закрыто)

- Auth (Google), onboarding, dashboard, daily AI summary, applications CRUD, эссе с AI review, activity builder (Common App), 11 AI-инструментов, AI Agent, calendar (3 view), notifications inbox v2, documents upload, recommender flow с public `/r/[token]`, smart deadlines (7-цветная шкала), CSV bulk import, mobile responsive, Light/Dark/System темы, ru/en/uz переводы, Stripe Checkout (заглушен keys'ами), Telegram bot (outbound), 3 cron-задачи, Sentry с source-maps, RLS, atomic rate-limit, CSP+HSTS+Permissions-Policy.

### 🟡 На разработчика

1. **Stripe production keys** → Pro подписка заработает
2. **Resend domain verification** (~10 мин DNS) → приглашения уйдут на любые email
3. **2FA UI** (F-5) — после включения TOTP в Supabase Dashboard
4. **F-7 Counsellor mode** — view-only роль для куратора (нужно UX-решение)
5. **F-8 Essay versioning + diff** (UI решения)
6. **U-6 Inline AI comments** в эссе (как Google Docs)
7. **U-13 Forms unify** на react-hook-form + zod (5-6 часов)
8. **Q-3 Storybook** для компонентов
9. **Контент** — +150 scholarship deadlines, +500 универов из топ-100 QS

См. `docs/TZ_FULLSTACK.md` для полного списка с ID (S-, U-, F-, Q-).

---

## Слайд 11 — Первый день — что делать

```bash
# 1. Клонируй и поставь зависимости
git clone https://github.com/saidkarim410/entrium-ai-v2.git
cd entrium-ai-v2
npm install

# 2. Получи .env у владельца (Telegram @Tursunbaev01)
# Скопируй в .env.local. Нужны минимум:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - ANTHROPIC_API_KEY
# - OPENAI_API_KEY
# - EMAIL_TOKEN_SECRET

# 3. Запусти dev
npm run dev
# → http://localhost:3000

# 4. Прогон тестов
npm run test            # 89 unit, ~5s
npm run test:e2e        # 10 Playwright (нужен npx playwright install сначала)
npm run test:rpc-smoke  # 12 SQL checks против live Supabase

# 5. Перед каждым PR
npm run lint && npx tsc --noEmit && npm run test
```

**Куда заглянуть в первую очередь:**
1. `src/lib/supabase/server.ts` — `getCurrentUser()` / `getCurrentProfile()` — твой auth
2. `src/lib/rate-limit.ts` — лимиты AI-вызовов
3. `src/components/ai-state.tsx` — правильные паттерны loading/error/empty
4. `src/lib/applications/types.ts` — domain types, `deadlineUrgency()` helper
5. `supabase/migrations/` — схема БД, добавляешь новые таблицы туда (0018+)
6. `docs/TZ_FULLSTACK.md` — полное ТЗ с ID-шниками задач

**Что НЕ делаешь без спроса:**
- Не меняешь `next.config.ts` security headers
- Не используешь `supabaseAdmin` без `getCurrentUser()` верификации
- Не амендишь чужие коммиты, не push --force в `main`
- Не выключаешь pre-commit hooks
- Не удаляешь миграции, только добавляешь новые

---

## Слайд 12 — Контакты и ресурсы

- **GitHub:** https://github.com/saidkarim410/entrium-ai-v2
- **Прод:** https://entrium-ai-v2.vercel.app
- **Vercel дашборд:** vercel.com/saidkarim410s-projects/entrium-ai-v2
- **Supabase project:** `zcbbpqfdyqavdubzrgaf`
- **Владелец:** Saidkarim Tursunbaev — Telegram @Tursunbaev01

**Документы в репо:**
- `docs/TZ_FULLSTACK.md` — полное ТЗ с приоритизированным backlog (S-/U-/F-/Q- IDs)
- `docs/TEST_REPORT.md` — полный тест-репорт (158/158 ✓)
- `docs/RESEND_SETUP.md` — как верифицировать email-домен
- `docs/ONBOARDING.md` — этот файл

---

## TL;DR

**Что:** AI-платформа для поступления в зарубежные универы.
**Стек:** Next.js 16 + React 19 + Supabase + Vercel AI SDK (Claude + OpenAI) + Stripe + Resend + Telegram.
**Состояние:** ~88% MVP готово, в проде, тесты зелёные, готов к платным клиентам.
**Главное правило:** добавляешь SQL-функцию — пиши smoke-test, используешь admin client — после verified `getCurrentUser()`, добавил route → `withApiError()`.

Удачи в кодинге. Если что — `@Tursunbaev01` в Telegram.

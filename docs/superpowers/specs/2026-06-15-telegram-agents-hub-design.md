# Entrium AI — Telegram Mini App «Хаб агентов» · Design Spec

> Дата: 2026-06-15 · Автор: Саидкарим + Claude · Статус: на ревью
> Репозиторий реализации: `entrium-ai-v2` (Next.js 16, Vercel)

---

## 1. Цель

Дать абитуриентам мощный, анимированный **многоагентный хаб прямо в Telegram** — точку входа ко всем AI-наставникам Entrium. Каждый блок поступления = отдельный агент; видно, как агенты «думают» и работают в реальном времени.

**Ключевая идея экономии:** мы НЕ строим AI-движок заново. В `entrium-ai-v2` уже готовы 12 инструментов, 4 агента-миссии, стриминговый чат на Claude, база 1504 вузов + 289 стипендий, Telegram-вход и биллинг. Mini App — это **красивая витрина + 2 новых агента** поверх готового.

---

## 2. Объём v1 (scope)

В работе:
1. Новый маршрут `/tg` — Telegram Mini App в фирменном стиле v2.
2. Хаб: сетка из 12 существующих агентов + карточка активной миссии с прогрессом по шагам.
3. Анимации v2 (aurora, reveal, typewriter-каретка, «working»-состояния агентов).
4. Запуск из бота `@entriumleedbot` (menu button → web_app) + авторизация по Telegram `initData`.
5. **2 новых агента:**
   - **Speaking-коуч** — разговорная практика английского голосом (готовит к IELTS Speaking и интервью).
   - **Летние программы / pre-college** — подбор summer schools и pre-college для усиления профиля.

Вне v1 (на потом): Тест-тренажёр SAT/IELTS, агент «Виза и документы».

---

## 3. Архитектура

```
entrium-ai-v2/
└── src/
    ├── app/
    │   ├── tg/                         ← НОВОЕ. Mini App (вне (app) auth-gate)
    │   │   ├── layout.tsx              облегчённый layout под Telegram viewport
    │   │   ├── page.tsx                хаб агентов (client component)
    │   │   └── agent/[slug]/page.tsx   компактный экран агента (чат/голос/миссия)
    │   └── api/
    │       └── tg/
    │           └── auth/route.ts       ← НОВОЕ. Валидация Telegram initData (HMAC)
    ├── lib/
    │   └── agents/registry.ts          ← НОВОЕ. Конфиг агентов (slug→иконка/промпт/тип)
    └── components/tg/                   ← НОВОЕ. AgentCard, MissionCard, AuroraBg и т.п.
```

**Переиспользуем как есть:**
- `/api/chat` — стриминг ответов агента (AI SDK v6, Claude Sonnet/Haiku).
- `/api/agent` + `lib/agent/missions.ts` — мультишаговые миссии.
- `SYSTEM_PROMPTS` (`lib/ai/prompts.ts`), `models` (`lib/ai`), RAG (`lib/ai/rag.ts`).
- Голосовой стек (`api/realtime/token`, `api/voice/transcribe`, `voice-textarea.tsx`) — для Speaking-коуча.
- Дизайн-токены и анимации (`app/globals.css`, `components/landing/animations.tsx`).
- Лимиты/биллинг (`lib/rate-limit.ts`, Stripe tiers).

**Реестр агентов** (`lib/agents/registry.ts`) — единый источник правды для хаба:
```ts
type Agent = {
  slug: string                 // "essay", "interview", "speaking", ...
  icon: LucideIcon
  titleKey: string             // ключ в lib/i18n/dict.ts (RU/EN/UZ)
  descKey: string
  kind: "chat" | "voice" | "mission" | "tool"
  promptKey?: keyof typeof SYSTEM_PROMPTS   // для kind="chat"
  toolSlug?: string            // для kind="tool" → ведёт на существующий /tools/[slug]
  missionId?: string           // для kind="mission"
  isNew?: boolean
  proOnly?: boolean
}
```
12 существующих агентов описываются ссылками на уже готовые промпты/маршруты; 2 новых добавляют свои `promptKey`.

---

## 4. Авторизация (Telegram Mini App)

- Telegram при запуске Mini App передаёт подписанный `initData`.
- `POST /api/tg/auth` валидирует подпись (HMAC-SHA256 секретом из bot token), извлекает `telegram user id`.
- Находим профиль по `telegram_user_id`; если нет — создаём/линкуем (используем сервис-роль, как в webhook).
- Выдаём сессию Supabase (или короткоживущий токен) для последующих вызовов `/api/chat`.

**Миграция БД:** добавить `entrium.profiles.telegram_user_id bigint unique`. Сейчас линковка идёт через `telegram_chat_id` + одноразовый код; для Mini App нужен стабильный `user_id`. Бэкофилл: при первом заходе через Mini App связываем `user_id` с уже привязанным `chat_id`, если совпадает.

---

## 5. Бренд / дизайн

Строго по дизайн-системе v2 (см. `globals.css` §7.5 CLAUDE.md):
- Палитра: `--paper #f5f5f5`, `--ink #0a0a0a`, `--brand-red #ED1C24`, `--brand-red-soft #fee7e8`.
- Типографика: Manrope 800 (заголовки, uppercase, tracking −0.03em), JetBrains Mono (mono-eyebrow лейблы).
- Примитивы: `brand-eyebrow` (красный тик), `brand-rule` (красная полоса), `dotted-map`, `card-hover` (lift + красный glow), `aurora-orb`, `brand-caret`.
- Иконки: `lucide-react` (НЕ Tabler — это превью; проект на lucide).
- Адаптив под узкий Telegram viewport; Telegram dark theme → маппим на v2 dark-токены; уважаем `prefers-reduced-motion`.

«Вау» функциональный: прогресс миссии по шагам (3/4), стриминг ответа с красной кареткой, «working»-состояние карточки.

---

## 6. Новые агенты — детали

**Speaking-коуч (`kind: "voice"`)**
- Промпт `SYSTEM_PROMPTS.speaking`: экзаменатор IELTS/admission, ведёт диалог, по STAR/band-критериям даёт оценку и правки.
- Голос: вход через существующий voice-стек; ответ озвучивается/текст + разбор.
- Сохранение сессии в `entrium.tool_runs` (история), учёт в `usage_events` (`tool: "speaking"`).

**Летние программы / pre-college (`kind: "chat"` + web_search)**
- Промпт `SYSTEM_PROMPTS.summerPrograms`: эксперт по summer schools/pre-college; подбирает под профиль (класс, интересы, бюджет, цель-вузы), даёт сроки/дедлайны/стоимость/ссылки.
- v1: использует Anthropic `web_search` (как `runScholarAI`/`qsAISearch`).
- v2 (позже): своя таблица `entrium.programs` + embeddings + match RPC (как стипендии).

---

## 7. Ошибки и edge cases

| Ситуация | Поведение |
|---|---|
| `initData` невалиден/устарел | Экран «Открой приложение через @entriumleedbot» |
| Профиль не привязан | Авто-создание по `telegram_user_id` + мягкий мини-онбординг |
| Лимит запросов исчерпан | Апселл Pro (`/pricing`), как в webhook |
| Нет доступа к микрофону (Speaking) | Fallback на текстовый режим |
| `prefers-reduced-motion` | Анимации отключаются (уже в globals.css) |
| Долгий стрим в Telegram webview | Проверить `maxDuration`/таймауты; держать ответы компактными |

---

## 8. Тестирование

- **Unit (vitest):** валидатор `initData` HMAC; выбор промпта по реестру агентов; маппинг tier→модель.
- **E2E (playwright):** рендер `/tg`, открытие агента, мок-стрим ответа, поведение при лимите.
- **Smoke:** `node scripts/qa-test.mjs` остаётся 35/35; добавить кейсы под `/tg` и `/api/tg/auth`.
- **Ручная:** BotFather → menu button (web_app URL) → проверка на реальном телефоне (light/dark Telegram theme).

---

## 9. План постройки (фазы)

1. **Каркас хаба** — `/tg`, бренд-стиль, `agents/registry.ts` (12 существующих), открытие агента в компактном чате через `/api/chat`, `initData`-auth + миграция `telegram_user_id`. → деплой, «вау» уже видно.
2. **Миссии в хабе** — прогресс мультишага через `/api/agent`.
3. **Speaking-коуч** — голосовой агент.
4. **Летние программы** — агент на `web_search` (база — позже).
5. **Полировка** — анимации, Telegram dark theme, PostHog-аналитика, апселлы Pro.

Каждая фаза — отдельный деплой и проверяема независимо.

---

## 10. Решения по умолчанию (можно переопределить на ревью)

- **Маршрут:** `/tg` (коротко, явно «телеграм»). Альтернативы: `/mini`, `/app`.
- **Платный доступ:** как сейчас — базовый чат/quota бесплатно, глубокие инструменты и Pro-агенты по подписке. Speaking-коуч — кандидат на Pro.
- **Летние программы (данные):** v1 на `web_search`; своя БД программ — фаза 2.

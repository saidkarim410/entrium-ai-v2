# TZ «Правки для системы» (2026-05-22) — deployment checklist

Эти правки реализуют ТЗ из `~/Downloads/Правки для системы (1).pdf`:
полный white-label, замена звезды на сердце, расширение схемы пользователей,
multi-provider auth (Yandex + WhatsApp), Excel export, payments table,
Stripe-webhook логирование транзакций, admin panel.

Код в репозитории. Чтобы всё реально заработало в production, нужно:

## 1. Применить миграцию

Файл: `supabase/migrations/0019_user_extensions_payments_admin.sql`

Что делает:
- Расширяет `entrium.profiles` колонками: `first_name`, `last_name`, `phone`,
  `age`, `gender`, `country`, `city`, `school_or_university`, `class_or_course`,
  `google_id`, `telegram_id`, `yandex_id`, `whatsapp_phone`, `whatsapp_verified`,
  `auth_provider`, `registration_date`, `role`.
- Бэкфилит `registration_date` (из `created_at`) и `first_name`/`last_name`
  (split существующего `full_name`).
- Создаёт `entrium.payments` (отдельно от `subscriptions`).
- Создаёт `entrium.audit_logs`.
- Обновляет `entrium.handle_new_user()` — теперь извлекает `first_name`,
  `last_name`, `avatar_url`, `auth_provider`, `google_id`/`telegram_id`/`yandex_id`
  из `raw_user_meta_data` / `raw_app_meta_data` при signup.
- Добавляет admin RLS-политики (read-only по всем профильным таблицам
  для пользователей с `role = 'admin'`).
- Создаёт view `entrium.users_with_payments` (используется в admin panel
  и /api/admin/export/users).

**Как применить:**
```bash
# Supabase Studio → SQL Editor → вставить файл целиком → Run
# или CLI:
supabase db push   # если CLI настроен под этот проект
# или curl с SUPABASE_ACCESS_TOKEN:
curl -X POST "https://api.supabase.com/v1/projects/zcbbpqfdyqavdubzrgaf/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -Rs '{query: .}' < supabase/migrations/0019_user_extensions_payments_admin.sql)"
```

После применения — **выдать себе admin role**:
```sql
update entrium.profiles set role = 'admin' where email = 'tursunbaev505@gmail.com';
```

## 2. Подключить новые auth-провайдеры в Supabase

### Yandex OAuth
1. https://oauth.yandex.ru → Create new app
   - Permissions: `login:info`, `login:email`, `login:avatar`
   - Redirect URI: `https://zcbbpqfdyqavdubzrgaf.supabase.co/auth/v1/callback`
2. Supabase Dashboard → Authentication → Providers → Yandex
   - Enable, paste **Client ID** + **Client Secret**
3. Готово. Кнопка «Продолжить с Yandex» уже на `/login` + `/signup`.

### WhatsApp OTP (через Supabase Phone Auth + Twilio)
1. Twilio:
   - Создать Account, подключить WhatsApp Business sender (sandbox или
     production-номер).
   - Зарегистрировать OTP-template если регион требует.
   - Получить **Account SID**, **Auth Token**, **Messaging Service SID**.
2. Supabase Dashboard → Authentication → Providers → Phone
   - Enable, выбрать **Twilio** как провайдера.
   - Вставить ключи. Channel: **WhatsApp**.
3. Если включён rate-limit — настроить в Auth → Rate Limits.

Без п.2 кнопка «Продолжить с WhatsApp» откроет диалог, но `signInWithOtp`
вернёт ошибку «provider not configured».

## 3. Stripe webhook — расширенный

Существующий `/api/stripe/webhook` теперь обрабатывает дополнительно:
- `payment_intent.succeeded` → создаёт строку в `entrium.payments`
- `charge.refunded` → ставит `payment_status = 'refunded'` на существующий
  payment_intent

В Stripe Dashboard → Developers → Webhooks → существующий endpoint
`https://entrium-ai-v2.vercel.app/api/stripe/webhook`:
**подписаться на новые события**:
- `payment_intent.succeeded`
- `charge.refunded`

Если webhook secret меняется — обновить `STRIPE_WEBHOOK_SECRET` в Vercel env.

## 4. Vercel env vars — никаких новых не нужно

Все нужные ключи уже есть. Yandex / WhatsApp идут через Supabase Auth,
а не через прямые API-ключи в нашем коде.

## 5. После деплоя — проверочный чек-лист

```bash
# 1) HTTP 200 на главной
curl -sS -o /dev/null -w "%{http_code}\n" https://entrium-ai-v2.vercel.app

# 2) Сердечко на favicon (icon.svg отдаётся)
curl -sS https://entrium-ai-v2.vercel.app/icon.svg | head -5

# 3) Admin защищён
curl -sS -o /dev/null -w "%{http_code}\n" https://entrium-ai-v2.vercel.app/admin
# → ожидаем 307 (redirect) для неавторизованных

# 4) Экспорт защищён
curl -sS -o /dev/null -w "%{http_code}\n" https://entrium-ai-v2.vercel.app/api/admin/export/users
# → 401

# 5) В Supabase Studio: SELECT count(*) FROM entrium.payments;
#    → 0 (или сколько уже было импортировано через webhook).
```

## 6. Что осталось из PDF, но требует операторских действий, а не кода

- **Verification template WhatsApp** — текст OTP-сообщения в Twilio Console
  (не в коде).
- **Account linking при одинаковом email** — Supabase Auth по умолчанию
  объединяет identities при подтверждённом email (`Confirm email = ON`).
  Включить эту опцию в Dashboard → Auth → Email если ещё не включена.
- **Yandex/WhatsApp/Google client secrets** — лежат внутри Supabase, не
  в этом репо.
- **Заполнение `class_or_course` / `school_or_university` для существующих
  пользователей** — onboarding wizard теперь спрашивает на step 3, но
  существующие профили остаются с NULL пока юзер не отредактирует.

## 7. Что было сделано в коде (high-level)

| Файл / папка | Изменение |
|---|---|
| `src/app/landing-content.ts` | Убраны все упоминания Claude / Anthropic / Sonnet в RU/EN/UZ landing |
| `src/lib/i18n/dict.ts` | Badge в дикте теперь "Entrium AI" |
| `src/app/page.tsx` | Star icon → Heart, "CLAUDE · LIVE OUTPUT" → "ENTRIUM AI · LIVE OUTPUT", "Sonnet 4.5" → "Entrium AI Pro" |
| `src/app/(app)/pricing/pricing-client.tsx` | "Claude Sonnet 4.5" → "Entrium AI Pro" |
| `src/app/terms/page.tsx`, `src/app/privacy/page.tsx` | Anthropic / Claude removed from user-facing copy |
| `src/app/opengraph-image.tsx` | Полностью переделан под brand v2 (red heart, paper bg, chromatic split) |
| `src/app/icon.svg` | Новый heart favicon (Next.js 16 авто-генерит favicon/apple-touch) |
| `src/components/counselor-widget.tsx` | Heart icon, brand-red CTA, rebrand "Entrium AI", надёжнее mobile positioning (svh) |
| `src/components/favorite-button.tsx` | Star → Heart, gold → brand-red |
| `src/app/(app)/shortlist/page.tsx`, `src/app/(app)/layout.tsx`, `src/components/mobile-nav.tsx` | Star icon + ⭐ emoji → Heart + ❤ в navigation |
| `supabase/migrations/0019_user_extensions_payments_admin.sql` | См. п.1 выше |
| `src/lib/applicant/actions.ts` | Новый `getOnboardingInitial()` — авто-заполняет wizard данными из социалки |
| `src/app/(app)/onboarding/page.tsx`, `src/app/(app)/onboarding/onboarding-wizard.tsx` | Pre-fill name/email/phone/age/location/school из провайдера + бейдж «из Google ✓» рядом с auto-filled полями + добавлены поля email/phone в step 1 |
| `src/lib/admin/auth.ts` | Хелперы `requireAdminPage()` / `requireAdminApi()` — гарды для admin-страниц и API-роутов |
| `src/app/api/admin/export/users/route.ts` | `.xlsx` экспорт всех пользователей (admin-only) |
| `src/app/api/admin/export/payments/route.ts` | `.xlsx` экспорт оплат |
| `src/app/(auth)/yandex-button.tsx` | Yandex OAuth button (Supabase provider) |
| `src/app/(auth)/whatsapp-button.tsx` | WhatsApp OTP диалог (phone → OTP code → verifyOtp) |
| `src/app/api/auth/whatsapp/link/route.ts` | После verifyOtp патчит profile: `whatsapp_phone` + `whatsapp_verified = true` |
| `src/app/(auth)/login/page.tsx`, `signup/page.tsx` | Подключены YandexButton + WhatsAppButton |
| `src/app/api/stripe/webhook/route.ts` | Дополнительные обработчики `payment_intent.succeeded` и `charge.refunded` — пишут в `entrium.payments` |
| `src/app/(app)/admin/layout.tsx` | Admin nav-bar (top tabs) + admin-only access |
| `src/app/(app)/admin/page.tsx` | Dashboard: 5 KPI-карточек, кнопки экспорта |
| `src/app/(app)/admin/users/page.tsx` | Список пользователей · фильтры: q, country, city, uni, age range, has_payments, registered date range · пагинация · xlsx-кнопка |
| `src/app/(app)/admin/payments/page.tsx` | Список оплат · фильтры: q, status, method, date range · totals · xlsx-кнопка |
| `src/app/(app)/admin/audit/page.tsx` | Простой audit-log просмотр |

## 8. Что НЕ делалось (out of scope для этой итерации)

- Не запускался `next build` / `tsc --noEmit` — Node на машине, где код
  редактируется, отсутствует. Vercel CI должен прогнать build при push.
- Не правились legacy `gold` / `cream-*` Tailwind утилитные классы внутри
  onboarding-wizard и старых tools — они отображаются красным/foreground
  через CSS-алиасы (`globals.css` §7.5 CLAUDE.md), визуально совпадают
  с brand v2.
- Не делалась миграция данных существующих пользователей в новые колонки
  (`country` / `city` / etc.) — они остаются NULL до следующего захода
  пользователя в /settings или /onboarding.
- Не делался "merge accounts UI" (когда юзер хочет связать существующий
  email-аккаунт с новым OAuth identity) — это отдельная фича.
- Дизайн-токены paper/ink/red и `--brand-red-soft` уже были в репо до
  этого ТЗ.

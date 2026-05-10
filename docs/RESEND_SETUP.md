# Resend Email Setup

**Status (2026-05-10):** API key установлен (`email_resend: true` в `/api/health`).
Отправка работает в **restricted mode** — Resend free tier шлёт письма только на email владельца аккаунта (`tursunbaev505@gmail.com`).

---

## Что это значит для пользователей

Когда студент создаёт recommender invite на чужой email:
- ✅ Приглашение **создаётся** в БД, токен валиден 60 дней
- ⚠️ Письмо рекомендателю **не уходит** — Resend возвращает `403 verify a domain`
- ✅ UI показывает toast: «Email не отправлен — сервер в тестовом режиме» с кнопкой «Скопировать ссылку»
- ✅ Студент шарит ссылку рекомендателю вручную в WhatsApp/Telegram

Это рабочий fallback, но «отправить письмо одной кнопкой» появится только после верификации домена.

---

## Как лифтнуть restricted mode (~10 минут)

### 1. Купить домен (если ещё нет)

Любой домен подойдёт — Namecheap, Cloudflare, GoDaddy.
Если у тебя уже есть `entrium.uz`, `entrium.ai` или подобный — пропускай этот шаг.

### 2. Добавить домен в Resend

1. Зайди на https://resend.com/domains
2. **Add Domain** → введи `entrium.ai` (или твой)
3. Resend покажет 3 DNS-записи:
   - **MX** record для bounce-mailbox
   - **SPF** TXT record
   - **DKIM** TXT record (длинный публичный ключ)

### 3. Добавить DNS-записи у регистратора

В Cloudflare / Namecheap / GoDaddy:
- Создать MX, TXT(SPF), TXT(DKIM) ровно как Resend показал
- TTL — auto или 3600

### 4. Проверить в Resend

- Жми **Verify** на странице Resend
- Распространение DNS обычно ~5 минут, иногда до часа
- Когда статус станет «Verified» — все 3 галочки зелёные

### 5. Обновить `RESEND_FROM` в Vercel

```bash
vercel env rm RESEND_FROM production
echo "Entrium AI <noreply@entrium.ai>" | vercel env add RESEND_FROM production
```

(или через Vercel UI: Settings → Environment Variables → `RESEND_FROM`)

### 6. Redeploy

Любой коммит на `main` или `vercel --prod`. Готово — recommender invites шлются автоматически.

---

## Альтернатива — onboarding@resend.dev (текущая настройка)

`RESEND_FROM` сейчас стоит на `onboarding@resend.dev` — это публичный sandbox от Resend.
- ✅ Работает без верификации
- ⚠️ Можно слать только на email владельца Resend-аккаунта
- ⚠️ Письма могут попадать в спам у получателя из-за общего домена
- ⚠️ Нельзя кастомизировать `From` (брендирование слабее)

---

## Verification command

После любых изменений проверь что email подхватился:

```bash
# Health endpoint
curl -s https://entrium-ai-v2.vercel.app/api/health | jq .integrations.email_resend
# Должно вернуть: true

# Direct Resend smoke
curl -X POST "https://api.resend.com/emails" \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":"noreply@entrium.ai","to":"<свой_email>","subject":"smoke","html":"<p>ok</p>"}'
# Должно вернуть {"id":"..."} без statusCode
```

---

## Webhook (на потом — bounce / complaint tracking)

Когда захочешь отслеживать доставленность:
1. https://resend.com/webhooks → **Add Endpoint**
2. URL: `https://entrium-ai-v2.vercel.app/api/email/webhook` (нужно будет сделать)
3. Events: `email.bounced`, `email.complained`, `email.opened`
4. Resend подпишет webhook signing secret → положить в `RESEND_WEBHOOK_SECRET` в Vercel

Этим можно подсветить в UI «Письмо открыли» / «Bounced — обнови email» рядом с recommender invite.

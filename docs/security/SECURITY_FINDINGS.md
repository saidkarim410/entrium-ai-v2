# Entrium AI v2 — Security Audit & Hardening

- **Date:** 2026-06-26
- **Scope:** whole project (`entrium-ai-v2`), branch `feat/tg-mini-app` → fixes on `security/hardening-2026-06`
- **Method:** 5 parallel adversarial `security-auditor` passes (auth/RLS · payments · Telegram · AI/quota · secrets/config) + `npm audit`. Audit-only first; remediation logged below.

## Scorecard (before)

| Severity | Count |
|---|---|
| 🔴 Critical | 3 |
| 🟠 High | 8 |
| 🟡 Medium | 8 |
| ⚪ Low | 5 |

Dominant categories: Broken Access Control / IDOR (CWE-639/862/285), missing rate-limit & unbounded AI cost (CWE-770), auth bypass / replay (CWE-287/294), sensitive-data exposure (CWE-200/359).

**What was verified SOLID (no action):** Stripe webhook signature on raw body + server-fixed price + customer↔user binding (no payment forgery / IDOR); `auth.getUser()` everywhere (no `getSession` trust); RLS enabled with correct owner policies on all per-user tables; admin pages/exports behind `requireAdminPage`/`requireAdminApi`; cron auth fail-closed + constant-time; no hardcoded secrets in tracked files; `.env*` git-ignored; realtime route mints an ephemeral OpenAI key; initData HMAC uses the correct WebAppData scheme + `timingSafeEqual`; file uploads size/type-capped, no path traversal.

---

## 🔴 Critical

### C1 (A-1) — Any logged-in user can dump ALL users' PII + payments
- CWE-639 · `supabase/migrations/0019_user_extensions_payments_admin.sql:195-212`
- The `entrium.users_with_payments` view is created **without** `security_invoker = true` (runs as owner → bypasses RLS) yet `grant select ... to authenticated`. The `entrium` schema is exposed to PostgREST. **Exploit:** any registered user + the public anon key + their own JWT → `GET /rest/v1/users_with_payments?select=*` dumps every user's email, phone, city, school, provider IDs, total paid. One request, no tooling.
- **Fix (SQL, owner applies to prod):** recreate the view `with (security_invoker = true)` AND `revoke select on entrium.users_with_payments from authenticated;` (legit callers use the service-role admin client).

### C2 (A-2 / D-6) — `/api/setup` is privileged but only login-gated
- CWE-306/862 · `src/app/api/setup/route.ts:24-28`, `src/app/setup/page.tsx:16`
- Gated only by `getCurrentUser()` → **any** authenticated user (incl. self-service Telegram/Google signups) can run migration SQL, rewrite production Vercel env vars (`CRON_SECRET`, `EMAIL_TOKEN_SECRET`, `TELEGRAM_BOT_TOKEN`, `RESEND_API_KEY`) and trigger a redeploy.
- **Fix (code):** `requireAdminApi()` in the route + `requireAdminPage()` in the page; ideally gate behind a server-only `SETUP_SECRET` and remove from prod after provisioning.

### C3 (D-1) — Free-tier AI quota bypassable → unlimited spend on owner's keys
- CWE-367 (TOCTOU) / CWE-770 · `supabase/migrations/0016_quota_fix.sql:26-83` + every AI route
- Migration 0016 removed the atomic reservation, so `try_consume_quota` only **counts**; the incrementing row is written later by `recordUsage` (after generation). **Exploit:** fire 50 concurrent `/api/chat` — all read `used=0`, all run Claude → the 5/day cap becomes unlimited on the owner's Anthropic/OpenAI bill.
- **Fix (SQL, owner applies to prod):** restore atomic reservation inside `try_consume_quota` (reserve row keyed per user/nonce; count reservations+events; `recordUsage` updates the reservation in place).

---

## 🟠 High

### H1 (A-4 / E-5) — Public-share RPC leaks full applicant dossier to anonymous
- CWE-200 · `supabase/migrations/0009_public_sharing.sql:21-82` (+ copy in `src/lib/setup/migrations-data.ts`)
- `get_public_profile` / `get_public_applications` (SECURITY DEFINER, granted `anon`) return the **entire `applicant_data` jsonb** (incl. email/phone) for any `unlisted`/`public` slug. The page filters server-side today, but a direct anon RPC call leaks contact PII for every shared profile.
- **Fix (SQL):** return only a whitelist of fields; decide whether `unlisted` should be reachable by slug.

### H2 (C1/C5 telegram) — Mini App account takeover via mutable chat-id + weak link codes
- CWE-639/330 · `src/lib/telegram/resolve-user.ts:18-21`, `src/lib/telegram.ts:149-157`, `src/app/api/telegram/webhook/route.ts`
- Mini App identity = `telegram_chat_id` (mutable; the web `/start <code>` flow rewrites it). Link codes use `Math.random()` (not CSPRNG), 8 chars / 30 min, redeemable by **any** Telegram user. **Exploit:** redeem a victim's still-valid code → bind their account to the attacker's Telegram id → operate it from the attacker's Mini App.
- **Fix (code):** CSPRNG link codes (`crypto.randomInt`), single-use + rate-limited redemption, resolve identity by an immutable `telegram_id` (column already exists) instead of `telegram_chat_id`.

### H3 (D-2) — Client-controlled `system_override` on `/api/ai`
- CWE-77 · `src/app/api/ai/route.ts:23,54,59,89`
- Schema accepts `system_override` from the client and uses it verbatim → any user turns the route into an unrestricted general-purpose Claude on the owner's budget.
- **Fix (code):** remove `system_override` from the public schema (server owns the system prompt).

### H4 (D-3) — No shared-store rate limiter; `/api/search` ungated
- CWE-770 · `src/lib/rate-limit.ts`, `src/app/api/search/route.ts:21`
- Only throttle is the per-user daily AI quota (in-memory rate-limit is per-instance → useless on Fluid Compute). `/api/search` has no quota/limit and fans out to unindexed `ilike` JSON queries.
- **Fix (code):** shared-store limiter (Postgres counter / Upstash) keyed by user+route; per-minute cap on AI routes; index/trim the search query.

### H5 (D-4) — No output-token cap on 11 of 12 AI routes
- CWE-770 · `chat`, `agent`, `tg/chat`, `tg/agent`, `essays/[id]/review`, `scholarships/[id]/match`, `universities/*`, `applications/*`, `activities/rewrite`, `daily-summary`
- Only `/api/ai` caps `maxOutputTokens`. A single permitted call can run to max context.
- **Fix (code):** explicit server-side `maxOutputTokens` per route.

### H6 (E-1) — Weak Content-Security-Policy
- CWE-1021 · `next.config.ts:15`
- `script-src` has both `'unsafe-inline'` and `'unsafe-eval'` + `https://*.vercel.app` wildcard → CSP gives no XSS backstop.
- **Fix (code):** drop `unsafe-eval`; nonce/`strict-dynamic` for inline; pin hosts. (Test in preview — may need iteration.)

### H7 (E-2) — Sentry Session Replay ships unmasked PII
- CWE-359 · `sentry.client.config.ts:12`
- `replayIntegration({ maskAllText:false, blockAllMedia:false })` records the full DOM on errors → student name/email/phone/scores exfiltrated to Sentry.
- **Fix (code):** `maskAllText:true`, `blockAllMedia:true`.

### H8 (B-1) — `profiles_self_update` RLS has no `WITH CHECK` (latent free-Pro/self-admin)
- CWE-639/732 · `supabase/migrations/0001_initial_schema.sql:190`
- Not exploitable today (the `authenticated` role lacks table UPDATE on `profiles`), but a single future `grant update on entrium.profiles to authenticated` flips it into free-Pro + self-`role='admin'`. Cheap to harden, catastrophic blast radius.
- **Fix (SQL):** add `with check (auth.uid()=id)`, `revoke update ... from authenticated`, and a trigger guarding `tier/pro_until/bonus_credits/role` to service-role only.

---

## 🟡 Medium

- **M1 (A-6)** `EMAIL_TOKEN_SECRET` dev fallback returns `SUPABASE_SERVICE_ROLE_KEY` as the HMAC secret — dangerous on any non-prod public deploy. `src/lib/env.ts:69`. Fix: never fall back to the service-role key; hard-fail when `VERCEL_ENV` set.
- **M2 (C2)** initData replay: 24h window, no replay cache, no future-date check. `src/lib/telegram/init-data.ts:45`. Fix: ~1h max age, reject future `auth_date`, cache used hashes.
- **M3 (C3)** legacy `/api/auth/telegram` widget path uses `computed === hash` (non-constant-time) + `listUsers()` scan. Fix: delete the route or `timingSafeEqual` + indexed lookup.
- **M4 (E-3)** non-expiring HMAC calendar/unsubscribe tokens → leaked `.ics` URL = permanent PII access. `src/lib/email/index.ts:41`. Fix: add `exp` to the signed payload; per-user revocable calendar token.
- **M5 (E-4)** 26 dependency CVEs (6 high: `tmp`, `ws`, `vite`). Fix: `npm audit fix`; bump `@sentry/nextjs`, `posthog-js`, `ws`.
- **M6 (D-5)** agent step amplification (compounds C3 quota race). Fix: reserve all steps atomically + cap output.
- **M7 (D-7)** verbose provider errors leaked to client (`ai`, `realtime/token`, `voice/transcribe`). Fix: wrap in `withApiError`.
- **M8 (A-5)** Telegram login by synthetic-email convention + unpaginated `listUsers()` → account collision/churn. `src/app/api/auth/telegram/route.ts:53`. Fix: look up by `telegram_id` index.

## ⚪ Low

- **L1 (C4)** Telegram webhook secret check is conditional → fail-open if env unset. `webhook/route.ts:46`. Fix: fail closed in prod.
- **L2 (B-2)** Referral self-farming via throwaway Telegram accounts (+10 bonus each). Fix: require verified payment / cap lifetime bonus.
- **L3 (B-3)** Non-atomic `bonus_credits` increment (read-then-write race). `referrals/actions.ts:188`. Fix: atomic SQL increment.
- **L4 (B-4)** Webhook never syncs `entrium.subscriptions` → admin "who paid" blind spot. Fix: upsert subscriptions in `syncSubscription`.
- **L5 (E-6)** Recommender upload: no content-type constraint, trusts client `mimeType` → possible stored-XSS if served same-origin. `recommenders/actions.ts:223`. Fix: content-type allow-list on signed URL + re-stat on finalize + `Content-Disposition: attachment`.

---

## Dependency CVEs (`npm audit` — 26 total: 6 high / 19 moderate / 1 low)

| Package | Installed | Severity | Issue | Fixed in |
|---|---|---|---|---|
| `tmp` | <0.2.6 | high | path traversal via prefix/postfix | `npm audit fix` |
| `ws` | 8.0.0–8.20.1 | high | uninit-memory disclosure + DoS | `npm audit fix` |
| `vite` | 8.0.0–8.0.15 | high | NTLM disclosure / fs.deny bypass (dev) | `npm audit fix` |
| `qs` | 6.11.1–6.15.1 | moderate | stringify DoS | `npm audit fix` |
| `uuid` | <11.1.1 | moderate | buffer bounds (via `exceljs`) | `audit fix --force` (breaking) |
| `@babel/core`, `@opentelemetry/*`, `posthog-js`, `@sentry/*` | various | moderate | DoS / file-read chains | bump majors |

---

## 🔑 Owner-only action items (cannot be done from code)

1. 🔴 **Rotate the `@entriumleedbot` bot token in @BotFather** — it leaked in git history (current code is clean, but history persists forever). Then update `TELEGRAM_BOT_TOKEN` in Vercel.
2. **Apply the new SQL migrations to prod Supabase** (SQL editor) — C1, C3, H1, H8. I can't reach the prod DB (no Mgmt token / CLI / psql).
3. **Approve the prod deploy** of the code fixes (pushing auto-deploys the live site).
4. Hygiene: rotate the on-disk dev keys (`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`) when convenient.

---

## Remediation Log

_(updated as fixes land on `security/hardening-2026-06`)_

| ID | Status | Change |
|---|---|---|
| C2 | ✅ fixed (code) | `requireAdminApi()` gate added to `/api/setup` POST (`src/app/api/setup/route.ts`) |
| H3 | ✅ fixed (code) | removed client-controlled `system_override` from `/api/ai` schema + logic |
| H5 (`/api/ai`) | ✅ fixed (code) | hard server-side `maxOutputTokens` (free 2048 / pro ≤16k); other AI routes pending |
| H7 | ✅ fixed (code) | Sentry replay `maskAllText:true`, `blockAllMedia:true` (`sentry.client.config.ts`) |
| C1 | ✅ fixed (SQL) | `0020`: `users_with_payments` → `security_invoker=true` + revoke from authenticated/anon |
| C3 | ✅ fixed (SQL+code) | `0020`: restored atomic quota reservation; `rate-limit.ts` `recordUsage` fills the reservation (no double-count) |
| H8 | ✅ fixed (SQL) | `0020`: `profiles_self_update` WITH CHECK + revoke UPDATE (+ optional privileged-col trigger documented) |
| verify | ✅ | `tsc --noEmit` clean · **107/107** vitest pass (added 2 reservation tests) |
| C5, M2, M3, M1, L1 | ✅ fixed (code) | Telegram/secrets: CSPRNG link codes · initData 1h + reject future-dated · timing-safe widget compare · email secret no longer falls back to service-role key · webhook fail-closed |
| H5 (all routes) | ✅ fixed (code) | output caps on every free-form AI route (chat/agent/tg-chat/tg-agent/counselor); `generateObject` routes are schema-bounded |
| M5 (deps) | ✅ mostly | `npm audit fix`: **26 → 4** CVEs; remaining 4 need a breaking `exceljs` downgrade (flagged — owner decision) |
| verify | ✅ | tsc clean · **107/107** vitest pass |
| H1 | ✅ fixed (SQL) | `0020`: `get_public_profile` strips contact PII (email/phone/linkedin/github/portfolio) |
| H4 | ✅ fixed (SQL+code) | `0020`: Postgres `check_rate_limit` + `rate_limits` table; applied to `/api/search` (20 req / 10 s) |
| M4 | ✅ fixed (code) | email tokens support expiry; unsubscribe links now 90-day (calendar feed intentionally long-lived) |
| M7 | ✅ fixed (code) | `/api/ai`, `realtime/token`, `voice/transcribe`, `tg/voice/transcribe` no longer leak raw provider error bodies |
| L3 | ✅ fixed (SQL+code) | atomic `award_bonus_credits` RPC; referral now dedups BEFORE crediting (was double-crediting before the dedup check) |
| L4/B-4 | ✅ fixed (code) | Stripe webhook now mirrors subscription state into `entrium.subscriptions` (admin "who paid" no longer blind) |
| L5 | ✅ fixed (code) | recommender upload: re-stat stored object + content-type allow-list, reject/delete spoofed files |
| verify | ✅ | tsc clean · **107/107** vitest pass |

### Remaining (owner-dependent or low severity)
| ID | Why not auto-applied |
|---|---|
| 🟠 H6 (CSP `unsafe-eval`/nonce) | High blast radius — dropping `unsafe-eval` / moving to nonce can break the app; must be tested on a **preview deploy** first. Exact change documented in the H6 finding above. |
| 🟠 H2 (full identity redesign) | Architectural (immutable `telegram_id` identity). The **practical** takeover path is already closed (CSPRNG codes C5 + replay window M2 + webhook fail-closed L1). |
| 🟡 M8 (Telegram login by `telegram_id`) | The legacy widget login flow is UI-disabled; timing fix shipped (M3). Full lookup-by-id is a smaller follow-up. |
| ⚪ L2 / B-2 (referral self-farming) | Product-policy decision — require a verified payment before crediting a referral, or cap lifetime referral bonus. (L3, L4/B-4, L5 are now fixed.) |

## Scorecard (after)

| Severity | Before | Fixed | Remaining |
|---|---|---|---|
| 🔴 Critical | 3 | **3** | 0 |
| 🟠 High | 8 | 6 (+H2 mitigated) | H6, H2-redesign |
| 🟡 Medium | 8 | 6 | M6 (mostly addressed), M8 |
| ⚪ Low | 5 | 4 | 1 |
| 📦 Dep CVEs | 26 | 22 | 4 (need breaking `exceljs` bump) |

All changes verified: `tsc --noEmit` clean, **107/107** vitest pass. No deploy performed.

> ⚠️ **Deploy order for C3:** deploy the app code (`rate-limit.ts`) **first**, then apply `0020` to prod. Applying the SQL before the code is live would double-count and lock free users out early.

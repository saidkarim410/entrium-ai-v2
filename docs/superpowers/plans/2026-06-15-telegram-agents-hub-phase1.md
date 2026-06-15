# Telegram Agents Hub — Phase 1 (каркас хаба) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Telegram Mini App at `/tg` inside `entrium-ai-v2` — an animated, brand-v2 hub of all 12 existing AI agents, authenticated by Telegram `initData`, streaming real Claude answers with quota + profile context.

**Architecture:** New public route `/tg` (hub) + `/tg/agent/[slug]` (compact chat). A new `POST /api/tg/chat` mirrors the existing `/api/chat` but authenticates via Telegram `initData` (HMAC) instead of a Supabase cookie session — because cookies are unreliable inside Telegram's in-app webview. It resolves the Telegram user → an `entrium.profiles` row (auto-provisioning an auth user on first launch), enforces the same rate limit, and streams via `result.toUIMessageStreamResponse()`. The UI reuses v2 brand primitives (`Aurora`, `brand-rule`, `card-hover`, `font-display`, `--brand-red`) and the existing i18n dict.

**Tech Stack:** Next.js 16 App Router (Turbopack), TypeScript strict, Vercel AI SDK v6 (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/react`), Supabase (admin client), Tailwind v4 + shadcn, lucide-react, vitest + playwright.

---

## Pre-flight: verified contracts (read before starting)

These are the exact contracts this plan depends on (confirmed by reading the codebase):

- **`/api/chat`** body = `{ tool, messages }`; streams via `streamText({ model, system, messages: await convertToModelMessages(ui) }).toUIMessageStreamResponse()`. Auth = `getCurrentUser()` (cookie). We do NOT reuse its auth — we mirror the **webhook's** admin-client data fetch instead.
- **Models:** `models.claudeSonnet` (`claude-sonnet-4-5-20250929`), `models.claudeHaiku` (`claude-haiku-4-5-20251001`) from `@/lib/ai`.
- **Prompts:** `SYSTEM_PROMPTS[tool]` + `type ToolKey` from `@/lib/ai/prompts` (13 keys incl. `counselor`).
- **Rate limit:** `checkUsage(userId): Promise<{allowed, remaining, tier:"free"|"pro", bonus, reason?}>`, `recordUsage({userId, tool, model, inputTokens, outputTokens, costUsd})`, `consumeBonus(userId)`, `FREE_DAILY_LIMIT` from `@/lib/rate-limit`.
- **Admin DB:** `import { supabaseAdmin } from "@/lib/supabase/admin"` — singleton, schema `entrium`, RLS-bypass, has `.auth.admin.createUser(...)`.
- **Context builders (admin path, same as webhook):** `profileToContextBlock`, `EMPTY_PROFILE`, `type ApplicantProfile` from `@/lib/applicant/types`; `applicationsToContextBlock` from `@/lib/applications/types`; `languageInstruction(locale)` from `@/lib/ai/language`.
- **Env:** `import { env, telegramEnabled } from "@/lib/env"` → `env.TELEGRAM_BOT_TOKEN`, `env.TELEGRAM_WEBHOOK_SECRET`; `telegramEnabled()` checks token only.
- **Telegram lib:** `@/lib/telegram` exports `sendTelegramMessage`, `sendTelegramAction`, `setTelegramWebhook`, `aiToTelegramHtml`, `generateLinkCode`. Internal `callBotApi(method, body)`. NO menu-button helper yet (we add one).
- **i18n (server):** `getLocale()`, `getT(): Promise<Dict>` from `@/lib/i18n/server`; `dict`, `type Dict`, `type Locale` from `@/lib/i18n/dict`. `dict.<loc>.tools.<key>` = `{ title, desc }` for the 12 tools (no `counselor`).
- **Animations:** `Aurora`, `Reveal`, `Typewriter` from `@/components/landing/animations`; `EntriumLogo` from `@/components/landing/entrium-logo`. Markdown renderer: `@/components/markdown` → `Markdown`.
- **Auth gating:** `src/proxy.ts:37` matcher (negative-lookahead). `/tg` & `/api/tg` are not in `PROTECTED_PREFIXES` so they don't redirect, but still hit `updateSession`. We add `tg|api/tg` to the matcher exclusion (Option A — same as `api/telegram/webhook`).
- **Tests:** unit in `tests/**/*.test.ts` (vitest, `globals:false`, mock `@/lib/supabase/admin`, dynamic-import SUT after mock). e2e in `e2e/*.spec.ts` (playwright, `baseURL = BASE_URL ?? https://entrium-ai-v2.vercel.app`).

---

## File structure (created/modified in Phase 1)

```
supabase/migrations/0010_add_telegram_user_id.sql      CREATE  — telegram_user_id column
src/lib/telegram/init-data.ts                          CREATE  — initData HMAC validator (pure)
src/lib/telegram/resolve-user.ts                       CREATE  — tg user → profile id (admin)
src/lib/telegram/webapp.ts                             CREATE  — client useTelegram() hook + types
src/lib/agents/registry.ts                             CREATE  — 12-agent registry
src/app/api/tg/chat/route.ts                           CREATE  — initData-auth streaming chat
src/app/tg/layout.tsx                                  CREATE  — Telegram SDK script + wrapper
src/app/tg/page.tsx                                    CREATE  — hub (server component)
src/app/tg/agent/[slug]/page.tsx                       CREATE  — agent screen (server)
src/components/tg/tg-ready.tsx                          CREATE  — client WebApp init
src/components/tg/agent-chat.tsx                        CREATE  — client chat (useChat → /api/tg/chat)
src/lib/telegram.ts                                    MODIFY  — add setChatMenuButton()
src/proxy.ts                                           MODIFY  — matcher excludes tg|api/tg
scripts/set-tg-menu-button.mjs                         CREATE  — one-off bot menu-button setup
tests/telegram-init-data.test.ts                       CREATE  — validator unit tests
tests/telegram-resolve-user.test.ts                    CREATE  — resolver unit tests
tests/agents-registry.test.ts                          CREATE  — registry unit tests
e2e/tg-hub.spec.ts                                     CREATE  — /tg smoke + 401 check
```

---

## Task 1: DB migration — `telegram_user_id`

**Files:**
- Create: `supabase/migrations/0010_add_telegram_user_id.sql`

> Note: confirm the next migration number by listing `supabase/migrations/`. Use the next free index (the `0010_` here is a placeholder ordinal — rename to match).

- [ ] **Step 1: Write the migration**

```sql
-- Add a stable Telegram user id to profiles for Mini App auth.
-- (telegram_chat_id stays for the bot DM flow; user_id is the stable identity.)
alter table entrium.profiles
  add column if not exists telegram_user_id bigint;

-- Many rows are null (web-only users); unique only among non-null.
create unique index if not exists profiles_telegram_user_id_key
  on entrium.profiles (telegram_user_id)
  where telegram_user_id is not null;
```

- [ ] **Step 2: Apply it**

Apply against Supabase project `zcbbpqfdyqavdubzrgaf` (SQL editor or `supabase db push`). Verify:

Run (needs `$SUPABASE_ACCESS_TOKEN`):
```bash
curl -sS -X POST "https://api.supabase.com/v1/projects/zcbbpqfdyqavdubzrgaf/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" \
  -d '{"query":"select column_name from information_schema.columns where table_schema=''entrium'' and table_name=''profiles'' and column_name=''telegram_user_id'';"}'
```
Expected: one row `telegram_user_id`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0010_add_telegram_user_id.sql
git commit -m "feat(tg): add profiles.telegram_user_id for Mini App auth"
```

---

## Task 2: initData validator (TDD)

**Files:**
- Create: `src/lib/telegram/init-data.ts`
- Test: `tests/telegram-init-data.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest"
import crypto from "node:crypto"
import { validateInitData } from "@/lib/telegram/init-data"

function signInitData(fields: Record<string, string>, botToken: string): string {
  const dcs = Object.entries(fields).map(([k, v]) => `${k}=${v}`).sort().join("\n")
  const secret = crypto.createHmac("sha256", "WebAppData").update(botToken).digest()
  const hash = crypto.createHmac("sha256", secret).update(dcs).digest("hex")
  const p = new URLSearchParams(fields)
  p.set("hash", hash)
  return p.toString()
}

const TOKEN = "123456:TESTTOKEN"
const NOW = 1_700_000_000

describe("validateInitData", () => {
  it("accepts a correctly signed payload", () => {
    const initData = signInitData(
      { auth_date: String(NOW), user: JSON.stringify({ id: 42, username: "sa" }) },
      TOKEN,
    )
    const r = validateInitData(initData, TOKEN, 86_400, NOW + 10)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.user.id).toBe(42)
  })

  it("rejects a tampered hash", () => {
    const initData = signInitData({ auth_date: String(NOW), user: JSON.stringify({ id: 42 }) }, TOKEN)
    const r = validateInitData(initData.replace(/hash=[0-9a-f]+/, "hash=deadbeef"), TOKEN, 86_400, NOW + 10)
    expect(r.ok).toBe(false)
  })

  it("rejects an expired payload", () => {
    const initData = signInitData({ auth_date: String(NOW), user: JSON.stringify({ id: 42 }) }, TOKEN)
    const r = validateInitData(initData, TOKEN, 3_600, NOW + 7_200)
    expect(r).toMatchObject({ ok: false, reason: "expired" })
  })
})
```

- [ ] **Step 2: Run it — expect FAIL**

Run: `npx vitest run tests/telegram-init-data.test.ts`
Expected: FAIL — `Cannot find module '@/lib/telegram/init-data'`.

- [ ] **Step 3: Implement the validator**

```ts
import crypto from "node:crypto"

export type TelegramUser = {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  language_code?: string
}

export type InitDataResult =
  | { ok: true; user: TelegramUser; authDate: number }
  | { ok: false; reason: "missing" | "bad_hash" | "expired" | "no_user" }

const DEFAULT_MAX_AGE = 24 * 60 * 60

export function validateInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds: number = DEFAULT_MAX_AGE,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): InitDataResult {
  if (!initData || !botToken) return { ok: false, reason: "missing" }

  const params = new URLSearchParams(initData)
  const hash = params.get("hash")
  if (!hash) return { ok: false, reason: "missing" }
  params.delete("hash")

  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n")

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest()
  const computed = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex")

  if (
    computed.length !== hash.length ||
    !crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash))
  ) {
    return { ok: false, reason: "bad_hash" }
  }

  const authDate = Number(params.get("auth_date") ?? 0)
  if (!authDate || nowSeconds - authDate > maxAgeSeconds) return { ok: false, reason: "expired" }

  const userRaw = params.get("user")
  if (!userRaw) return { ok: false, reason: "no_user" }
  let user: TelegramUser
  try {
    user = JSON.parse(userRaw) as TelegramUser
  } catch {
    return { ok: false, reason: "no_user" }
  }
  if (!user?.id) return { ok: false, reason: "no_user" }

  return { ok: true, user, authDate }
}
```

- [ ] **Step 4: Run it — expect PASS**

Run: `npx vitest run tests/telegram-init-data.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/telegram/init-data.ts tests/telegram-init-data.test.ts
git commit -m "feat(tg): add Telegram initData HMAC validator"
```

---

## Task 3: Telegram user resolver (TDD)

**Files:**
- Create: `src/lib/telegram/resolve-user.ts`
- Test: `tests/telegram-resolve-user.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest"

const maybeSingle = vi.fn()
const eqUpdate = vi.fn().mockResolvedValue({ data: null, error: null })
const createUser = vi.fn()

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle }) }),
      update: () => ({ eq: eqUpdate }),
    }),
    auth: { admin: { createUser } },
  },
}))

const { resolveTelegramUser } = await import("@/lib/telegram/resolve-user")

beforeEach(() => {
  maybeSingle.mockReset()
  createUser.mockReset()
  eqUpdate.mockClear()
})

describe("resolveTelegramUser", () => {
  it("returns the existing profile id when linked by telegram_user_id", async () => {
    maybeSingle.mockResolvedValueOnce({
      data: { id: "uuid-1", tier: "pro", applicant_data: null, language: "en" },
      error: null,
    })
    const r = await resolveTelegramUser({ id: 7 })
    expect(r.userId).toBe("uuid-1")
    expect(r.tier).toBe("pro")
    expect(createUser).not.toHaveBeenCalled()
  })

  it("provisions a new auth user when none is linked", async () => {
    maybeSingle
      .mockResolvedValueOnce({ data: null, error: null }) // by telegram_user_id
      .mockResolvedValueOnce({ data: null, error: null }) // by telegram_chat_id
    createUser.mockResolvedValueOnce({ data: { user: { id: "uuid-new" } }, error: null })
    const r = await resolveTelegramUser({ id: 8, username: "z" })
    expect(createUser).toHaveBeenCalledOnce()
    expect(r.userId).toBe("uuid-new")
    expect(r.tier).toBe("free")
  })
})
```

- [ ] **Step 2: Run it — expect FAIL**

Run: `npx vitest run tests/telegram-resolve-user.test.ts`
Expected: FAIL — `Cannot find module '@/lib/telegram/resolve-user'`.

- [ ] **Step 3: Implement the resolver**

```ts
import { supabaseAdmin } from "@/lib/supabase/admin"
import type { TelegramUser } from "./init-data"

export type ResolvedTgUser = {
  userId: string
  tier: "free" | "pro"
  applicantData: unknown | null
  language: string
}

const COLS = "id, tier, applicant_data, language, telegram_user_id, telegram_chat_id"

export async function resolveTelegramUser(tg: TelegramUser): Promise<ResolvedTgUser> {
  const tgId = tg.id

  // 1) Already linked by stable telegram_user_id.
  const byUserId = await supabaseAdmin
    .from("profiles").select(COLS).eq("telegram_user_id", tgId).maybeSingle()
  let profile = byUserId.data

  // 2) Legacy link: bot DM flow stored telegram_chat_id == user id (private chats).
  if (!profile) {
    const byChat = await supabaseAdmin
      .from("profiles").select(COLS).eq("telegram_chat_id", String(tgId)).maybeSingle()
    profile = byChat.data
    if (profile) {
      await supabaseAdmin.from("profiles").update({ telegram_user_id: tgId }).eq("id", profile.id as string)
    }
  }

  // 3) First-ever launch: provision an auth user (trigger creates the profile row).
  if (!profile) {
    const fullName =
      [tg.first_name, tg.last_name].filter(Boolean).join(" ") || tg.username || `tg${tgId}`
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: `tg${tgId}@telegram.entrium.local`,
      email_confirm: true,
      user_metadata: { full_name: fullName, telegram_user_id: tgId },
    })
    if (error || !created?.user) {
      throw new Error(`tg_provision_failed: ${error?.message ?? "no user returned"}`)
    }
    const userId = created.user.id
    await supabaseAdmin
      .from("profiles")
      .update({ telegram_user_id: tgId, telegram_username: tg.username ?? null })
      .eq("id", userId)
    return { userId, tier: "free", applicantData: null, language: "ru" }
  }

  return {
    userId: profile.id as string,
    tier: (profile.tier as "free" | "pro") ?? "free",
    applicantData: profile.applicant_data ?? null,
    language: (profile.language as string) ?? "ru",
  }
}
```

- [ ] **Step 4: Run it — expect PASS**

Run: `npx vitest run tests/telegram-resolve-user.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/telegram/resolve-user.ts tests/telegram-resolve-user.test.ts
git commit -m "feat(tg): resolve Telegram user to profile (auto-provision)"
```

---

## Task 4: Agents registry (TDD)

**Files:**
- Create: `src/lib/agents/registry.ts`
- Test: `tests/agents-registry.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest"
import { AGENTS, findAgent } from "@/lib/agents/registry"

describe("agents registry", () => {
  it("has 12 unique agents", () => {
    expect(AGENTS).toHaveLength(12)
    expect(new Set(AGENTS.map((a) => a.slug)).size).toBe(12)
  })

  it("findAgent resolves a known slug and rejects unknown", () => {
    expect(findAgent("essay")?.slug).toBe("essay")
    expect(findAgent("nope")).toBeUndefined()
  })

  it("every agent has a non-empty placeholder", () => {
    for (const a of AGENTS) expect(a.placeholder.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run it — expect FAIL**

Run: `npx vitest run tests/agents-registry.test.ts`
Expected: FAIL — `Cannot find module '@/lib/agents/registry'`.

- [ ] **Step 3: Implement the registry**

```ts
import type { Dict } from "@/lib/i18n/dict"
import {
  Target, Sparkles, PencilLine, Wand2, Mic, GraduationCap,
  Award, CalendarRange, FileText, FileUser, Calculator, ShieldCheck,
  type LucideIcon,
} from "lucide-react"

// Slugs are exactly the keys present in dict.tools (12). They are a subset of
// ToolKey, so they are valid `tool` values for /api/tg/chat.
export type AgentSlug = keyof Dict["tools"]

export type Agent = {
  slug: AgentSlug
  icon: LucideIcon
  placeholder: string
  isNew?: boolean
  proOnly?: boolean
}

export const AGENTS: Agent[] = [
  { slug: "analyzer", icon: Target, placeholder: "Я хочу в TU Munich и ETH Zurich на бакалавра CS — оцени шансы" },
  { slug: "profile", icon: Sparkles, placeholder: "Расскажи о себе: класс, GPA, тесты, цель" },
  { slug: "essay", icon: PencilLine, placeholder: "Вставь черновик эссе…" },
  { slug: "humanizer", icon: Wand2, placeholder: "Вставь «роботизированный» текст…" },
  { slug: "interview", icon: Mic, placeholder: "Готовлюсь к интервью в Stanford. Начнём?" },
  { slug: "university", icon: GraduationCap, placeholder: "GPA 4.2, IELTS 6.5, бюджет $30k, Data Science — подбери вузы" },
  { slug: "scholarship", icon: Award, placeholder: "Узбекистан, GPA 4.5, магистратура CS в Германии — стипендии" },
  { slug: "tracker", icon: CalendarRange, placeholder: "Подача февраль 2027, 11 класс — составь план" },
  { slug: "recommendation", icon: FileText, placeholder: "Учитель физики — опиши проект ученика для письма" },
  { slug: "cv", icon: FileUser, placeholder: "Сделай CV для admissions: опыт, проекты, награды" },
  { slug: "cost", icon: Calculator, placeholder: "Сколько стоит учёба в Канаде и как снизить расходы?" },
  { slug: "reviewer", icon: ShieldCheck, placeholder: "Проверь мою заявку перед подачей — будь строгим" },
]

export function findAgent(slug: string): Agent | undefined {
  return AGENTS.find((a) => a.slug === slug)
}
```

> If TS complains that a lucide icon name does not exist, swap it for any present outline icon (verify against `node_modules/lucide-react`). `CalendarRange`, `FileUser`, `ShieldCheck`, `PencilLine`, `Wand2` all exist in lucide-react ≥1.x.

- [ ] **Step 4: Run it — expect PASS**

Run: `npx vitest run tests/agents-registry.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/agents/registry.ts tests/agents-registry.test.ts
git commit -m "feat(tg): add 12-agent registry for the hub"
```

---

## Task 5: `/api/tg/chat` route (initData-authenticated streaming)

**Files:**
- Create: `src/app/api/tg/chat/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { streamText, convertToModelMessages, type UIMessage } from "ai"
import { z } from "zod"
import { models } from "@/lib/ai"
import { SYSTEM_PROMPTS, type ToolKey } from "@/lib/ai/prompts"
import {
  searchUniversities, searchScholarships,
  formatUniversitiesContext, formatScholarshipsContext,
} from "@/lib/ai/rag"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { checkUsage, recordUsage, consumeBonus } from "@/lib/rate-limit"
import { profileToContextBlock, EMPTY_PROFILE, type ApplicantProfile } from "@/lib/applicant/types"
import { applicationsToContextBlock } from "@/lib/applications/types"
import { languageInstruction } from "@/lib/ai/language"
import { env, telegramEnabled } from "@/lib/env"
import { validateInitData } from "@/lib/telegram/init-data"
import { resolveTelegramUser } from "@/lib/telegram/resolve-user"
import type { Locale } from "@/lib/i18n/dict"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const TOOL_KEYS = [
  "profile", "analyzer", "tracker", "essay", "humanizer", "interview",
  "scholarship", "university", "recommendation", "cv", "cost", "reviewer", "counselor",
] as const

const bodySchema = z.object({
  tool: z.enum(TOOL_KEYS),
  messages: z.array(z.any()),
})

function lastUserText(messages: UIMessage[]): string {
  const last = [...messages].reverse().find((m) => m.role === "user")
  if (!last) return ""
  return last.parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { text: string }).text)
    .join(" ")
}

export async function POST(req: Request) {
  if (!telegramEnabled()) return Response.json({ error: "telegram_disabled" }, { status: 503 })

  const initData = req.headers.get("x-telegram-init-data") ?? ""
  const verdict = validateInitData(initData, env.TELEGRAM_BOT_TOKEN)
  if (!verdict.ok) return Response.json({ error: "unauthorized", reason: verdict.reason }, { status: 401 })

  let parsed: z.infer<typeof bodySchema>
  try {
    parsed = bodySchema.parse(await req.json())
  } catch {
    return Response.json({ error: "invalid_input" }, { status: 400 })
  }
  const tool = parsed.tool as ToolKey
  const uiMessages = parsed.messages as UIMessage[]

  const resolved = await resolveTelegramUser(verdict.user)

  const usage = await checkUsage(resolved.userId)
  if (!usage.allowed) return Response.json({ error: "limit_reached", tier: usage.tier }, { status: 429 })

  const applicant = (resolved.applicantData as ApplicantProfile | null) ?? EMPTY_PROFILE
  const profileBlock = profileToContextBlock(applicant)

  const { data: appsRows } = await supabaseAdmin
    .from("applications").select("*").eq("user_id", resolved.userId)
    .order("deadline", { ascending: true, nullsFirst: false })
  const appsBlock = applicationsToContextBlock((appsRows ?? []) as never[])

  let system: string = SYSTEM_PROMPTS[tool]
  if (profileBlock) system += `\n\n---\n\n${profileBlock}`
  if (appsBlock) system += `\n\n---\n\n${appsBlock}`
  system += `\n\n---\n\n${languageInstruction((resolved.language as Locale) ?? "ru")}`

  if (tool === "university" || tool === "scholarship") {
    try {
      const q = lastUserText(uiMessages)
      if (q && tool === "university") {
        const unis = await searchUniversities(q, 12)
        if (unis?.length) system += `\n\n---\n\n${formatUniversitiesContext(unis)}`
      } else if (q) {
        const sch = await searchScholarships(q, 12)
        if (sch?.length) system += `\n\n---\n\n${formatScholarshipsContext(sch)}`
      }
    } catch (e) {
      console.error("tg rag failed", e)
    }
  }

  const isPro = usage.tier === "pro"
  const model = isPro ? models.claudeSonnet : models.claudeHaiku
  const modelId = isPro ? "claude-sonnet-4-5" : "claude-haiku-4-5"

  const result = streamText({
    model,
    system,
    messages: await convertToModelMessages(uiMessages),
    onFinish: async ({ usage: aiUsage }) => {
      await recordUsage({
        userId: resolved.userId,
        tool: `tg_${tool}`,
        model: modelId,
        inputTokens: aiUsage?.inputTokens ?? 0,
        outputTokens: aiUsage?.outputTokens ?? 0,
        costUsd: 0,
      })
      if (usage.tier === "free" && usage.remaining === 0 && usage.bonus > 0) {
        await consumeBonus(resolved.userId).catch(() => null)
      }
    },
  })

  return result.toUIMessageStreamResponse()
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `src/app/api/tg/chat/route.ts`. (If `searchUniversities`/`formatUniversitiesContext` signatures differ, align argument count with `src/lib/ai/rag.ts`.)

- [ ] **Step 3: Commit**

```bash
git add src/app/api/tg/chat/route.ts
git commit -m "feat(tg): add initData-authenticated streaming chat endpoint"
```

---

## Task 6: Make `/tg` + `/api/tg` public in the proxy

**Files:**
- Modify: `src/proxy.ts:37` (the matcher negative-lookahead)

- [ ] **Step 1: Edit the matcher**

Find the matcher string containing `api/telegram/webhook|`. Insert `api/tg|tg|` right after it. Resulting fragment:

```
...|api/cron|api/stripe/webhook|api/telegram/webhook|api/tg|tg|api/calendar\\.ics|...
```

This makes any `/tg/...` and `/api/tg/...` path skip `updateSession` entirely (no Supabase round-trip, no redirect) — exactly like the existing webhook exclusion.

- [ ] **Step 2: Verify locally**

Run: `npm run dev` then in another shell:
```bash
curl -sS -o /dev/null -w "%{http_code}\n" --max-redirs 0 http://localhost:3000/tg
```
Expected: `200` (renders, no 307 redirect to `/login`).

- [ ] **Step 3: Commit**

```bash
git add src/proxy.ts
git commit -m "feat(tg): exclude /tg and /api/tg from auth middleware"
```

---

## Task 7: Telegram WebApp client hook

**Files:**
- Create: `src/lib/telegram/webapp.ts`

- [ ] **Step 1: Write the hook**

```ts
"use client"
import { useEffect, useState } from "react"

export type TgWebApp = {
  initData: string
  colorScheme: "light" | "dark"
  expand?: () => void
  ready?: () => void
  themeParams?: Record<string, string>
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp }
  }
}

export function useTelegram() {
  const [webApp, setWebApp] = useState<TgWebApp | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const wa = window.Telegram?.WebApp ?? null
    if (wa) {
      wa.ready?.()
      wa.expand?.()
    }
    setWebApp(wa)
    setReady(true)
  }, [])

  return {
    webApp,
    ready,
    initData: webApp?.initData ?? "",
    colorScheme: webApp?.colorScheme ?? ("light" as const),
  }
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `npx tsc --noEmit` → expect no errors.
```bash
git add src/lib/telegram/webapp.ts
git commit -m "feat(tg): add useTelegram WebApp hook + window typing"
```

---

## Task 8: Mini App layout + Telegram SDK script

**Files:**
- Create: `src/app/tg/layout.tsx`
- Create: `src/components/tg/tg-ready.tsx`

- [ ] **Step 1: Write the TgReady client component**

```tsx
"use client"
import { useTelegram } from "@/lib/telegram/webapp"

export function TgReady() {
  useTelegram() // fires WebApp.ready()/expand() on mount
  return null
}
```

- [ ] **Step 2: Write the layout (loads the official Telegram SDK)**

```tsx
import type { Metadata } from "next"
import Script from "next/script"

export const metadata: Metadata = {
  title: "Entrium AI",
  robots: { index: false, follow: false },
}

export default function TgLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      <div className="min-h-dvh bg-background text-foreground">{children}</div>
    </>
  )
}
```

- [ ] **Step 3: Typecheck + commit**

Run: `npx tsc --noEmit` → expect no errors.
```bash
git add src/app/tg/layout.tsx src/components/tg/tg-ready.tsx
git commit -m "feat(tg): Mini App layout with Telegram SDK + ready hook"
```

---

## Task 9: Hub page (server component, brand v2)

**Files:**
- Create: `src/app/tg/page.tsx`

- [ ] **Step 1: Write the hub**

```tsx
import Link from "next/link"
import { getT } from "@/lib/i18n/server"
import { AGENTS } from "@/lib/agents/registry"
import { Aurora } from "@/components/landing/animations"
import { TgReady } from "@/components/tg/tg-ready"

export const dynamic = "force-dynamic"

export default async function TgHubPage() {
  const t = await getT()

  return (
    <main className="relative mx-auto max-w-md overflow-hidden px-4 pb-12 pt-5">
      <TgReady />
      <Aurora className="opacity-50" />

      <div className="brand-rule -mx-4 mb-4 h-[3px]" />

      <header className="relative mb-5">
        <p className="brand-eyebrow font-mono-label text-[var(--brand-red)]">AI ADMISSIONS COPILOT</p>
        <h1 className="font-display mt-2 text-3xl uppercase leading-[0.95]">
          <span className="text-[var(--brand-red)]">AI</span>-агенты
          <br />
          на поступление
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Выбери агента — он проведёт за руку</p>
      </header>

      <section className="relative grid grid-cols-2 gap-3">
        {AGENTS.map((a) => {
          const Icon = a.icon
          const meta = t.tools[a.slug]
          return (
            <Link
              key={a.slug}
              href={`/tg/agent/${a.slug}`}
              className="card-hover relative rounded-2xl border border-border bg-card p-3"
            >
              {a.isNew && (
                <span className="font-mono-label absolute right-2 top-2 rounded bg-[var(--brand-red)] px-1.5 py-0.5 text-white">
                  NEW
                </span>
              )}
              <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--brand-red-soft)] text-[var(--brand-red)]">
                <Icon className="h-5 w-5" />
              </span>
              <div className="mt-2 text-sm font-semibold leading-tight">{meta.title}</div>
              <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{meta.desc}</div>
            </Link>
          )
        })}
      </section>
    </main>
  )
}
```

- [ ] **Step 2: Verify build + render**

Run: `npm run build` → expect success.
Run `npm run dev`, open `http://localhost:3000/tg` in a browser → expect the red-rule header, "AI-агенты на поступление" headline, and a 2-column grid of 12 cards with red icon plates.

- [ ] **Step 3: Commit**

```bash
git add src/app/tg/page.tsx
git commit -m "feat(tg): brand-v2 agents hub page"
```

---

## Task 10: Agent chat screen

**Files:**
- Create: `src/app/tg/agent/[slug]/page.tsx`
- Create: `src/components/tg/agent-chat.tsx`

- [ ] **Step 1: Write the chat client component**

```tsx
"use client"
import { useMemo, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Markdown } from "@/components/markdown"
import { useTelegram } from "@/lib/telegram/webapp"
import type { AgentSlug } from "@/lib/agents/registry"

export function AgentChat({ tool, placeholder }: { tool: AgentSlug; placeholder: string }) {
  const { initData, ready } = useTelegram()

  if (!ready) return <div className="p-6 text-sm text-muted-foreground">Загрузка…</div>
  if (!initData)
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Открой это приложение через бота <b>@entriumleedbot</b>.
      </div>
    )

  return <AgentChatInner tool={tool} placeholder={placeholder} initData={initData} />
}

function AgentChatInner({
  tool,
  placeholder,
  initData,
}: {
  tool: AgentSlug
  placeholder: string
  initData: string
}) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/tg/chat",
        headers: { "x-telegram-init-data": initData },
        body: { tool },
      }),
    [initData, tool],
  )
  const { messages, sendMessage, status, error } = useChat({ transport })
  const [input, setInput] = useState("")
  const streaming = status === "submitted" || status === "streaming"

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-3 px-4 py-4">
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "text-right" : ""}>
            <div
              className={
                m.role === "user"
                  ? "inline-block rounded-2xl rounded-br-sm bg-[var(--brand-red)] px-3 py-2 text-left text-sm text-white"
                  : "rounded-2xl rounded-bl-sm bg-card px-3 py-2 text-sm"
              }
            >
              {m.parts
                .filter((p) => p.type === "text")
                .map((p, i) =>
                  m.role === "user" ? (
                    <span key={i}>{(p as { text: string }).text}</span>
                  ) : (
                    <Markdown key={i}>{(p as { text: string }).text}</Markdown>
                  ),
                )}
            </div>
          </div>
        ))}
        {streaming && (
          <div className="text-xs text-[var(--brand-red)]">
            печатает…<span className="brand-caret" />
          </div>
        )}
        {error && <div className="text-xs text-destructive">Ошибка. Попробуй ещё раз.</div>}
      </div>

      <form
        className="sticky bottom-0 flex gap-2 border-t border-border bg-background p-3"
        onSubmit={(e) => {
          e.preventDefault()
          const text = input.trim()
          if (!text) return
          sendMessage({ text })
          setInput("")
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={1}
          placeholder={placeholder}
          className="flex-1 resize-none rounded-xl border border-input bg-card px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={streaming}
          aria-label="Отправить"
          className="rounded-xl bg-[var(--brand-red)] px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          →
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Write the agent page (server)**

```tsx
import Link from "next/link"
import { notFound } from "next/navigation"
import { getT } from "@/lib/i18n/server"
import { findAgent } from "@/lib/agents/registry"
import { AgentChat } from "@/components/tg/agent-chat"

export const dynamic = "force-dynamic"

export default async function TgAgentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const agent = findAgent(slug)
  if (!agent) notFound()

  const t = await getT()
  const meta = t.tools[agent.slug]

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/90 px-3 py-2 backdrop-blur">
        <Link href="/tg" aria-label="Назад" className="text-lg text-muted-foreground">
          ←
        </Link>
        <div>
          <div className="text-sm font-semibold leading-none">{meta.title}</div>
          <div className="text-[11px] text-muted-foreground">{meta.desc}</div>
        </div>
      </header>
      <AgentChat tool={agent.slug} placeholder={agent.placeholder} />
    </main>
  )
}
```

- [ ] **Step 3: Build + commit**

Run: `npm run build` → expect success.
```bash
git add "src/app/tg/agent/[slug]/page.tsx" src/components/tg/agent-chat.tsx
git commit -m "feat(tg): agent chat screen wired to /api/tg/chat"
```

---

## Task 11: Bot menu-button setup

**Files:**
- Modify: `src/lib/telegram.ts` (add `setChatMenuButton`)
- Create: `scripts/set-tg-menu-button.mjs`

- [ ] **Step 1: Add the helper to `src/lib/telegram.ts`**

Add this exported function (it uses the existing internal `callBotApi`):

```ts
export async function setChatMenuButton(
  url: string,
  text = "Открыть Entrium AI",
): Promise<TelegramSendResult> {
  return callBotApi("setChatMenuButton", {
    menu_button: { type: "web_app", text, web_app: { url } },
  })
}
```

- [ ] **Step 2: Write the one-off script**

```js
// Run once to point the bot's menu button at the Mini App.
// Usage: TELEGRAM_BOT_TOKEN=... TG_MINIAPP_URL=https://entrium-ai-v2.vercel.app/tg node scripts/set-tg-menu-button.mjs
const token = process.env.TELEGRAM_BOT_TOKEN
const url = process.env.TG_MINIAPP_URL ?? "https://entrium-ai-v2.vercel.app/tg"
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is required")
  process.exit(1)
}
const res = await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    menu_button: { type: "web_app", text: "Открыть Entrium AI", web_app: { url } },
  }),
})
console.log(res.status, await res.text())
```

- [ ] **Step 3: Run it after deploy + commit**

After the `/tg` route is deployed to production, run:
```bash
TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN node scripts/set-tg-menu-button.mjs
```
Expected: `200 {"ok":true,"result":true}`. (BotFather: the Mini App domain must be the production HTTPS URL.)

```bash
git add src/lib/telegram.ts scripts/set-tg-menu-button.mjs
git commit -m "feat(tg): bot menu-button → Mini App launcher"
```

---

## Task 12: e2e smoke test for `/tg`

**Files:**
- Create: `e2e/tg-hub.spec.ts`

- [ ] **Step 1: Write the e2e spec**

```ts
import { test, expect } from "@playwright/test"

test.describe("Telegram Mini App hub", () => {
  test("/tg renders and is public (no /login redirect)", async ({ page }) => {
    const res = await page.goto("/tg")
    expect(res?.status()).toBeLessThan(400)
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/агенты/i)
  })

  test("/api/tg/chat rejects requests without initData (401)", async ({ request }) => {
    const res = await request.post("/api/tg/chat", {
      data: { tool: "essay", messages: [] },
    })
    expect(res.status()).toBe(401)
  })
})
```

- [ ] **Step 2: Run against local dev**

Run: `npm run dev` (separate shell), then:
```bash
BASE_URL=http://localhost:3000 npx playwright test e2e/tg-hub.spec.ts
```
Expected: 2 passed. (Note: the 401 test requires `TELEGRAM_BOT_TOKEN` set in the dev env so `telegramEnabled()` is true; otherwise the route returns 503. Set it in `.env.local`.)

- [ ] **Step 3: Commit**

```bash
git add e2e/tg-hub.spec.ts
git commit -m "test(tg): e2e smoke for hub + chat auth"
```

---

## Task 13: Full verification + ship

- [ ] **Step 1: Run the whole unit suite**

Run: `npm run test`
Expected: all green, including the 3 new TG test files.

- [ ] **Step 2: Run the project QA smoke**

Run: `node scripts/qa-test.mjs`
Expected: still 35/35 (we added routes, didn't change existing ones).

- [ ] **Step 3: Lint + build**

Run: `npm run lint && npm run build`
Expected: no errors.

- [ ] **Step 4: Deploy + manual Telegram check**

Push to `main` (auto-deploys to Vercel). Then:
1. Run `scripts/set-tg-menu-button.mjs` (Task 11 Step 3).
2. Open `@entriumleedbot` in Telegram → tap the menu button → the hub opens.
3. Tap an agent (e.g. "Essay Coach") → send a message → confirm a streaming Claude reply appears with the red "печатает…" caret.
4. Confirm a brand-new Telegram user (not linked on the site) can still chat (auto-provision works).

- [ ] **Step 5: Final commit (if any tweaks)**

```bash
git add -A
git commit -m "chore(tg): phase 1 hub verified end-to-end"
```

---

## Out of scope (later phases — separate plans)

- **Phase 2:** missions in the hub (`/api/agent` NDJSON progress UI).
- **Phase 3:** Speaking-коуч (voice agent) — new `SYSTEM_PROMPTS.speaking` + dict keys + voice stack.
- **Phase 4:** Летние программы / pre-college — `SYSTEM_PROMPTS.summerPrograms` + `web_search`.
- **Phase 5:** polish — Telegram dark-theme sync, haptics, PostHog, Pro upsell screens.

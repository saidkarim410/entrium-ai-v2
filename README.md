# Entrium AI v2

AI-powered university admissions platform — 8 AI tools, 1500+ universities (QS), 300+ scholarships.

## Stack

- **Next.js 16** (App Router) + TypeScript strict
- **Tailwind CSS v4** + shadcn/ui
- **Supabase** (Auth + Postgres + pgvector)
- **Vercel AI SDK v6** (Claude Sonnet 4.5 + Haiku 4.5 + GPT-4o)
- **Stripe** (subscriptions — Pro tier)
- **Vercel Fluid Compute** (deploy)

## Local development

```bash
npm install
cp .env.example .env.local  # fill in keys
npm run dev
```

Open http://localhost:3000

## Database setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. In SQL Editor, run `supabase/migrations/0001_initial_schema.sql`
3. Copy `Project URL` and `service_role` key into `.env.local`

## Architecture

```
src/
├── app/
│   ├── (auth)/         # login, signup pages + actions
│   ├── (app)/          # authenticated app (dashboard, tools)
│   ├── api/chat/       # AI streaming endpoint
│   └── page.tsx        # landing page
├── components/
│   └── ui/             # shadcn components
├── lib/
│   ├── ai/             # AI SDK config + system prompts
│   ├── supabase/       # server, admin, middleware clients
│   ├── env.ts          # typed env access
│   └── rate-limit.ts   # daily quota tracking in DB
└── proxy.ts            # Next.js 16 proxy (renamed from middleware)
```

## AI Tools

1. **Profile** — диагностика академического профиля
2. **Analyzer** — анализ шансов поступления
3. **Tracker** — персональный план поступления
4. **University** — подбор универов из QS базы
5. **Scholarship** — подбор стипендий
6. **Essay Coach** — анализ эссе
7. **Humanizer** — превращает AI-текст в живой
8. **Interview Trainer** — симулятор admission interview

## Tier limits

- **Free:** 5 запросов/день · Claude Haiku 4.5 · max 2k токенов
- **Pro:** unlimited · Claude Sonnet 4.5 · max 64k токенов
- **Referral bonus:** +10 запросов за приглашённого друга

## Deploy

```bash
vercel --prod
```

Or push to `main` branch on GitHub — Vercel auto-deploys.

-- 0027 — product analytics events (CTO TZ §5 «Аналитика и диагностика»).
--
-- First-party, PII-free event log: what a student did (onboarding started /
-- completed, pricing viewed, checkout started, mission finished, plan saved…).
-- Metrics that can be derived from existing tables (first useful result, saved
-- applications/tasks, 7/30-day return) are NOT duplicated here — the admin
-- funnel page reads them from tool_runs / applications / plan_tasks / usage_events.

create table if not exists entrium.product_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references entrium.profiles(id) on delete cascade,   -- null for anonymous
  event text not null,                                             -- snake_case, see src/lib/analytics/events.ts
  props jsonb not null default '{}'::jsonb,                         -- small, non-personal
  source text not null default 'web' check (source in ('web', 'tg', 'server')),
  created_at timestamptz not null default now()
);

create index if not exists entrium_product_events_event_idx on entrium.product_events (event, created_at desc);
create index if not exists entrium_product_events_user_idx on entrium.product_events (user_id, created_at desc);

alter table entrium.product_events enable row level security;
-- Written only by the server (service role); admins read through the admin console.
drop policy if exists "product_events_admin_read" on entrium.product_events;
create policy "product_events_admin_read" on entrium.product_events for select
  using (exists (select 1 from entrium.profiles p where p.id = auth.uid() and p.role = 'admin'));

grant select on entrium.product_events to authenticated;
grant select, insert, delete on entrium.product_events to service_role;

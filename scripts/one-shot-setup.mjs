/**
 * One-shot setup — applies migrations, sets Vercel env vars, registers Telegram webhook.
 * Run via: node scripts/one-shot-setup.mjs <SUPABASE_TOKEN> <VERCEL_TOKEN> [TG_BOT_TOKEN]
 *
 * Tokens passed as CLI args so we never hit shell history env exposure.
 */
import crypto from "node:crypto"

const [, , supabaseToken, vercelToken, tgBotTokenArg] = process.argv

if (!supabaseToken?.startsWith("sbp_")) {
  console.error("Usage: node one-shot-setup.mjs <SUPABASE_TOKEN sbp_...> <VERCEL_TOKEN> [TG_BOT_TOKEN]")
  process.exit(1)
}

const SUPABASE_REF = "zcbbpqfdyqavdubzrgaf"
const SITE_URL = "https://entrium-ai-v2.vercel.app"
const VERCEL_PROJECT_NAME = "entrium-ai-v2"
const TG_BOT_TOKEN = tgBotTokenArg ?? "8781529396:AAFUCY0WzeTwI5Ax57yfjxyQg7US0RcrrgM"

const tgWebhookSecret = crypto.randomBytes(32).toString("base64url").slice(0, 32)
const cronSecret = crypto.randomBytes(32).toString("base64url").slice(0, 32)
const emailTokenSecret = crypto.randomBytes(48).toString("base64url").slice(0, 48)

const MIGRATIONS = [
  { name: "0006_applications", sql: `create table if not exists entrium.applications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references entrium.profiles(id) on delete cascade,
  university_name text not null,
  university_country text,
  program text,
  level text check (level is null or level in ('Bachelor','Master','PhD','MBA','Foundation')),
  round text,
  deadline date,
  status text not null default 'planning'
    check (status in ('planning','in_progress','submitted','interview','accepted','rejected','waitlisted','deferred','withdrew')),
  priority text not null default 'match' check (priority in ('reach','match','safety')),
  application_fee_usd numeric(10, 2),
  notes text,
  checklist jsonb not null default '[]'::jsonb,
  result_decision text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists entrium_applications_user_idx on entrium.applications(user_id, deadline asc nulls last);
create index if not exists entrium_applications_user_status_idx on entrium.applications(user_id, status);
create or replace function entrium.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists trg_applications_updated_at on entrium.applications;
create trigger trg_applications_updated_at before update on entrium.applications for each row execute function entrium.set_updated_at();
alter table entrium.applications enable row level security;
drop policy if exists applications_owner_all on entrium.applications;
create policy applications_owner_all on entrium.applications for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant all on entrium.applications to authenticated, service_role;` },
  { name: "0007_telegram", sql: `alter table entrium.profiles
  add column if not exists telegram_chat_id text,
  add column if not exists telegram_username text,
  add column if not exists telegram_link_code text,
  add column if not exists telegram_link_expires timestamptz;
create unique index if not exists profiles_telegram_chat_id_uniq on entrium.profiles(telegram_chat_id) where telegram_chat_id is not null;
create unique index if not exists profiles_telegram_link_code_uniq on entrium.profiles(telegram_link_code) where telegram_link_code is not null;` },
  { name: "0008_notifications", sql: `create table if not exists entrium.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references entrium.profiles(id) on delete cascade,
  type text not null check (type in ('deadline','tip','system','agent_done','referral')),
  title text not null,
  body text,
  link text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifs_user_created_idx on entrium.notifications(user_id, created_at desc);
create index if not exists notifs_user_unread_idx on entrium.notifications(user_id) where read_at is null;
create unique index if not exists notifs_user_dedup_uniq on entrium.notifications(user_id, type, (data->>'dedup_key')) where data ? 'dedup_key';
alter table entrium.notifications enable row level security;
drop policy if exists notifs_owner on entrium.notifications;
create policy notifs_owner on entrium.notifications for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant all on entrium.notifications to authenticated, service_role;` },
  { name: "0009_public_sharing", sql: `alter table entrium.profiles
  add column if not exists public_slug text,
  add column if not exists public_visibility text not null default 'private' check (public_visibility in ('private','unlisted','public')),
  add column if not exists public_views int not null default 0;
create unique index if not exists profiles_public_slug_uniq on entrium.profiles(lower(public_slug)) where public_slug is not null;
create or replace function entrium.get_public_profile(p_slug text)
returns table (full_name text, applicant_data jsonb, visibility text)
language plpgsql security definer set search_path = entrium, public
as $$
declare uid uuid; vis text;
begin
  select id, public_visibility into uid, vis from entrium.profiles where lower(public_slug) = lower(p_slug) limit 1;
  if uid is null or vis = 'private' then return; end if;
  update entrium.profiles set public_views = public_views + 1 where id = uid;
  return query select p.full_name, p.applicant_data, p.public_visibility from entrium.profiles p where p.id = uid;
end;
$$;
grant execute on function entrium.get_public_profile to anon, authenticated, service_role;
create or replace function entrium.get_public_applications(p_slug text)
returns table (university_name text, university_country text, program text, level text, status text, priority text, deadline date)
language sql security definer set search_path = entrium, public
as $$
  select a.university_name, a.university_country, a.program, a.level, a.status, a.priority, a.deadline
  from entrium.applications a join entrium.profiles p on p.id = a.user_id
  where lower(p.public_slug) = lower(p_slug) and p.public_visibility != 'private'
  order by a.deadline asc nulls last;
$$;
grant execute on function entrium.get_public_applications to anon, authenticated, service_role;` },
  { name: "0010_app_ai_suggestions", sql: `alter table entrium.applications
  add column if not exists ai_suggestions jsonb,
  add column if not exists ai_suggestions_at timestamptz;` },
  { name: "0011_email_prefs", sql: `alter table entrium.profiles
  add column if not exists email_digest_enabled boolean not null default true,
  add column if not exists email_digest_sent_at timestamptz;` },
]

async function step1_migrations() {
  console.log("\n[1/5] Supabase migrations...")
  for (const m of MIGRATIONS) {
    const r = await fetch(`https://api.supabase.com/v1/projects/${SUPABASE_REF}/database/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: m.sql }),
    })
    if (!r.ok) {
      const txt = await r.text()
      console.error(`  ✗ ${m.name} HTTP ${r.status}: ${txt.slice(0, 300)}`)
      throw new Error("migration failed")
    }
    console.log(`  ✓ ${m.name}`)
  }
}

async function step2_findVercelProject() {
  console.log("\n[2/5] Vercel: find project...")
  // Try personal first, then teams
  let r = await fetch(`https://api.vercel.com/v9/projects?search=${VERCEL_PROJECT_NAME}`, {
    headers: { Authorization: `Bearer ${vercelToken}` },
  })
  if (!r.ok) throw new Error(`projects search HTTP ${r.status}`)
  let data = await r.json()
  let project = data.projects?.find((p) => p.name === VERCEL_PROJECT_NAME)
  if (project) {
    console.log(`  ✓ found in personal account: ${project.id}`)
    return { id: project.id, teamId: undefined, branch: project.link?.productionBranch ?? "main" }
  }

  r = await fetch("https://api.vercel.com/v2/teams", { headers: { Authorization: `Bearer ${vercelToken}` } })
  if (!r.ok) throw new Error(`teams HTTP ${r.status}`)
  const teams = (await r.json()).teams ?? []
  for (const team of teams) {
    const r2 = await fetch(`https://api.vercel.com/v9/projects?search=${VERCEL_PROJECT_NAME}&teamId=${team.id}`, {
      headers: { Authorization: `Bearer ${vercelToken}` },
    })
    if (!r2.ok) continue
    const d2 = await r2.json()
    project = d2.projects?.find((p) => p.name === VERCEL_PROJECT_NAME)
    if (project) {
      console.log(`  ✓ found in team ${team.slug}: ${project.id}`)
      return { id: project.id, teamId: team.id, branch: project.link?.productionBranch ?? "main" }
    }
  }
  throw new Error(`project ${VERCEL_PROJECT_NAME} not found anywhere`)
}

async function step3_setEnvVars(projectId, teamId) {
  console.log("\n[3/5] Vercel: set env vars...")
  const envs = [
    { key: "TELEGRAM_BOT_TOKEN", value: TG_BOT_TOKEN },
    { key: "TELEGRAM_WEBHOOK_SECRET", value: tgWebhookSecret },
    { key: "CRON_SECRET", value: cronSecret },
    { key: "EMAIL_TOKEN_SECRET", value: emailTokenSecret },
  ]

  // Get existing envs for cleanup
  const teamQuery = teamId ? `?teamId=${teamId}` : ""
  const listRes = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env${teamQuery}`, {
    headers: { Authorization: `Bearer ${vercelToken}` },
  })
  const listData = listRes.ok ? await listRes.json() : { envs: [] }

  for (const ev of envs) {
    // Delete existing matching keys
    const existing = (listData.envs ?? []).filter((e) => e.key === ev.key)
    for (const ex of existing) {
      await fetch(`https://api.vercel.com/v9/projects/${projectId}/env/${ex.id}${teamQuery}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${vercelToken}` },
      })
    }

    // Create new
    const createRes = await fetch(`https://api.vercel.com/v10/projects/${projectId}/env${teamQuery}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${vercelToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        key: ev.key,
        value: ev.value,
        type: "encrypted",
        target: ["production", "preview", "development"],
      }),
    })
    if (createRes.ok) {
      console.log(`  ✓ ${ev.key}`)
    } else {
      console.error(`  ✗ ${ev.key}: ${await createRes.text()}`)
    }
  }
}

async function step4_redeploy(projectId, teamId, branch) {
  console.log("\n[4/5] Vercel: trigger redeploy...")
  const teamQuery = teamId ? `?teamId=${teamId}` : ""
  const lastRes = await fetch(
    `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=1${teamId ? `&teamId=${teamId}` : ""}`,
    { headers: { Authorization: `Bearer ${vercelToken}` } }
  )
  const lastData = lastRes.ok ? await lastRes.json() : { deployments: [] }
  const last = lastData.deployments?.[0]

  const body = {
    name: VERCEL_PROJECT_NAME,
    project: projectId,
    target: "production",
    ...(last?.uid ? { deploymentId: last.uid } : {}),
    ...(last?.meta?.githubCommitSha
      ? { gitSource: { type: "github", ref: branch, sha: last.meta.githubCommitSha } }
      : {}),
  }

  const r = await fetch(`https://api.vercel.com/v13/deployments${teamQuery}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${vercelToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!r.ok) {
    console.error(`  ✗ redeploy ${r.status}: ${(await r.text()).slice(0, 200)}`)
  } else {
    const d = await r.json()
    console.log(`  ✓ redeploy queued: https://${d.url}`)
  }
}

async function step5_telegramWebhook() {
  console.log("\n[5/5] Telegram: register webhook...")
  const url = `${SITE_URL}/api/telegram/webhook`
  const r = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      secret_token: tgWebhookSecret,
      allowed_updates: ["message"],
      drop_pending_updates: true,
    }),
  })
  const data = await r.json()
  if (data.ok) {
    console.log(`  ✓ webhook → ${url}`)
  } else {
    console.error(`  ✗ ${data.description}`)
  }
}

;(async () => {
  try {
    await step1_migrations()
    const project = await step2_findVercelProject()
    await step3_setEnvVars(project.id, project.teamId)
    await step4_redeploy(project.id, project.teamId, project.branch)
    await step5_telegramWebhook()
    console.log("\n✨ DONE. Wait ~1-2 min for Vercel redeploy, then open @entriumleedbot and send /start")
  } catch (err) {
    console.error("\n✗ Setup failed:", err.message)
    process.exit(1)
  }
})()

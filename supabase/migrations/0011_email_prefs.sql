-- ─────────────────────────────────────────────────────────────
-- Email preferences (digest opt-out + last-sent tracking)
-- ─────────────────────────────────────────────────────────────

alter table entrium.profiles
  add column if not exists email_digest_enabled boolean not null default true,
  add column if not exists email_digest_sent_at timestamptz;

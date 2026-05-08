-- ─────────────────────────────────────────────────────────────
-- Telegram bot linking
-- One-time link_code generated in /settings → user sends
-- "/start <code>" to @entriumleedbot → bot stores chat_id
-- ─────────────────────────────────────────────────────────────

alter table entrium.profiles
  add column if not exists telegram_chat_id text,
  add column if not exists telegram_username text,
  add column if not exists telegram_link_code text,
  add column if not exists telegram_link_expires timestamptz;

create unique index if not exists profiles_telegram_chat_id_uniq
  on entrium.profiles(telegram_chat_id)
  where telegram_chat_id is not null;

create unique index if not exists profiles_telegram_link_code_uniq
  on entrium.profiles(telegram_link_code)
  where telegram_link_code is not null;

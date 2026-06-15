-- Add a stable Telegram user id to profiles for Mini App auth.
-- (telegram_chat_id stays for the bot DM flow; user_id is the stable identity.)
alter table entrium.profiles
  add column if not exists telegram_user_id bigint;

-- Many rows are null (web-only users); unique only among non-null.
create unique index if not exists profiles_telegram_user_id_key
  on entrium.profiles (telegram_user_id)
  where telegram_user_id is not null;

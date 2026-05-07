-- Backfill missing profiles for existing auth.users (e.g. pre-trigger users, OAuth users)
do $$
declare
  u record;
begin
  for u in
    select * from auth.users
    where id not in (select id from entrium.profiles)
  loop
    begin
      insert into entrium.profiles (id, email, full_name, avatar_url, referral_code)
      values (
        u.id,
        coalesce(u.email, u.id::text || '@unknown.local'),
        coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
        u.raw_user_meta_data->>'avatar_url',
        encode(extensions.gen_random_bytes(6), 'hex')
      );
    exception when others then
      raise notice 'Skipped % due to %', u.email, sqlerrm;
    end;
  end loop;
end $$;

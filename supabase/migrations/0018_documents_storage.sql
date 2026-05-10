-- ────────────────────────────────────────────────────────────────────
-- 0018 — Document storage (F-1 + F-2 from TZ_FULLSTACK.md).
--
-- F-1 (student docs): transcripts, certificates, scanned docs uploaded
-- via /settings → Documents.
-- F-2 (recommender docs): PDFs uploaded by recommenders via the
-- public /r/[token] URL after invitation. Linked back to the student
-- via the recommender_invites table.
--
-- Bucket "documents" is private. Access goes through a server-side
-- signed URL or direct download via the admin client; never exposed
-- to the browser.
--
-- entrium.documents — index table tying storage objects to users +
-- semantic metadata (kind, label, recommender_invite_id).
-- ────────────────────────────────────────────────────────────────────

-- Create the private bucket if it doesn't exist
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  20 * 1024 * 1024, -- 20 MB
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Documents index table
create table if not exists entrium.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  kind text not null,            -- 'transcript' | 'certificate' | 'recommendation' | 'cv' | 'other'
  label text,                    -- user-supplied display name
  size_bytes int,
  mime_type text,
  recommender_invite_id uuid,    -- nullable; set for recommender uploads
  created_at timestamptz not null default now()
);

create index if not exists documents_user_id_idx on entrium.documents (user_id, created_at desc);
create index if not exists documents_invite_idx on entrium.documents (recommender_invite_id);

alter table entrium.documents enable row level security;

drop policy if exists "documents_owner_select" on entrium.documents;
create policy "documents_owner_select" on entrium.documents
  for select using (auth.uid() = user_id);

drop policy if exists "documents_owner_insert" on entrium.documents;
create policy "documents_owner_insert" on entrium.documents
  for insert with check (auth.uid() = user_id);

drop policy if exists "documents_owner_delete" on entrium.documents;
create policy "documents_owner_delete" on entrium.documents
  for delete using (auth.uid() = user_id);

-- Recommender invites — F-2
create table if not exists entrium.recommender_invites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recommender_name text not null,
  recommender_email text not null,
  recommender_role text,         -- "Math teacher", "Director", etc.
  token text not null unique,    -- random URL-safe token, 32+ chars
  message text,                  -- optional personal note from student
  status text not null default 'pending', -- 'pending' | 'opened' | 'submitted' | 'expired'
  expires_at timestamptz not null default (now() + interval '60 days'),
  opened_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists rec_invites_user_idx on entrium.recommender_invites (user_id, created_at desc);
create index if not exists rec_invites_token_idx on entrium.recommender_invites (token);

alter table entrium.recommender_invites enable row level security;

drop policy if exists "rec_invites_owner_select" on entrium.recommender_invites;
create policy "rec_invites_owner_select" on entrium.recommender_invites
  for select using (auth.uid() = user_id);

drop policy if exists "rec_invites_owner_insert" on entrium.recommender_invites;
create policy "rec_invites_owner_insert" on entrium.recommender_invites
  for insert with check (auth.uid() = user_id);

drop policy if exists "rec_invites_owner_update" on entrium.recommender_invites;
create policy "rec_invites_owner_update" on entrium.recommender_invites
  for update using (auth.uid() = user_id);

-- Storage policies — only authenticated users can access their own folder
-- under documents/<user_id>/* (server admin client bypasses RLS for
-- recommender uploads which are unauthenticated).
drop policy if exists "documents_owner_storage_select" on storage.objects;
create policy "documents_owner_storage_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "documents_owner_storage_insert" on storage.objects;
create policy "documents_owner_storage_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "documents_owner_storage_delete" on storage.objects;
create policy "documents_owner_storage_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

comment on table entrium.documents is 'Index over storage.objects for student-owned documents';
comment on table entrium.recommender_invites is 'Tokens for unauthenticated PDF upload by recommenders (F-2)';

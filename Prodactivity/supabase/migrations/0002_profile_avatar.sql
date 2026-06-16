-- Add username + avatar_url to profiles, and create the avatars storage bucket.

-- username may already exist from the social migration; add if missing.
alter table public.profiles
  add column if not exists username text unique;

-- Public URL of the user's uploaded avatar photo.
alter table public.profiles
  add column if not exists avatar_url text;

-- ---------------------------------------------------------- storage: avatars
-- Public bucket — anyone can read, only the owner can write under their uid/.
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars_public_select" on storage.objects;
create policy "avatars_public_select" on storage.objects
  for select using (bucket_id = 'avatars');

-- Prodactivity — social accountability layer
--
-- Friends (request → accept), a photo "proof" feed, reactions, and nudges.
-- Mirrors the local-first model in src/design/social.tsx so the client can sync
-- without reshaping anything: a Post -> posts row, a reaction -> reactions row,
-- a SocialUser -> the existing profiles row, a Nudge -> nudges row.
--
-- Everything is RLS'd on auth.uid(). The cross-user visibility (you can see a
-- friend's posts) is expressed through a single security-definer helper,
-- are_friends(), so policies never recurse through the friendships table.

-- ---------------------------------------------------------------- extensions
create extension if not exists "citext"; -- case-insensitive unique usernames

-- ------------------------------------------------- profiles: searchable handle
-- Friend discovery is by @username. Nullable so existing rows stay valid until
-- a handle is set; the unique constraint still allows multiple NULLs.
alter table public.profiles add column if not exists username citext unique;

-- Profiles must be readable by other users now (to show a friend's name/emoji
-- and to search for people to add). Only name/emoji/username are exposed; these
-- are not sensitive. Writes remain owner-only (policies from 0001 unchanged).
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select to authenticated using (true);

-- Backfill a default handle for existing accounts + set one on new sign-ups.
-- Derived from the email local part plus a short random suffix so it's unique
-- without collision-handling; users can change it later in Settings.
update public.profiles p
  set username = lower(regexp_replace(split_part(u.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g'))
                 || '_' || substr(md5(random()::text), 1, 4)
  from auth.users u
  where u.id = p.id and p.username is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, emoji, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'You'),
    coalesce(new.raw_user_meta_data->>'emoji', '🦊'),
    lower(regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g'))
      || '_' || substr(md5(random()::text), 1, 4)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- --------------------------------------------------------------- friendships
-- One row per relationship. `status` walks pending → accepted. The requester
-- creates it; the addressee accepts (update) or declines (delete). Either party
-- may delete to cancel / unfriend.
create table if not exists public.friendships (
  id           uuid        primary key default gen_random_uuid(),
  requester_id uuid        not null references auth.users (id) on delete cascade,
  addressee_id uuid        not null references auth.users (id) on delete cascade,
  status       text        not null default 'pending' check (status in ('pending', 'accepted')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);

-- Only one relationship per unordered pair, regardless of who requested.
create unique index if not exists friendships_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create index if not exists friendships_addressee_idx on public.friendships (addressee_id);

drop trigger if exists friendships_set_updated_at on public.friendships;
create trigger friendships_set_updated_at
  before update on public.friendships
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------- friendship helper (RLS)
-- security definer + stable: lets the posts/reactions/nudges policies test
-- "are these two users friends?" without granting the caller direct read on the
-- friendships table (which would otherwise recurse with its own RLS). Defined
-- after the table because a SQL function's body is validated at creation time.
create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = a and f.addressee_id = b) or
        (f.requester_id = b and f.addressee_id = a)
      )
  );
$$;

-- --------------------------------------------------------------------- posts
create table if not exists public.posts (
  id          uuid        primary key default gen_random_uuid(),
  author_id   uuid        not null references auth.users (id) on delete cascade,
  kind        text        not null check (kind in ('habit', 'free')),
  -- Habit metadata is denormalized onto the post (matches the client type).
  habit_name  text,
  habit_emoji text,
  accent      text,
  streak      integer,
  photo_url   text,
  caption     text,
  created_at  timestamptz not null default now()
);

create index if not exists posts_author_idx on public.posts (author_id, created_at desc);

-- ----------------------------------------------------------------- reactions
create table if not exists public.reactions (
  id         uuid        primary key default gen_random_uuid(),
  post_id    uuid        not null references public.posts (id) on delete cascade,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  emoji      text        not null,
  created_at timestamptz not null default now(),
  unique (post_id, user_id, emoji)
);

create index if not exists reactions_post_idx on public.reactions (post_id);

-- -------------------------------------------------------------------- nudges
create table if not exists public.nudges (
  id         uuid        primary key default gen_random_uuid(),
  from_id    uuid        not null references auth.users (id) on delete cascade,
  to_id      uuid        not null references auth.users (id) on delete cascade,
  habit_name text,
  seen       boolean     not null default false,
  created_at timestamptz not null default now()
);

create index if not exists nudges_to_idx on public.nudges (to_id, seen);

-- ------------------------------------------------------- row-level security
alter table public.friendships enable row level security;
alter table public.posts       enable row level security;
alter table public.reactions   enable row level security;
alter table public.nudges      enable row level security;

-- friendships: visible to either party; requester creates (pending), addressee
-- accepts (update), either party deletes.
drop policy if exists "friendships_select_party" on public.friendships;
create policy "friendships_select_party" on public.friendships
  for select using (auth.uid() in (requester_id, addressee_id));

drop policy if exists "friendships_insert_requester" on public.friendships;
create policy "friendships_insert_requester" on public.friendships
  for insert with check (auth.uid() = requester_id and status = 'pending');

drop policy if exists "friendships_update_addressee" on public.friendships;
create policy "friendships_update_addressee" on public.friendships
  for update using (auth.uid() = addressee_id) with check (auth.uid() = addressee_id);

drop policy if exists "friendships_delete_party" on public.friendships;
create policy "friendships_delete_party" on public.friendships
  for delete using (auth.uid() in (requester_id, addressee_id));

-- posts: readable by the author and their accepted friends; writable by author.
drop policy if exists "posts_select_friends" on public.posts;
create policy "posts_select_friends" on public.posts
  for select using (auth.uid() = author_id or public.are_friends(auth.uid(), author_id));

drop policy if exists "posts_insert_own" on public.posts;
create policy "posts_insert_own" on public.posts
  for insert with check (auth.uid() = author_id);

drop policy if exists "posts_update_own" on public.posts;
create policy "posts_update_own" on public.posts
  for update using (auth.uid() = author_id) with check (auth.uid() = author_id);

drop policy if exists "posts_delete_own" on public.posts;
create policy "posts_delete_own" on public.posts
  for delete using (auth.uid() = author_id);

-- reactions: visible/insertable whenever you can see the post; you own your own.
drop policy if exists "reactions_select_visible" on public.reactions;
create policy "reactions_select_visible" on public.reactions
  for select using (
    exists (
      select 1 from public.posts p
      where p.id = post_id
        and (p.author_id = auth.uid() or public.are_friends(auth.uid(), p.author_id))
    )
  );

drop policy if exists "reactions_insert_own" on public.reactions;
create policy "reactions_insert_own" on public.reactions
  for insert with check (
    auth.uid() = user_id and
    exists (
      select 1 from public.posts p
      where p.id = post_id
        and (p.author_id = auth.uid() or public.are_friends(auth.uid(), p.author_id))
    )
  );

drop policy if exists "reactions_delete_own" on public.reactions;
create policy "reactions_delete_own" on public.reactions
  for delete using (auth.uid() = user_id);

-- nudges: both parties can read; you send to friends; the recipient marks seen.
drop policy if exists "nudges_select_party" on public.nudges;
create policy "nudges_select_party" on public.nudges
  for select using (auth.uid() in (from_id, to_id));

drop policy if exists "nudges_insert_friend" on public.nudges;
create policy "nudges_insert_friend" on public.nudges
  for insert with check (auth.uid() = from_id and public.are_friends(from_id, to_id));

drop policy if exists "nudges_update_recipient" on public.nudges;
create policy "nudges_update_recipient" on public.nudges
  for update using (auth.uid() = to_id) with check (auth.uid() = to_id);

-- ---------------------------------------------------------- storage (photos)
-- Public-read bucket for proof photos. Reads are open (unguessable URLs shared
-- with friends); writes are scoped to the uploader's own {user_id}/ folder.
insert into storage.buckets (id, name, public)
values ('post-photos', 'post-photos', true)
on conflict (id) do nothing;

drop policy if exists "post_photos_read" on storage.objects;
create policy "post_photos_read" on storage.objects
  for select using (bucket_id = 'post-photos');

drop policy if exists "post_photos_insert_own" on storage.objects;
create policy "post_photos_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'post-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "post_photos_update_own" on storage.objects;
create policy "post_photos_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'post-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "post_photos_delete_own" on storage.objects;
create policy "post_photos_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'post-photos' and (storage.foldername(name))[1] = auth.uid()::text);

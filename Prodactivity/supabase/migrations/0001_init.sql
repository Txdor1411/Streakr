-- Prodactivity — initial schema
-- Habits, per-day logs, and user profiles, all owner-scoped via RLS.
--
-- Mirrors the local-first data model in src/design/store.tsx so the client can
-- sync without reshaping anything: a HabitDef -> habits row, a per-day log entry
-- -> habit_logs row, the Profile -> profiles row.

-- ---------------------------------------------------------------- extensions
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- --------------------------------------------------------------------- types
do $$ begin
  create type public.habit_type as enum ('count', 'timer', 'done');
exception
  when duplicate_object then null;
end $$;

-- ----------------------------------------------------------------- profiles
-- One row per auth user. Auto-created by a trigger on auth.users (see below).
create table if not exists public.profiles (
  id          uuid        primary key references auth.users (id) on delete cascade,
  name        text        not null default 'You',
  emoji       text        not null default '🦊',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------------------- habits
create table if not exists public.habits (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  emoji       text        not null,
  name        text        not null,
  sub         text        not null default '',
  accent      text        not null,
  type        public.habit_type not null,
  goal        integer     not null default 1 check (goal >= 1),
  -- Mon..Sun schedule. A day not scheduled never breaks a streak.
  days        boolean[]   not null default array[true,true,true,true,true,true,true]
                          check (array_length(days, 1) = 7),
  position    integer     not null default 0,
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists habits_user_id_idx on public.habits (user_id);

-- --------------------------------------------------------------- habit_logs
-- One row per (habit, day). `amount` is glasses / minutes / 0|1 done.
create table if not exists public.habit_logs (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  habit_id    uuid        not null references public.habits (id) on delete cascade,
  day         date        not null,
  amount      real        not null default 0,
  updated_at  timestamptz not null default now(),
  unique (habit_id, day)
);

create index if not exists habit_logs_user_id_idx on public.habit_logs (user_id);
create index if not exists habit_logs_habit_day_idx on public.habit_logs (habit_id, day);

-- ------------------------------------------------------- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists habits_set_updated_at on public.habits;
create trigger habits_set_updated_at
  before update on public.habits
  for each row execute function public.set_updated_at();

drop trigger if exists habit_logs_set_updated_at on public.habit_logs;
create trigger habit_logs_set_updated_at
  before update on public.habit_logs
  for each row execute function public.set_updated_at();

-- -------------------------------------------------- auto-create profile row
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, emoji)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'You'),
    coalesce(new.raw_user_meta_data->>'emoji', '🦊')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -------------------------------------------------------- row-level security
alter table public.profiles   enable row level security;
alter table public.habits     enable row level security;
alter table public.habit_logs enable row level security;

-- profiles: a user owns exactly their own row.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- habits: full CRUD scoped to the owner.
drop policy if exists "habits_all_own" on public.habits;
create policy "habits_all_own" on public.habits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- habit_logs: full CRUD scoped to the owner.
drop policy if exists "habit_logs_all_own" on public.habit_logs;
create policy "habit_logs_all_own" on public.habit_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

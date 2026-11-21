-- Scripture Search — database schema.
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- It is safe to run more than once.

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- One profile row per account, created automatically on first sign-in.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- --------------------------------------------------------------- bookmarks
-- The verse is stored whole so the reader can restore it exactly, even for
-- books that are later re-ingested. Nothing here is user content: it is a
-- copy of a public verse plus the time it was saved.
create table if not exists public.bookmarks (
  user_id uuid not null references auth.users (id) on delete cascade,
  verse_id text not null,
  book_id text not null,
  saved_at timestamptz not null default now(),
  verse jsonb not null,
  primary key (user_id, verse_id)
);

create index if not exists bookmarks_user_saved_idx
  on public.bookmarks (user_id, saved_at desc);

alter table public.bookmarks enable row level security;

drop policy if exists "own bookmarks" on public.bookmarks;
create policy "own bookmarks" on public.bookmarks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Live updates across devices.
do $$
begin
  alter publication supabase_realtime add table public.bookmarks;
exception
  when duplicate_object then null;
end;
$$;

-- ----------------------------------------------------------- subscriptions
-- Written only by the payment webhook (which uses the service_role key), so
-- there is no insert or update policy for signed-in users: they can read their
-- own row and nothing else.
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status text not null default 'inactive',
  price_id text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists "read own subscription" on public.subscriptions;
create policy "read own subscription" on public.subscriptions
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------- storage
-- Not used by the app yet. When something needs an upload (a profile picture,
-- for example), create a bucket in Supabase → Storage and scope it like this:
--
--   insert into storage.buckets (id, name, public)
--   values ('avatars', 'avatars', true) on conflict do nothing;
--
--   create policy "public read avatars" on storage.objects
--     for select using (bucket_id = 'avatars');
--   create policy "own avatar write" on storage.objects
--     for insert with check (bucket_id = 'avatars' and owner = auth.uid());

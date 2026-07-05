-- Livemask Supabase schema
-- Run this in the Supabase SQL Editor:
--   supabase.com -> your project -> SQL Editor -> New Query -> paste -> Run
--
-- Safe to run once on a fresh project. Users are managed by Supabase Auth
-- (auth.users); all tables reference auth.users.id.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid references auth.users(id) primary key,
  email text not null,
  paystack_customer_code text,
  credits_balance integer default 0 not null, -- pay-as-you-go credits wallet
  created_at timestamptz default now()
);

-- Audit trail for credit purchases and usage deductions.
create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  amount integer not null,                  -- positive = purchase, negative = usage
  type text not null,                       -- 'purchase' | 'usage'
  paystack_reference text unique,           -- idempotency for Paystack webhooks
  description text,
  created_at timestamptz default now()
);

create index credit_transactions_user_id_idx on public.credit_transactions (user_id);

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  storage_path text not null,             -- Supabase Storage path: userId/characterId.jpg
  prompt text not null,                   -- Lucy 2.1 transformation prompt
  thumbnail_url text,                     -- Public URL from Supabase Storage
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.characters enable row level security;
alter table public.credit_transactions enable row level security;

create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can CRUD own characters" on public.characters
  for all using (auth.uid() = user_id);

create policy "Users can read own credit transactions" on public.credit_transactions
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Auto-create a profile row when a new auth user signs up
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Storage bucket policies (run AFTER creating the "characters" bucket in the
-- Supabase dashboard: Storage → New bucket → name "characters" → private)
-- ---------------------------------------------------------------------------

create policy "Users can upload own character images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'characters'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can read own character images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'characters'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update own character images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'characters'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own character images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'characters'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

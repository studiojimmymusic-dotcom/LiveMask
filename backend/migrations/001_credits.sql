-- Migration: subscription model → pay-as-you-go credits
-- Run in Supabase SQL Editor on an existing project.

alter table public.profiles
  add column if not exists credits_balance integer default 0 not null;

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  amount integer not null,
  type text not null,
  paystack_reference text unique,
  description text,
  created_at timestamptz default now()
);

create index if not exists credit_transactions_user_id_idx
  on public.credit_transactions (user_id);

alter table public.credit_transactions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'credit_transactions'
      and policyname = 'Users can read own credit transactions'
  ) then
    create policy "Users can read own credit transactions"
      on public.credit_transactions
      for select using (auth.uid() = user_id);
  end if;
end $$;

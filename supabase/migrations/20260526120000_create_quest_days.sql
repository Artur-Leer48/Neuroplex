create table if not exists public.quest_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_date date not null,
  day_object jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, quest_date)
);

alter table public.quest_days enable row level security;

drop policy if exists "Users manage own quest days"
on public.quest_days;
create policy "Users manage own quest days"
on public.quest_days
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

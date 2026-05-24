create extension if not exists pgcrypto;

create table if not exists public.work_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  task_id text,
  task_title text,
  timer_name text not null default 'Plasticity',
  duration_seconds integer not null check (duration_seconds > 0),
  started_at timestamptz not null default now(),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.recovery_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  activity_type text not null check (
    activity_type in ('meditation', 'yoga-nidra', 'walk')
  ),
  timer_name text not null default 'Recovery',
  duration_seconds integer not null check (duration_seconds > 0),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

insert into public.work_sessions (
  task_title,
  timer_name,
  duration_seconds,
  started_at,
  completed_at
)
values
  (
    'Demo: Konzept skizzieren',
    'Deep Work',
    1800,
    now() - interval '2 days 30 minutes',
    now() - interval '2 days'
  ),
  (
    'Demo: Eisenhower Matrix pflegen',
    'Planning Focus',
    2700,
    now() - interval '1 day 45 minutes',
    now() - interval '1 day'
  ),
  (
    'Demo: Lernnotizen konsolidieren',
    'Plasticity',
    3600,
    now() - interval '4 hours',
    now() - interval '3 hours'
  )
on conflict do nothing;

insert into public.recovery_sessions (
  activity_type,
  timer_name,
  duration_seconds,
  completed_at
)
values
  ('meditation', 'Meditation', 600, now() - interval '2 days'),
  ('yoga-nidra', 'Yoga Nidra', 1200, now() - interval '1 day'),
  ('walk', 'Spaziergang', 900, now() - interval '3 hours')
on conflict do nothing;

alter table public.work_sessions enable row level security;
alter table public.recovery_sessions enable row level security;

drop policy if exists "Allow users to read own and demo work sessions"
on public.work_sessions;

create policy "Allow users to read own and demo work sessions"
on public.work_sessions
for select
to authenticated
using (user_id is null or auth.uid() = user_id);

drop policy if exists "Allow users to create own work sessions"
on public.work_sessions;

create policy "Allow users to create own work sessions"
on public.work_sessions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Allow users to read own and demo recovery sessions"
on public.recovery_sessions;

create policy "Allow users to read own and demo recovery sessions"
on public.recovery_sessions
for select
to authenticated
using (user_id is null or auth.uid() = user_id);

drop policy if exists "Allow users to create own recovery sessions"
on public.recovery_sessions;

create policy "Allow users to create own recovery sessions"
on public.recovery_sessions
for insert
to authenticated
with check (auth.uid() = user_id);

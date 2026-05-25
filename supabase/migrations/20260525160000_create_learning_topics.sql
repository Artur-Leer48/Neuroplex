create table if not exists public.learning_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  tags text[] not null default '{}',
  goal text not null check (
    goal in ('Verstehen', 'Auswendig lernen', 'Pruefung', 'Projekt')
  ),
  start_date date not null default current_date,
  deadline date,
  review_repetition_count integer not null default 6 check (
    review_repetition_count between 1 and 36
  ),
  recall_questions text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null references public.learning_topics(id) on delete cascade,
  resource_type text not null check (
    resource_type in (
      'Buch',
      'Artikel',
      'Video',
      'Kurs',
      'Podcast',
      'Eigene Notiz',
      'Datei',
      'Link'
    )
  ),
  title text not null,
  reference text not null default '',
  summary text not null default '',
  locator text not null default '',
  status text not null default 'offen' check (
    status in ('offen', 'in Bearbeitung', 'abgeschlossen')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_resource_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id text not null,
  file_name text not null,
  mime_type text not null default 'application/octet-stream',
  file_size bigint not null check (file_size >= 0),
  file_bytes bytea not null,
  created_at timestamptz not null default now()
);

create table if not exists public.review_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null references public.learning_topics(id) on delete cascade,
  current_interval_index integer not null default 0 check (
    current_interval_index between 0 and 5
  ),
  next_review_date date not null,
  is_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (topic_id)
);

create table if not exists public.review_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null references public.learning_topics(id) on delete cascade,
  reviewed_at timestamptz not null default now(),
  rating text not null check (rating in ('Forgot', 'Hard', 'Good', 'Easy')),
  notes text not null default '',
  next_review_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.review_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null references public.learning_topics(id) on delete cascade,
  review_session_id uuid references public.review_sessions(id) on delete cascade,
  prompt text not null default 'Was weisst du noch?',
  answer text not null default '',
  created_at timestamptz not null default now()
);

alter table public.learning_topics enable row level security;
alter table public.learning_resources enable row level security;
alter table public.learning_resource_files enable row level security;
alter table public.review_schedules enable row level security;
alter table public.review_sessions enable row level security;
alter table public.review_answers enable row level security;

drop policy if exists "Users manage own learning topics"
on public.learning_topics;
create policy "Users manage own learning topics"
on public.learning_topics
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own learning resources"
on public.learning_resources;
create policy "Users manage own learning resources"
on public.learning_resources
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own learning resource files"
on public.learning_resource_files;
create policy "Users manage own learning resource files"
on public.learning_resource_files
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own review schedules"
on public.review_schedules;
create policy "Users manage own review schedules"
on public.review_schedules
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own review sessions"
on public.review_sessions;
create policy "Users manage own review sessions"
on public.review_sessions
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own review answers"
on public.review_answers;
create policy "Users manage own review answers"
on public.review_answers
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

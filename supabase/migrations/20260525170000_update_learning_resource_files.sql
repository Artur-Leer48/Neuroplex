do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'learning_topics'
      and column_name = 'review_horizon_days'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'learning_topics'
      and column_name = 'review_repetition_count'
  ) then
    alter table public.learning_topics
    rename column review_horizon_days to review_repetition_count;
  end if;
end $$;

alter table if exists public.learning_topics
add column if not exists review_repetition_count integer not null default 6;

update public.learning_topics
set review_repetition_count = case
  when review_repetition_count <= 30 then 5
  when review_repetition_count <= 60 then 6
  else least(36, 6 + ceiling((review_repetition_count - 60)::numeric / 60)::integer)
end
where review_repetition_count > 36;

alter table if exists public.learning_topics
alter column review_repetition_count set default 6;

alter table if exists public.learning_topics
drop constraint if exists learning_topics_review_horizon_days_check;

alter table if exists public.learning_topics
drop constraint if exists learning_topics_review_repetition_count_check;

alter table if exists public.learning_topics
add constraint learning_topics_review_repetition_count_check
check (review_repetition_count between 1 and 36);

alter table if exists public.learning_resources
drop column if exists importance;

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

alter table public.learning_resource_files enable row level security;

drop policy if exists "Users manage own learning resource files"
on public.learning_resource_files;
create policy "Users manage own learning resource files"
on public.learning_resource_files
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

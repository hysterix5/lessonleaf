create table if not exists public.classes (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  subject text not null check (length(trim(subject)) between 1 and 100),
  grade text not null check (length(trim(grade)) between 1 and 100),
  section text not null default '',
  school_year text not null,
  meeting_days smallint[] not null check (cardinality(meeting_days) between 1 and 7 and meeting_days <@ array[0,1,2,3,4,5,6]::smallint[]),
  duration_minutes integer not null check (duration_minutes between 10 and 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create index if not exists classes_user_name_idx on public.classes (user_id, name);
alter table public.classes enable row level security;
revoke all on public.classes from public;
revoke all on public.classes from anon;
grant select, insert, update, delete on public.classes to authenticated;

create policy "Users can read their classes" on public.classes for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can create their classes" on public.classes for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their classes" on public.classes for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their classes" on public.classes for delete to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.course_overviews (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  class_id uuid not null,
  title text not null check (length(trim(title)) between 1 and 150),
  description text not null default '',
  weeks jsonb not null default '[]'::jsonb check (jsonb_typeof(weeks) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (class_id, user_id) references public.classes (id, user_id) on delete cascade
);

create index if not exists course_overviews_user_class_idx on public.course_overviews (user_id, class_id, updated_at desc);
alter table public.course_overviews enable row level security;
revoke all on public.course_overviews from public;
revoke all on public.course_overviews from anon;
grant select, insert, update, delete on public.course_overviews to authenticated;

create policy "Users can read their course overviews" on public.course_overviews for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can create their course overviews" on public.course_overviews for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their course overviews" on public.course_overviews for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their course overviews" on public.course_overviews for delete to authenticated
  using ((select auth.uid()) = user_id);

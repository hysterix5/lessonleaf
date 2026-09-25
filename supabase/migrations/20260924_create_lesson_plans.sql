create table if not exists public.lesson_plans (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plan jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lesson_plans_user_updated_idx
  on public.lesson_plans (user_id, updated_at desc);

alter table public.lesson_plans enable row level security;

revoke all on public.lesson_plans from public;
revoke all on public.lesson_plans from anon;
grant select, insert, update, delete on public.lesson_plans to authenticated;

create policy "Users can read their lesson plans"
  on public.lesson_plans for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their lesson plans"
  on public.lesson_plans for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their lesson plans"
  on public.lesson_plans for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their lesson plans"
  on public.lesson_plans for delete to authenticated
  using ((select auth.uid()) = user_id);

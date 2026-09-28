create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('Groq', 'Gemini')),
  model text not null,
  input_tokens bigint not null check (input_tokens >= 0),
  output_tokens bigint not null check (output_tokens >= 0),
  total_tokens bigint not null check (total_tokens >= 0),
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_created_at_idx on public.ai_usage (created_at desc);

alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from public, anon, authenticated;
grant select, insert on public.ai_usage to service_role;

create or replace function public.ai_usage_daily(start_at timestamptz)
returns table (
  day date,
  provider text,
  model text,
  requests bigint,
  input_tokens bigint,
  output_tokens bigint,
  total_tokens bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select (created_at at time zone 'UTC')::date as day,
    provider, model, count(*) as requests,
    sum(input_tokens) as input_tokens,
    sum(output_tokens) as output_tokens,
    sum(total_tokens) as total_tokens
  from public.ai_usage
  where created_at >= start_at
  group by 1, 2, 3
  order by 1 desc, 2, 3;
$$;

revoke all on function public.ai_usage_daily(timestamptz) from public, anon, authenticated;
grant execute on function public.ai_usage_daily(timestamptz) to service_role;

-- Prompt 5.8 AI-SVG quality experiment storage.

create table if not exists public.ai_svg_gold_library (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete cascade,
  concept text not null,
  svg text not null,
  title text not null,
  rating integer not null check (rating between 1 and 5),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists ai_svg_gold_library_user_created_idx
  on public.ai_svg_gold_library (user_id, created_at desc);

create table if not exists public.ai_svg_debug_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete cascade,
  concept text not null,
  techniques_used text[] not null default '{}',
  svg text not null,
  title text not null,
  ms integer not null,
  cost_estimate_cents numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_svg_debug_history_user_created_idx
  on public.ai_svg_debug_history (user_id, created_at desc);

alter table public.ai_svg_gold_library enable row level security;
alter table public.ai_svg_debug_history enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_svg_gold_library'
      and policyname = 'ai_svg_gold_library_select_own_or_dev'
  ) then
    create policy ai_svg_gold_library_select_own_or_dev
      on public.ai_svg_gold_library
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_svg_debug_history'
      and policyname = 'ai_svg_debug_history_select_own_or_dev'
  ) then
    create policy ai_svg_debug_history_select_own_or_dev
      on public.ai_svg_debug_history
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;
end $$;

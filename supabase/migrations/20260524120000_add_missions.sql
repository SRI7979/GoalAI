-- PathAI Prompt 5 daily missions.
-- Additive and idempotent: missions coexist with legacy daily_tasks. Only
-- goals marked mission_flow_version='p5' use this flow.

alter table if exists public.goals
  add column if not exists mission_flow_version text;

create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  goal_id uuid not null references public.goals(id) on delete cascade,
  day_number integer not null,
  concepts_targeted text[] not null default array[]::text[],
  components jsonb not null default '[]'::jsonb,
  estimated_minutes integer not null default 15,
  proof_required boolean not null default false,
  status text not null default 'pending',
  generation_status text not null default 'ok',
  generation_failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint missions_status_check
    check (status in ('pending', 'in_progress', 'completed', 'abandoned')),
  constraint missions_generation_status_check
    check (generation_status in ('ok', 'pending_retry', 'failed'))
);

create index if not exists missions_user_goal_day_idx
  on public.missions (user_id, goal_id, day_number);

create index if not exists missions_goal_status_idx
  on public.missions (goal_id, status, created_at desc);

alter table public.missions enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'missions'
      and policyname = 'missions_select_own'
  ) then
    create policy missions_select_own
      on public.missions
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;
end $$;

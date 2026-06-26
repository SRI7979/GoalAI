-- PathAI Prompt 11 proof of mastery.
-- Additive and idempotent: goals get an upfront proof target, and proof
-- submissions record the learner's final evidence and evaluation.

alter table if exists public.goals
  add column if not exists proof_target jsonb,
  add column if not exists proof_target_status text not null default 'ok',
  add column if not exists proof_target_failure_reason text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'goals_proof_target_status_check'
  ) then
    alter table public.goals
      add constraint goals_proof_target_status_check
      check (proof_target_status in ('ok', 'pending_retry', 'failed'));
  end if;
end $$;

create table if not exists public.proof_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  proof_target jsonb not null,
  submission jsonb not null default '{}'::jsonb,
  evaluation jsonb not null default '{}'::jsonb,
  score integer,
  passed boolean not null default false,
  status text not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  evaluated_at timestamptz,
  constraint proof_submissions_status_check
    check (status in ('submitted', 'needs_revision', 'passed', 'failed'))
);

create index if not exists proof_submissions_user_goal_created_idx
  on public.proof_submissions (user_id, goal_id, created_at desc);

create index if not exists proof_submissions_goal_status_idx
  on public.proof_submissions (goal_id, status, created_at desc);

alter table public.proof_submissions enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'proof_submissions'
      and policyname = 'proof_submissions_select_own'
  ) then
    create policy proof_submissions_select_own
      on public.proof_submissions
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;
end $$;

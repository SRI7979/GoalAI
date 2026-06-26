-- PathAI Prompt 2 learner state.
-- Additive and idempotent: one learner_state row per (user_id, goal_id),
-- plus a recoverable queue for evidence writes that fail after task completion.

create table if not exists public.learner_state (
  user_id uuid not null,
  goal_id uuid not null,
  knowledge jsonb not null default '{}'::jsonb,
  pedagogical_profile jsonb not null default '{
    "optimalSessionMinutes": 15,
    "prefersVisual": true,
    "difficultyPreference": "balanced",
    "strugglesWith": [],
    "motivationDrivers": []
  }'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, goal_id)
);

create index if not exists learner_state_goal_id_idx
  on public.learner_state (goal_id);

alter table public.learner_state enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'learner_state'
      and policyname = 'learner_state_select_own'
  ) then
    create policy learner_state_select_own
      on public.learner_state
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;
end $$;

create table if not exists public.pending_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  goal_id uuid not null,
  event jsonb not null,
  failure_reason text,
  source text not null default 'applyEvidence',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists pending_evidence_user_goal_idx
  on public.pending_evidence (user_id, goal_id);

create index if not exists pending_evidence_status_created_idx
  on public.pending_evidence (status, created_at desc);

alter table public.pending_evidence enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'pending_evidence'
      and policyname = 'pending_evidence_select_own'
  ) then
    create policy pending_evidence_select_own
      on public.pending_evidence
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;
end $$;

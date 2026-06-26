-- PathAI Prompt 3 topic graphs.
-- Additive and idempotent. Existing goals remain nullable and keep using the
-- current linear day-generation flow until a new graph is created.

create table if not exists public.topic_graphs (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null unique references public.goals(id) on delete cascade,
  nodes jsonb not null default '[]'::jsonb,
  edges jsonb not null default '[]'::jsonb,
  generation_status text not null default 'ok',
  generation_failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint topic_graphs_generation_status_check
    check (generation_status in ('ok', 'pending_retry', 'failed'))
);

create index if not exists topic_graphs_goal_id_idx
  on public.topic_graphs (goal_id);

alter table if exists public.goals
  add column if not exists topic_graph_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'goals_topic_graph_id_fkey'
  ) then
    alter table public.goals
      add constraint goals_topic_graph_id_fkey
      foreign key (topic_graph_id)
      references public.topic_graphs(id)
      on delete set null;
  end if;
end $$;

create index if not exists goals_topic_graph_id_idx
  on public.goals (topic_graph_id);

alter table public.topic_graphs enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'topic_graphs'
      and policyname = 'topic_graphs_select_own'
  ) then
    create policy topic_graphs_select_own
      on public.topic_graphs
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.goals
          where goals.id = topic_graphs.goal_id
            and goals.user_id = auth.uid()
        )
      );
  end if;
end $$;

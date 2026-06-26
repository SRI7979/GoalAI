-- Prompt 5.5 dynamic diagram cache/debug table.
-- concept_id is nullable text for now; P3 concept IDs are graph-scoped and
-- there is not yet a canonical concepts table to reference.

create table if not exists public.dynamic_diagrams (
  id uuid primary key default gen_random_uuid(),
  concept_id text,
  title text not null,
  tier text not null,
  diagram_type text,
  payload jsonb not null default '{}'::jsonb,
  fallback_text text not null,
  generation_status text not null default 'ok',
  generation_failure_reason text,
  created_at timestamptz not null default now(),
  constraint dynamic_diagrams_tier_check
    check (tier in ('structured', 'mermaid', 'svg', 'none')),
  constraint dynamic_diagrams_generation_status_check
    check (generation_status in ('ok', 'pending_retry', 'failed'))
);

create index if not exists dynamic_diagrams_concept_created_idx
  on public.dynamic_diagrams (concept_id, created_at desc);

create index if not exists dynamic_diagrams_tier_created_idx
  on public.dynamic_diagrams (tier, created_at desc);

alter table public.dynamic_diagrams enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'dynamic_diagrams'
      and policyname = 'dynamic_diagrams_select_authenticated'
  ) then
    create policy dynamic_diagrams_select_authenticated
      on public.dynamic_diagrams
      for select
      to authenticated
      using (true);
  end if;
end $$;

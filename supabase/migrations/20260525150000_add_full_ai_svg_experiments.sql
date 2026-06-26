-- Prompt 5.7 FULL AI SVG experiment log.
-- Dev-only evaluation surface for pure AI-generated SVG output.

create table if not exists public.full_ai_svg_experiments (
  id uuid primary key default gen_random_uuid(),
  concept text not null,
  svg text not null,
  title text not null,
  ms integer not null,
  model_used text not null,
  size_kb numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists full_ai_svg_experiments_concept_created_idx
  on public.full_ai_svg_experiments (concept, created_at desc);

alter table public.full_ai_svg_experiments enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'full_ai_svg_experiments'
      and policyname = 'full_ai_svg_experiments_select_authenticated'
  ) then
    create policy full_ai_svg_experiments_select_authenticated
      on public.full_ai_svg_experiments
      for select
      to authenticated
      using (true);
  end if;
end $$;

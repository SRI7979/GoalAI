-- PathAI domain-aware learning.
-- This migration is intentionally additive so existing data and RLS policies keep working.

do $$
begin
  if to_regclass('public.users') is not null then
    alter table public.users add column if not exists domain text;
    alter table public.users add column if not exists domain_confirmed_at timestamptz;

    if not exists (
      select 1 from pg_constraint where conname = 'users_domain_check'
    ) then
      alter table public.users
        add constraint users_domain_check
        check (
          domain is null or domain in (
            'CS_CODING',
            'MATHEMATICS',
            'FOREIGN_LANGUAGE',
            'PHYSICS',
            'HISTORY',
            'ECONOMICS',
            'CHEMISTRY',
            'PHILOSOPHY_LOGIC',
            'WRITING',
            'PSYCHOLOGY',
            'POLITICAL_SCIENCE',
            'BIOLOGY'
          )
        ) not valid;
    end if;
  end if;
end $$;

alter table if exists public.goals
  add column if not exists domain text,
  add column if not exists domain_config jsonb;

do $$
begin
  if to_regclass('public.goals') is not null and not exists (
    select 1 from pg_constraint where conname = 'goals_domain_check'
  ) then
    alter table public.goals
      add constraint goals_domain_check
      check (
        domain is null or domain in (
          'CS_CODING',
          'MATHEMATICS',
          'FOREIGN_LANGUAGE',
          'PHYSICS',
          'HISTORY',
          'ECONOMICS',
          'CHEMISTRY',
          'PHILOSOPHY_LOGIC',
          'WRITING',
          'PSYCHOLOGY',
          'POLITICAL_SCIENCE',
          'BIOLOGY'
        )
      ) not valid;
  end if;
end $$;

alter table if exists public.courses
  add column if not exists domain text,
  add column if not exists domain_config jsonb;

alter table if exists public.curricula
  add column if not exists domain text,
  add column if not exists domain_config jsonb;

do $$
begin
  if to_regclass('public.goals') is not null then
    create index if not exists goals_user_domain_idx on public.goals (user_id, domain);
  end if;
end $$;

-- PathAI Prompt 1 completion: status fields and deferred decomposition backfill.
-- Additive and idempotent. Keeps deferred constraints as historical records.

alter table if exists public.goals
  add column if not exists primary_mode text,
  add column if not exists secondary_modes text[],
  add column if not exists estimated_days integer,
  add column if not exists decomposition jsonb,
  add column if not exists decomposition_status text default 'ok',
  add column if not exists decomposition_failure_reason text;

do $$
declare
  goal_row record;
  deferred_payload jsonb;
  constraint_value text;
begin
  if to_regclass('public.goals') is null then
    return;
  end if;

  for goal_row in
    select id, constraints
    from public.goals
    where decomposition is null
      and constraints is not null
  loop
    deferred_payload := null;

    foreach constraint_value in array goal_row.constraints loop
      if constraint_value like 'Deferred goal decomposition JSON: %' then
        begin
          deferred_payload := substring(constraint_value from length('Deferred goal decomposition JSON: ') + 1)::jsonb;
        exception when others then
          deferred_payload := null;
        end;
        exit;
      end if;
    end loop;

    if deferred_payload is not null then
      update public.goals
      set
        primary_mode = deferred_payload->>'primaryMode',
        secondary_modes = coalesce(
          array(select jsonb_array_elements_text(coalesce(deferred_payload->'secondaryModes', '[]'::jsonb))),
          array[]::text[]
        ),
        estimated_days = nullif(deferred_payload->>'estimatedDays', '')::integer,
        decomposition = deferred_payload,
        decomposition_status = coalesce(deferred_payload->>'decompositionStatus', 'ok'),
        decomposition_failure_reason = deferred_payload->>'failureReason'
      where id = goal_row.id;
    end if;
  end loop;
end $$;

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  user_id text,
  goal_id text,
  mission_id text,
  energy_mode text,
  streak_value integer,
  xp_balance integer,
  properties jsonb not null default '{}'::jsonb,
  client_timestamp timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.analytics_events enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'analytics_events'
      and policyname = 'analytics_events_insert_own'
  ) then
    create policy analytics_events_insert_own
      on public.analytics_events
      for insert
      to authenticated
      with check (user_id is null or user_id = auth.uid()::text);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'analytics_events'
      and policyname = 'analytics_events_select_own'
  ) then
    create policy analytics_events_select_own
      on public.analytics_events
      for select
      to authenticated
      using (user_id is null or user_id = auth.uid()::text);
  end if;
end $$;

create index if not exists analytics_events_event_name_idx
  on public.analytics_events (event_name);

create index if not exists analytics_events_goal_id_idx
  on public.analytics_events (goal_id);

create index if not exists analytics_events_client_timestamp_idx
  on public.analytics_events (client_timestamp desc);

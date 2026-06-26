-- PathAI Prompt 12 outcome telemetry + quality loop.
-- Durable issue queue derived from analytics_events, plus prompt-feedback items
-- that let the admin/dev view turn bad outcomes into concrete prompt notes.

create table if not exists public.quality_issues (
  id uuid primary key default gen_random_uuid(),
  source_event_id uuid references public.analytics_events(id) on delete set null,
  event_name text,
  user_id text,
  goal_id text,
  mission_id text,
  component_type text,
  concept_ids text[] not null default '{}'::text[],
  issue_type text not null,
  severity integer not null default 3,
  title text not null,
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'open',
  prompt_key text,
  prompt_file text,
  suggested_feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint quality_issues_severity_check check (severity between 1 and 5),
  constraint quality_issues_status_check check (status in ('open', 'feedback_queued', 'fixed', 'dismissed')),
  constraint quality_issues_type_check check (
    issue_type in (
      'confusion',
      'dropoff',
      'retry',
      'low_confidence',
      'incorrect',
      'generation_failed',
      'evidence_write_failed',
      'mission_underperformed',
      'proof_failed',
      'manual'
    )
  )
);

create unique index if not exists quality_issues_source_event_unique_idx
  on public.quality_issues (source_event_id)
  where source_event_id is not null;

create index if not exists quality_issues_status_severity_idx
  on public.quality_issues (status, severity desc, created_at desc);

create index if not exists quality_issues_goal_idx
  on public.quality_issues (goal_id, created_at desc);

create table if not exists public.prompt_feedback_items (
  id uuid primary key default gen_random_uuid(),
  quality_issue_id uuid references public.quality_issues(id) on delete cascade,
  prompt_key text,
  prompt_file text,
  feedback text not null,
  status text not null default 'queued',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prompt_feedback_status_check check (status in ('queued', 'applied', 'dismissed'))
);

create index if not exists prompt_feedback_items_issue_idx
  on public.prompt_feedback_items (quality_issue_id, created_at desc);

create index if not exists prompt_feedback_items_status_idx
  on public.prompt_feedback_items (status, created_at desc);

alter table public.quality_issues enable row level security;
alter table public.prompt_feedback_items enable row level security;

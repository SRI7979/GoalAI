-- PathAI Prompt 1 goal decomposition fields.
-- This migration is intentionally additive; existing goals are left null for a later backfill.

alter table if exists public.goals
  add column if not exists primary_mode text,
  add column if not exists secondary_modes text[],
  add column if not exists estimated_days integer,
  add column if not exists decomposition jsonb;

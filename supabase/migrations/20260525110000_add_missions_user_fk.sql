-- Prompt 5 verification fix: prevent orphaned mission rows when a user is deleted.
-- Additive and idempotent for environments where the constraint may already exist.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'missions_user_id_fkey'
      and conrelid = 'public.missions'::regclass
  ) then
    alter table public.missions
      add constraint missions_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

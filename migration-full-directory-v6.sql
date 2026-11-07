-- ============================================================================
--  Full Directory — v6 spreadsheet columns
-- ----------------------------------------------------------------------------
--  Adds the career / Berkeley fields the v6 member spreadsheet introduced.
--  Run AFTER migration-full-directory.sql, BEFORE re-running
--  scripts/import-full-directory.mjs. Safe to re-run.
--
--  (The column is "current_job", not "current_role": CURRENT_ROLE is a reserved
--  word in Postgres.) Nothing here is private: like LinkedIn, these are visible
--  to every signed-in member. RLS / grants are unchanged from the first migration.
-- ============================================================================

alter table directory_people
  add column if not exists current_job        text,                               -- "Product Manager, Acme"
  add column if not exists employment_history jsonb not null default '[]'::jsonb, -- newest first:
                                                                                   -- [{"title","company","start","end","current"}]
  add column if not exists berkeley_years     text,                               -- "2020–2024" as shown
  add column if not exists berkeley_start     int,
  add column if not exists berkeley_end       int;

-- Ask PostgREST to pick up the new columns right away.
notify pgrst, 'reload schema';

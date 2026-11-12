-- ============================================================================
--  Full Directory — v7 spreadsheet columns
-- ----------------------------------------------------------------------------
--  Adds the cleaned subject lists the v7 member spreadsheet introduced
--  ("Majors (list)" / "Minors (list)"). Run AFTER migration-full-directory-v6.sql,
--  BEFORE re-running scripts/import-full-directory.mjs. Safe to re-run.
--
--  `major` (the free-text "Major" column) is kept as-is; these lists are what the
--  directory shows and filters on. Nothing here is private: like `major`, they are
--  visible to every signed-in member. RLS / grants are unchanged.
-- ============================================================================

alter table directory_people
  add column if not exists majors text[] not null default '{}',  -- ["Molecular and Cell Biology", "Data Science"]
  add column if not exists minors text[] not null default '{}';  -- ["Public Policy"]

-- Ask PostgREST to pick up the new columns right away.
notify pgrst, 'reload schema';

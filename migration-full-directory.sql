-- ============================================================================
--  Full Directory (every member, 2015–2027)
-- ----------------------------------------------------------------------------
--  Two tables, filled by scripts/import-full-directory.mjs from the club's
--  compiled member spreadsheet (which lives outside the repo).
--
--  These are deliberately NOT part of the lms_* roster: nothing here grants a
--  login, and the Google Sheets roster sync never reads or writes them.
--
--  RLS is on with no policies, like every lms_* table, so only the server's
--  service-role key can read them. Field-level privacy (phones, personal
--  emails) is applied by the API route before anything leaves the server.
--
--  Safe to re-run.
-- ============================================================================

create table if not exists directory_people (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique,            -- stable URL id, e.g. "aakarsh-kankaria"
  full_name            text not null,
  emails               text[] not null default '{}',    -- lower-cased, deduped
  phones               text[] not null default '{}',
  grad_year            int,
  grad_year_inferred   boolean not null default false,  -- derived from class standing, not stated
  class_standing       jsonb not null default '{}'::jsonb, -- {"2025-2026": "Junior", ...}
  major                text,
  joined_rishi         text,                            -- e.g. "Fall 2019"
  joined_rishi_approx  boolean not null default false,  -- estimated from a semester count
  birthday             text,                            -- as written; not a date
  india_trips          text[] not null default '{}',
  hindi_level          text,
  linkedin             text,
  post_grad_plans      text,
  other_info           jsonb not null default '[]'::jsonb, -- [{"label": ..., "value": ...}]
  years_active         text[] not null default '{}',    -- ["2020-2021", ...]
  first_year           int,                             -- start year of the first year active
  last_year            int,
  updated_at           timestamptz not null default now()
);

create table if not exists directory_memberships (
  id                   uuid primary key default gen_random_uuid(),
  person_id            uuid not null references directory_people(id) on delete cascade,
  year                 text not null,                   -- "2019-2020", or "alumni" (years unknown)
  year_start           int,                             -- 2019; null for "alumni"
  project_group_raw    text,                            -- exactly as recorded
  project_groups       text[] not null default '{}',    -- normalized names
  not_yet_placed       boolean not null default false,
  position_raw         text,
  positions            text[] not null default '{}',
  position_type        text not null default 'member'
                       check (position_type in ('exec', 'lead', 'member', 'other')),
  class_standing       text,
  semesters_in_rishi   int,
  hiatus               text,                            -- no source data yet; kept for the future
  hindi                text,
  india_trip           text,
  updated_at           timestamptz not null default now(),
  unique (person_id, year)
);

create index if not exists directory_memberships_year_idx   on directory_memberships (year);
create index if not exists directory_memberships_person_idx on directory_memberships (person_id);

alter table directory_people      enable row level security;
alter table directory_memberships enable row level security;

-- Only the server (service role) may read or write these tables. The browser
-- roles get nothing; all access goes through /api/lms/full-directory.
grant select, insert, update, delete on directory_people, directory_memberships to service_role;
revoke all on directory_people, directory_memberships from anon, authenticated;

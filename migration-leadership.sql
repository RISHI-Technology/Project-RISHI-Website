-- ============================================================================
--  Leadership history (Lore → Leadership)
-- ----------------------------------------------------------------------------
--  Three tables: one row per school year, its roles, and each role's holders.
--  Seeded by scripts/seed-leadership.mjs; edited by webmasters at
--  /dashboard/lore/edit. The tree layout is DERIVED from each role's slot
--  (lib/leadership/tree.ts) — no edges are stored.
--
--  A holder links to the Full Directory by directory_people.id (stable; slugs
--  can change when a person is renamed). Deleting a directory record only
--  unlinks the holder, it never deletes leadership history.
--
--  RLS is on with no policies, like every lms_* and directory_* table, so only
--  the server's service-role key can read or write. All timestamps are
--  timestamptz and set by the database (now()), never by the app.
--
--  Safe to re-run.
-- ============================================================================

create table if not exists leadership_years (
  year        text primary key
              check (year ~ '^[0-9]{4}-[0-9]{4}$' and right(year, 4)::int = left(year, 4)::int + 1),
  structure   text not null check (structure in ('two_vp', 'one_vp', 'pvp_only')),
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists leadership_roles (
  id              uuid primary key default gen_random_uuid(),
  year            text not null references leadership_years(year) on delete cascade on update cascade,
  title           text not null check (length(btrim(title)) > 0),
  slot            text not null check (slot in (
                    'president', 'vp', 'vp_internal', 'vp_projects', 'director',
                    'projects_director', 'senior_lead', 'lead', 'intern', 'other')),
  project_group   text,                                  -- for leads / senior leads
  parent_role_id  uuid references leadership_roles(id) on delete set null,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (year, title),
  check (parent_role_id is null or parent_role_id <> id)
);

create table if not exists leadership_holders (
  id                   uuid primary key default gen_random_uuid(),
  role_id              uuid not null references leadership_roles(id) on delete cascade,
  display_name         text not null check (length(btrim(display_name)) > 0),
  directory_person_id  uuid references directory_people(id) on delete set null,
  qualifier            text,                             -- shown under the name on the tree
  note                 text,                             -- shown only in the person popup
  sort_order           int not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (role_id, display_name)
);

create index if not exists leadership_roles_year_idx     on leadership_roles (year);
create index if not exists leadership_roles_parent_idx   on leadership_roles (parent_role_id);
create index if not exists leadership_holders_role_idx   on leadership_holders (role_id);
create index if not exists leadership_holders_person_idx on leadership_holders (directory_person_id);

-- updated_at is maintained here, so the app never writes a timestamp.
create or replace function leadership_touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists leadership_years_touch   on leadership_years;
drop trigger if exists leadership_roles_touch   on leadership_roles;
drop trigger if exists leadership_holders_touch on leadership_holders;
create trigger leadership_years_touch   before update on leadership_years   for each row execute function leadership_touch_updated_at();
create trigger leadership_roles_touch   before update on leadership_roles   for each row execute function leadership_touch_updated_at();
create trigger leadership_holders_touch before update on leadership_holders for each row execute function leadership_touch_updated_at();

alter table leadership_years   enable row level security;
alter table leadership_roles   enable row level security;
alter table leadership_holders enable row level security;

-- Only the server (service role) may read or write these tables. The browser
-- roles get nothing; all access goes through /api/lms/leadership.
grant select, insert, update, delete on leadership_years, leadership_roles, leadership_holders to service_role;
revoke all on leadership_years, leadership_roles, leadership_holders from anon, authenticated;

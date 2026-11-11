// ============================================================================
//  Full Directory — server-side reads + field-level privacy.
// ----------------------------------------------------------------------------
//  Reads ONLY directory_people / directory_memberships (service role; RLS has no
//  policies, so nothing else can). Never touches the lms_* roster.
//
//  Privacy is applied here, before anything leaves the server: for viewers who
//  aren't exec/webmaster, phone numbers are removed from the object entirely and
//  only @berkeley.edu emails are kept.
// ============================================================================

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { FullMembership, FullPerson, Job, PositionType } from "@/lib/fullDirectory/types";
import { majorLists } from "@/lib/fullDirectory/majors";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let _client: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase is not configured.");
  if (!_client)
    _client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  return _client;
}

const PAGE = 1000;
/** Every row, a page at a time — never the silent 1000-row cap. */
async function selectAll<T>(table: "directory_people" | "directory_memberships", columns: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb().from(table).select(columns).order("id").range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) return out;
  }
}

type PersonRow = {
  id: string; slug: string; full_name: string; emails: string[] | null; phones: string[] | null;
  grad_year: number | null; grad_year_inferred: boolean; major: string | null;
  joined_rishi: string | null; joined_rishi_approx: boolean; birthday: string | null;
  india_trips: string[] | null; hindi_level: string | null; linkedin: string | null;
  post_grad_plans: string | null; other_info: { label: string; value: string }[] | null;
  years_active: string[] | null; first_year: number | null; last_year: number | null;
  // v6 (migration-full-directory-v6.sql) — absent until that migration has run.
  current_job?: string | null; employment_history?: Partial<Job>[] | null; berkeley_years?: string | null;
};
type MembershipRow = {
  person_id: string; year: string; year_start: number | null; project_groups: string[] | null;
  not_yet_placed: boolean; positions: string[] | null; position_type: PositionType;
  class_standing: string | null; semesters_in_rishi: number | null; hiatus: string | null;
  hindi: string | null; india_trip: string | null;
};

const BASE_PERSON_COLUMNS =
  "id, slug, full_name, emails, phones, grad_year, grad_year_inferred, major, joined_rishi, joined_rishi_approx, birthday, india_trips, hindi_level, linkedin, post_grad_plans, other_info, years_active, first_year, last_year";
const PERSON_COLUMNS = `${BASE_PERSON_COLUMNS}, current_job, employment_history, berkeley_years`;

/** People with the v6 columns — or without them if that migration hasn't run yet,
 *  so deploying the code before the migration doesn't take the directory down. */
async function selectPeople(): Promise<PersonRow[]> {
  try {
    return await selectAll<PersonRow>("directory_people", PERSON_COLUMNS);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (!/current_job|employment_history|berkeley_years/.test(msg)) throw e;
    return selectAll<PersonRow>("directory_people", BASE_PERSON_COLUMNS);
  }
}

const int = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
function jobsOf(raw: PersonRow["employment_history"]): Job[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((j) => ({ title: str(j?.title), company: str(j?.company), start: int(j?.start), end: int(j?.end), current: j?.current === true }))
    .filter((j) => j.title || j.company);
}
const MEMBERSHIP_COLUMNS =
  "person_id, year, year_start, project_groups, not_yet_placed, positions, position_type, class_standing, semesters_in_rishi, hiatus, hindi, india_trip";

const isBerkeley = (e: string) => /@berkeley\.edu$/i.test(e.trim());

/** The whole directory, with private fields stripped unless `canSeePrivate`. */
export async function listFullDirectory(canSeePrivate: boolean): Promise<FullPerson[]> {
  const [people, memberships] = await Promise.all([
    selectPeople(),
    selectAll<MembershipRow>("directory_memberships", MEMBERSHIP_COLUMNS),
  ]);

  const byPerson = new Map<string, FullMembership[]>();
  for (const m of memberships) {
    const list = byPerson.get(m.person_id) ?? [];
    list.push({
      year: m.year,
      yearStart: m.year_start,
      groups: m.project_groups ?? [],
      notYetPlaced: m.not_yet_placed,
      positions: m.positions ?? [],
      positionType: m.position_type,
      classStanding: m.class_standing,
      semesters: m.semesters_in_rishi,
      hiatus: m.hiatus,
      hindi: m.hindi,
      indiaTrip: m.india_trip,
    });
    byPerson.set(m.person_id, list);
  }

  const majorsOf = majorLists(people.map((p) => p.major));
  return people
    .map((p, i) => {
      const person: FullPerson = {
        slug: p.slug,
        name: p.full_name,
        emails: (p.emails ?? []).filter((e) => canSeePrivate || isBerkeley(e)),
        gradYear: p.grad_year,
        gradYearInferred: p.grad_year_inferred,
        major: p.major,
        majors: majorsOf[i],
        joined: p.joined_rishi,
        joinedApprox: p.joined_rishi_approx,
        birthday: p.birthday,
        indiaTrips: p.india_trips ?? [],
        hindi: p.hindi_level,
        linkedin: p.linkedin,
        postGradPlans: p.post_grad_plans,
        currentRole: p.current_job ?? null,
        employment: jobsOf(p.employment_history),
        berkeleyYears: p.berkeley_years ?? null,
        otherInfo: p.other_info ?? [],
        years: p.years_active ?? [],
        firstYear: p.first_year,
        lastYear: p.last_year,
        memberships: (byPerson.get(p.id) ?? []).sort((a, b) => (a.yearStart ?? 9999) - (b.yearStart ?? 9999)),
      };
      // Phones are only ever attached for exec/webmaster — for everyone else the
      // key does not exist in the response at all.
      if (canSeePrivate) person.phones = p.phones ?? [];
      return person;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

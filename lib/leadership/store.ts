// ============================================================================
//  Leadership history — server-side reads and webmaster writes.
// ----------------------------------------------------------------------------
//  Reads/writes ONLY leadership_years / leadership_roles / leadership_holders,
//  and reads directory_people / directory_memberships for linked holders
//  (service role; RLS has no policies). Callers gate access:
//    GET  /api/lms/leadership        — members placed in a project group
//    POST /api/lms/leadership/admin  — webmasters only
//  Timestamps are never written here: the database sets created_at/updated_at.
// ============================================================================

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  SLOTS, STRUCTURES, isYearKey,
  type LeadershipData, type LeadershipHolder, type LeadershipRole, type LeadershipYear, type LinkedPerson, type Slot, type Structure,
} from "@/lib/leadership/types";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let _client: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase is not configured.");
  if (!_client) _client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  return _client;
}

const YEARS = "leadership_years", ROLES = "leadership_roles", HOLDERS = "leadership_holders";

/** A request the editor got wrong (shown to the webmaster as-is). */
export class LeadershipInputError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}
/** True when the tables haven't been created yet (migration not run). */
export const isNotReady = (e: unknown) =>
  /leadership_(years|roles|holders)|schema cache|does not exist/i.test(e instanceof Error ? e.message : "");

type YearRow = { year: string; structure: Structure; note: string | null };
type RoleRow = { id: string; year: string; title: string; slot: Slot; project_group: string | null; parent_role_id: string | null; sort_order: number };
type HolderRow = { id: string; role_id: string; display_name: string; directory_person_id: string | null; qualifier: string | null; note: string | null; sort_order: number };

const ROLE_COLS = "id, year, title, slot, project_group, parent_role_id, sort_order";
const HOLDER_COLS = "id, role_id, display_name, directory_person_id, qualifier, note, sort_order";

async function all<T>(table: string, cols: string, order: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb().from(table).select(cols).order(order).order("id").range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) return out;
  }
}
async function allYears(): Promise<YearRow[]> {
  const { data, error } = await sb().from(YEARS).select("year, structure, note").order("year");
  if (error) throw new Error(`${YEARS}: ${error.message}`);
  return (data ?? []) as YearRow[];
}

const toRole = (r: RoleRow): LeadershipRole => ({
  id: r.id, year: r.year, title: r.title, slot: r.slot, projectGroup: r.project_group, parentRoleId: r.parent_role_id, sortOrder: r.sort_order,
});
const toHolder = (h: HolderRow): LeadershipHolder => ({
  id: h.id, roleId: h.role_id, name: h.display_name, personId: h.directory_person_id, qualifier: h.qualifier, note: h.note, sortOrder: h.sort_order,
});

/** The Full Directory facts for the given people (only those still in the directory). */
async function linkedPeople(ids: string[]): Promise<Record<string, LinkedPerson>> {
  const out: Record<string, LinkedPerson> = {};
  for (let i = 0; i < ids.length; i += 150) {
    const chunk = ids.slice(i, i + 150);
    const [{ data: people, error: e1 }, { data: ms, error: e2 }] = await Promise.all([
      sb().from("directory_people").select("id, slug, full_name").in("id", chunk),
      sb().from("directory_memberships").select("person_id, year, project_groups, positions, position_type, not_yet_placed").in("person_id", chunk),
    ]);
    if (e1) throw new Error(`directory_people: ${e1.message}`);
    if (e2) throw new Error(`directory_memberships: ${e2.message}`);
    for (const p of people ?? []) out[p.id] = { id: p.id, slug: p.slug, name: p.full_name, memberships: [] };
    for (const m of ms ?? []) {
      out[m.person_id]?.memberships.push({
        year: m.year, groups: m.project_groups ?? [], positions: m.positions ?? [],
        positionType: m.position_type, notYetPlaced: m.not_yet_placed,
      });
    }
  }
  return out;
}

/** Everything Lore → Leadership shows: every year, role and holder, plus the
 *  directory facts for linked holders (for the person popup). Small: ~150 roles. */
export async function getLeadershipData(canEdit: boolean): Promise<LeadershipData> {
  const [years, roles, holders] = await Promise.all([
    allYears(),
    all<RoleRow>(ROLES, ROLE_COLS, "sort_order"),
    all<HolderRow>(HOLDERS, HOLDER_COLS, "sort_order"),
  ]);
  const ids = [...new Set(holders.map((h) => h.directory_person_id).filter((x): x is string => !!x))];
  return {
    years: years.map((y): LeadershipYear => ({ year: y.year, structure: y.structure, note: y.note })),
    roles: roles.map(toRole),
    holders: holders.map(toHolder),
    people: await linkedPeople(ids),
    canEdit,
  };
}

/** For the editor's directory picker: every Full Directory person, light. */
export async function listDirectoryPeople(): Promise<{ id: string; name: string; slug: string; years: string[] }[]> {
  const rows = await all<{ id: string; full_name: string; slug: string; years_active: string[] | null }>(
    "directory_people", "id, full_name, slug, years_active", "full_name",
  );
  return rows.map((r) => ({ id: r.id, name: r.full_name, slug: r.slug, years: r.years_active ?? [] }));
}

// ============================================================== writes (webmaster)
export type LeadershipOp =
  | { op: "year.create" | "year.update"; year: string; structure: Structure; note: string | null }
  | { op: "year.delete"; year: string }
  | { op: "role.create"; year: string; title: string; slot: Slot; projectGroup: string | null; parentRoleId: string | null }
  | { op: "role.update"; id: string; title: string; slot: Slot; projectGroup: string | null; parentRoleId: string | null }
  | { op: "role.delete" | "holder.delete"; id: string }
  | { op: "role.move" | "holder.move"; id: string; dir: -1 | 1 }
  | { op: "holder.create"; roleId: string; name: string; personId: string | null; qualifier: string | null; note: string | null }
  | { op: "holder.update"; id: string; name: string; personId: string | null; qualifier: string | null; note: string | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const text = (v: unknown, max = 200): string | null => {
  if (v === undefined || v === null) return null;
  if (typeof v !== "string") throw new LeadershipInputError("Expected text.");
  const t = v.replace(/\s+/g, " ").trim();
  if (t.length > max) throw new LeadershipInputError(`Keep it under ${max} characters.`);
  return t || null;
};
const required = (v: unknown, what: string, max = 200) => {
  const t = text(v, max);
  if (!t) throw new LeadershipInputError(`${what} is required.`);
  return t;
};
const uuid = (v: unknown, what: string) => {
  if (typeof v !== "string" || !UUID.test(v)) throw new LeadershipInputError(`${what} is missing or malformed.`);
  return v;
};
const optUuid = (v: unknown, what: string) => (v === null || v === undefined || v === "" ? null : uuid(v, what));

/** Validate an editor request's shape. Throws LeadershipInputError. */
export function parseOp(body: unknown): LeadershipOp {
  const b = (body ?? {}) as Record<string, unknown>;
  const year = () => {
    const y = required(b.year, "Year", 9);
    if (!isYearKey(y)) throw new LeadershipInputError('Year must look like "2024-2025".');
    return y;
  };
  const structure = () => {
    if (!STRUCTURES.includes(b.structure as Structure)) throw new LeadershipInputError("Pick a structure.");
    return b.structure as Structure;
  };
  const slot = () => {
    if (!SLOTS.includes(b.slot as Slot)) throw new LeadershipInputError("Pick a slot.");
    return b.slot as Slot;
  };
  const dir = () => {
    if (b.dir !== 1 && b.dir !== -1) throw new LeadershipInputError("Direction must be 1 or -1.");
    return b.dir;
  };
  switch (b.op) {
    case "year.create": case "year.update":
      return { op: b.op, year: year(), structure: structure(), note: text(b.note, 300) };
    case "year.delete":
      return { op: b.op, year: year() };
    case "role.create":
      return { op: b.op, year: year(), title: required(b.title, "Title"), slot: slot(), projectGroup: text(b.projectGroup, 80), parentRoleId: optUuid(b.parentRoleId, "Parent role") };
    case "role.update":
      return { op: b.op, id: uuid(b.id, "Role"), title: required(b.title, "Title"), slot: slot(), projectGroup: text(b.projectGroup, 80), parentRoleId: optUuid(b.parentRoleId, "Parent role") };
    case "role.delete": case "holder.delete":
      return { op: b.op, id: uuid(b.id, "Row") };
    case "role.move": case "holder.move":
      return { op: b.op, id: uuid(b.id, "Row"), dir: dir() };
    case "holder.create":
      return { op: b.op, roleId: uuid(b.roleId, "Role"), name: required(b.name, "Name", 120), personId: optUuid(b.personId, "Directory link"), qualifier: text(b.qualifier, 120), note: text(b.note, 300) };
    case "holder.update":
      return { op: b.op, id: uuid(b.id, "Holder"), name: required(b.name, "Name", 120), personId: optUuid(b.personId, "Directory link"), qualifier: text(b.qualifier, 120), note: text(b.note, 300) };
    default:
      throw new LeadershipInputError("Unknown operation.");
  }
}

function fail(error: { code?: string; message: string }, what: string): never {
  if (error.code === "23505") throw new LeadershipInputError(`${what} already exists.`, 409);
  if (error.code === "23503") throw new LeadershipInputError(`${what} refers to something that no longer exists.`, 409);
  throw new Error(error.message);
}
async function one<T>(table: string, cols: string, col: string, val: string): Promise<T | null> {
  const { data, error } = await sb().from(table).select(cols).eq(col, val).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as T | null) ?? null;
}

/** A parent must be another role in the same year, and must not sit beneath this one. */
async function checkParent(roleId: string | null, year: string, parentId: string | null) {
  if (!parentId) return;
  if (parentId === roleId) throw new LeadershipInputError("A role can't be its own parent.");
  const { data, error } = await sb().from(ROLES).select("id, year, parent_role_id").eq("year", year);
  if (error) throw new Error(error.message);
  const byId = new Map((data ?? []).map((r) => [r.id as string, r as { id: string; year: string; parent_role_id: string | null }]));
  if (!byId.has(parentId)) throw new LeadershipInputError("The parent role must be in the same year.");
  for (let p = byId.get(parentId), seen = 0; p && seen < 500; p = p.parent_role_id ? byId.get(p.parent_role_id) : undefined, seen++)
    if (p.id === roleId) throw new LeadershipInputError("That parent sits beneath this role.");
}
async function checkPerson(personId: string | null) {
  if (!personId) return;
  if (!(await one("directory_people", "id", "id", personId))) throw new LeadershipInputError("That Full Directory record no longer exists.");
}

/** Rewrite sort orders as 0..n-1 after moving one item up or down. */
async function move(table: string, scopeCol: "year" | "role_id", id: string, dir: -1 | 1) {
  const row = await one<{ year?: string; role_id?: string }>(table, scopeCol, "id", id);
  if (!row) throw new LeadershipInputError("That row no longer exists.", 404);
  const { data, error } = await sb().from(table).select("id, sort_order").eq(scopeCol, row[scopeCol] as string).order("sort_order").order("id");
  if (error) throw new Error(error.message);
  const ids = (data ?? []).map((r) => r.id as string);
  const i = ids.indexOf(id), j = i + dir;
  if (j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  const current = new Map((data ?? []).map((r) => [r.id as string, r.sort_order as number]));
  for (const [k, rid] of ids.entries()) {
    if (current.get(rid) === k) continue;
    const { error: e } = await sb().from(table).update({ sort_order: k }).eq("id", rid);
    if (e) throw new Error(e.message);
  }
}
async function nextOrder(table: string, col: "year" | "role_id", val: string) {
  const { data, error } = await sb().from(table).select("sort_order").eq(col, val).order("sort_order", { ascending: false }).limit(1);
  if (error) throw new Error(error.message);
  return ((data?.[0]?.sort_order as number | undefined) ?? -1) + 1;
}

export async function applyOp(o: LeadershipOp): Promise<void> {
  switch (o.op) {
    case "year.create": {
      const { error } = await sb().from(YEARS).insert({ year: o.year, structure: o.structure, note: o.note });
      if (error) fail(error, `Year ${o.year}`);
      return;
    }
    case "year.update": {
      const { data, error } = await sb().from(YEARS).update({ structure: o.structure, note: o.note }).eq("year", o.year).select("year");
      if (error) fail(error, `Year ${o.year}`);
      if (!data?.length) throw new LeadershipInputError("That year no longer exists.", 404);
      return;
    }
    case "year.delete": {
      const { error } = await sb().from(YEARS).delete().eq("year", o.year);
      if (error) fail(error, `Year ${o.year}`);
      return;
    }
    case "role.create": {
      if (!(await one(YEARS, "year", "year", o.year))) throw new LeadershipInputError("Add the year first.");
      await checkParent(null, o.year, o.parentRoleId);
      const { error } = await sb().from(ROLES).insert({
        year: o.year, title: o.title, slot: o.slot, project_group: o.projectGroup, parent_role_id: o.parentRoleId,
        sort_order: await nextOrder(ROLES, "year", o.year),
      });
      if (error) fail(error, `A role called "${o.title}" in ${o.year}`);
      return;
    }
    case "role.update": {
      const cur = await one<{ year: string }>(ROLES, "year", "id", o.id);
      if (!cur) throw new LeadershipInputError("That role no longer exists.", 404);
      await checkParent(o.id, cur.year, o.parentRoleId);
      const { error } = await sb().from(ROLES)
        .update({ title: o.title, slot: o.slot, project_group: o.projectGroup, parent_role_id: o.parentRoleId }).eq("id", o.id);
      if (error) fail(error, `A role called "${o.title}" in ${cur.year}`);
      return;
    }
    case "role.delete": case "holder.delete": {
      const table = o.op === "role.delete" ? ROLES : HOLDERS;
      const { error } = await sb().from(table).delete().eq("id", o.id);
      if (error) fail(error, "That row");
      return;
    }
    case "role.move": return move(ROLES, "year", o.id, o.dir);
    case "holder.move": return move(HOLDERS, "role_id", o.id, o.dir);
    case "holder.create": {
      if (!(await one(ROLES, "id", "id", o.roleId))) throw new LeadershipInputError("That role no longer exists.", 404);
      await checkPerson(o.personId);
      const { error } = await sb().from(HOLDERS).insert({
        role_id: o.roleId, display_name: o.name, directory_person_id: o.personId, qualifier: o.qualifier, note: o.note,
        sort_order: await nextOrder(HOLDERS, "role_id", o.roleId),
      });
      if (error) fail(error, `${o.name} in that role`);
      return;
    }
    case "holder.update": {
      await checkPerson(o.personId);
      const { data, error } = await sb().from(HOLDERS)
        .update({ display_name: o.name, directory_person_id: o.personId, qualifier: o.qualifier, note: o.note }).eq("id", o.id).select("id");
      if (error) fail(error, `${o.name} in that role`);
      if (!data?.length) throw new LeadershipInputError("That holder no longer exists.", 404);
      return;
    }
  }
}

// Person popup data: everything one person did in RISHI, by year, newest first.
// A person is identified by their STORED Full Directory id (holder.personId).
// Holders that aren't linked are identified by their exact display name among
// unlinked holders only — never matched to a directory record by name.

import type { LeadershipData, LeadershipHolder, LinkedPerson } from "./types";

export type PersonKey = string; // "id:<directory uuid>" | "name:<display name>"
export const personKeyOf = (h: Pick<LeadershipHolder, "personId" | "name">): PersonKey =>
  h.personId ? `id:${h.personId}` : `name:${h.name}`;

export type HistoryRole = { title: string; qualifier: string | null; note: string | null };
export type HistoryRow = {
  year: string;
  roles: HistoryRole[];
  /** From the Full Directory, when the person is linked and has that year. */
  groups: string[];
  positions: string[];
  positionType: LinkedPerson["memberships"][number]["positionType"] | null;
  notYetPlaced: boolean;
};
export type PersonHistory = {
  key: PersonKey;
  name: string;
  /** Full Directory record, when linked. */
  person: LinkedPerson | null;
  rows: HistoryRow[];
};

const yearRank = (y: string) => (/^\d{4}-\d{4}$/.test(y) ? Number(y.slice(0, 4)) : -1); // "alumni" last

export function personHistory(data: LeadershipData, key: PersonKey): PersonHistory | null {
  const holders = data.holders.filter((h) => personKeyOf(h) === key);
  const personId = key.startsWith("id:") ? key.slice(3) : null;
  const person = personId ? data.people[personId] ?? null : null;
  if (!holders.length && !person) return null;

  const roleById = new Map(data.roles.map((r) => [r.id, r]));
  const rows = new Map<string, HistoryRow>();
  const row = (year: string) => {
    let r = rows.get(year);
    if (!r) rows.set(year, (r = { year, roles: [], groups: [], positions: [], positionType: null, notYetPlaced: false }));
    return r;
  };
  for (const m of person?.memberships ?? []) {
    const r = row(m.year);
    r.groups = m.groups;
    r.positions = m.positions;
    r.positionType = m.positionType;
    r.notYetPlaced = m.notYetPlaced;
  }
  // Leadership roles, in the order the tree shows them.
  const ordered = holders
    .map((h) => ({ h, role: roleById.get(h.roleId) }))
    .filter((x): x is { h: LeadershipHolder; role: NonNullable<typeof x.role> } => !!x.role)
    .sort((a, b) => a.role.sortOrder - b.role.sortOrder || a.h.sortOrder - b.h.sortOrder);
  for (const { h, role } of ordered) row(role.year).roles.push({ title: role.title, qualifier: h.qualifier, note: h.note });

  return {
    key,
    name: person?.name ?? holders[0].name,
    person,
    rows: [...rows.values()].sort((a, b) => yearRank(b.year) - yearRank(a.year)),
  };
}

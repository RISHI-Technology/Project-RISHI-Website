// Full Directory — sorting and "group by" of filtered results.
import { ALUMNI_YEAR, POSITION_TYPE_LABELS, POSITION_TYPE_ORDER, type FullMembership, type FullPerson } from "@/lib/fullDirectory/types";
import type { GroupBy, SortKey } from "@/components/fullDirectory/filters";
import { TYPE_RANK, groupsOf, longYear, roleOf, topMembership } from "@/components/fullDirectory/model";

/** One person in the results, with the years that are relevant to show. */
export type Row = { person: FullPerson; context: FullMembership[]; best: FullMembership | null; score: number };
export type Section = { key: string; title: string; rows: Row[] };

const byName = (a: Row, b: Row) => a.person.name.localeCompare(b.person.name);
/** Compare with empty values always last, whichever the direction. */
function cmp<T extends string | number>(a: T | null, b: T | null, dir: 1 | -1): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return (typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b))) * dir;
}

export function sortRows(rows: Row[], key: SortKey, dirStr: "asc" | "desc"): Row[] {
  const dir = dirStr === "desc" ? -1 : 1;
  const out = [...rows];
  out.sort((a, b) => {
    switch (key) {
      case "relevance": return b.score - a.score || byName(a, b);
      case "years": return cmp(a.person.firstYear, b.person.firstYear, dir) || cmp(a.person.lastYear, b.person.lastYear, dir) || byName(a, b);
      case "group": return cmp(groupsOf(a.context)[0] ?? null, groupsOf(b.context)[0] ?? null, dir) || byName(a, b);
      case "position": {
        // "asc" = most senior first: it's the natural reading order for a rank.
        const ra = TYPE_RANK[topMembership(a.context)?.positionType ?? "member"];
        const rb = TYPE_RANK[topMembership(b.context)?.positionType ?? "member"];
        return (rb - ra) * dir || roleOf(a.context).label.localeCompare(roleOf(b.context).label) || byName(a, b);
      }
      case "grad": return cmp(a.person.gradYear, b.person.gradYear, dir) || byName(a, b);
      case "major": return cmp(a.person.majors[0] ?? a.person.minors[0] ?? null, b.person.majors[0] ?? b.person.minors[0] ?? null, dir) || byName(a, b);
      default: return byName(a, b) * dir;
    }
  });
  return out;
}

/** Split sorted rows into sections. A person can appear in several (one per year or group). */
export function groupRows(rows: Row[], by: GroupBy): Section[] {
  if (!by) return [{ key: "all", title: "", rows }];
  const sections = new Map<string, Section>();
  const add = (key: string, title: string, row: Row) => {
    const s = sections.get(key) ?? { key, title, rows: [] };
    s.rows.push(row);
    sections.set(key, s);
  };
  for (const r of rows) {
    if (by === "year") {
      for (const m of r.context) add(m.year, longYear(m.year), { ...r, context: [m] });
    } else if (by === "group") {
      const gs = groupsOf(r.context);
      if (!gs.length) add("~none", "No project group recorded", { ...r, context: r.context });
      for (const g of gs) add(g, g, { ...r, context: r.context.filter((m) => m.groups.includes(g)) });
    } else {
      const top = topMembership(r.context)?.positionType ?? "member";
      add(top, POSITION_TYPE_LABELS[top], { ...r, context: r.context.filter((m) => m.positionType === top) });
    }
  }
  const list = Array.from(sections.values());
  if (by === "year") return list.sort((a, b) => (a.key === ALUMNI_YEAR ? 1 : b.key === ALUMNI_YEAR ? -1 : b.key.localeCompare(a.key)));
  if (by === "position") return list.sort((a, b) => POSITION_TYPE_ORDER.indexOf(a.key as never) - POSITION_TYPE_ORDER.indexOf(b.key as never));
  return list.sort((a, b) => (a.key === "~none" ? 1 : b.key === "~none" ? -1 : b.rows.length - a.rows.length || a.title.localeCompare(b.title)));
}

// Full Directory — small pure helpers shared by the views.
import {
  ALUMNI_YEAR, CURRENT_YEAR, type FullMembership, type FullPerson, type Job, type PositionType,
} from "@/lib/fullDirectory/types";

export const TYPE_RANK: Record<PositionType, number> = { exec: 3, lead: 2, other: 1, member: 0 };

/** "2019-2020" → "2019–20"; "alumni" → "Alumni". */
export const shortYear = (y: string) => (y === ALUMNI_YEAR ? "Alumni" : `${y.slice(0, 4)}–${y.slice(7, 9)}`);
/** "2019-2020" → "2019–2020"; "alumni" → "Alumni (years unknown)". */
export const longYear = (y: string) => (y === ALUMNI_YEAR ? "Alumni (years unknown)" : y.replace("-", "–"));

export const isCurrent = (p: FullPerson) => p.years.includes(CURRENT_YEAR);

/** "2019–2023", "2021–22", or "Alumni". */
export function yearSpan(p: FullPerson): string {
  if (p.firstYear === null || p.lastYear === null) return "Alumni";
  if (p.firstYear === p.lastYear) return `${p.firstYear}–${String(p.firstYear + 1).slice(2)}`;
  return `${p.firstYear}–${p.lastYear + 1}`;
}

/** Most senior membership; ties go to the most recent year. */
export function topMembership(ms: FullMembership[]): FullMembership | null {
  let best: FullMembership | null = null;
  for (const m of ms) {
    if (!best) { best = m; continue; }
    const d = TYPE_RANK[m.positionType] - TYPE_RANK[best.positionType];
    if (d > 0 || (d === 0 && (m.yearStart ?? -1) > (best.yearStart ?? -1))) best = m;
  }
  return best;
}

/** The role to show for a set of memberships: its most senior title. */
export function roleOf(ms: FullMembership[]): { label: string; type: PositionType; year: string | null } {
  const top = topMembership(ms);
  if (!top || !top.positions.length) return { label: "General Member", type: "member", year: top?.year ?? null };
  const sorted = [...top.positions].sort((a, b) => TYPE_RANK[typeOfTitle(b)] - TYPE_RANK[typeOfTitle(a)]);
  return { label: sorted.join(" · "), type: top.positionType, year: top.year };
}

/** Client-side mirror of the import script's rule, used only to order titles within one year. */
function typeOfTitle(t: string): PositionType {
  const s = t.toLowerCase();
  if (s === "director of technology") return "other"; // not an exec position
  if (/\bco-?founder\b|\bpresident\b|\bdirector\b|^exec\b/.test(s)) return "exec";
  if (/\blead\b/.test(s)) return "lead";
  if (/member$/.test(s)) return "member";
  return "other";
}

export type PastRole = { title: string; years: string[] };
/** Every other non-member title a person held (any year), minus the ones on display.
 *  Feeds the small "+n" bubble beside the role. Oldest first. */
export function otherRoles(ms: FullMembership[], shownLabel: string): PastRole[] {
  const shown = new Set(shownLabel.split(" · "));
  const byTitle = new Map<string, string[]>();
  for (const m of [...ms].sort((a, b) => (a.yearStart ?? 9999) - (b.yearStart ?? 9999)))
    for (const t of m.positions) {
      if (typeOfTitle(t) === "member" || shown.has(t)) continue;
      byTitle.set(t, [...(byTitle.get(t) ?? []), m.year]);
    }
  return Array.from(byTitle, ([title, years]) => ({ title, years }));
}

/** Distinct groups across memberships, most recent first. */
export function groupsOf(ms: FullMembership[]): string[] {
  const out: string[] = [];
  for (const m of [...ms].sort((a, b) => (b.yearStart ?? -1) - (a.yearStart ?? -1)))
    for (const g of m.groups) if (!out.includes(g)) out.push(g);
  return out;
}

/** Colours per group — the dashboard's lane colours (light + dark values in CSS variables). */
export function laneFor(group: string): { background: string; color: string } {
  const lane =
    /education/i.test(group) ? "e"
    : /water|watsan|rainwater/i.test(group) ? "r"
    : /women/i.test(group) ? "w"
    : /health/i.test(group) ? "h"
    : /agriculture/i.test(group) ? "nmt"
    : "other";
  return { background: `var(--lane-${lane}-bg)`, color: `var(--lane-${lane}-fg)` };
}

export const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

/** Stable tint per person so the grid isn't a wall of identical circles. */
export function tintFor(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return h % 4;
}

// ------------------------------------------------------------------ career
/** Consecutive jobs at one employer, shown together (newest first). */
export type JobGroup = { company: string | null; jobs: Job[]; start: number | null; end: number | null; current: boolean; endUnknown: boolean };

const sameEmployer = (a: string | null, b: string | null) =>
  !!a && !!b && a.toLowerCase().replace(/[^a-z0-9]/g, "") === b.toLowerCase().replace(/[^a-z0-9]/g, "");

export function groupJobs(jobs: Job[]): JobGroup[] {
  const out: JobGroup[] = [];
  for (const j of jobs) {
    const last = out[out.length - 1];
    if (last && sameEmployer(last.company, j.company)) last.jobs.push(j);
    else out.push({ company: j.company, jobs: [j], start: null, end: null, current: false, endUnknown: false });
  }
  const max = (ys: (number | null)[]) => { const v = ys.filter((y): y is number => y !== null); return v.length ? Math.max(...v) : null; };
  for (const g of out) {
    const starts = g.jobs.map((j) => j.start).filter((y): y is number => y !== null);
    const knownEnd = max(g.jobs.filter((j) => !j.endUnknown).map((j) => j.end ?? j.start));
    const unknownStart = max(g.jobs.filter((j) => j.endUnknown).map((j) => j.start));
    g.start = starts.length ? Math.min(...starts) : null;
    g.current = g.jobs.some((j) => j.current);
    // The span ends with an unknown year when its latest role is a "–?" one.
    g.endUnknown = !g.current && unknownStart !== null && (knownEnd === null || unknownStart >= knownEnd);
    g.end = g.current || g.endUnknown ? null : knownEnd;
  }
  return out;
}

/** "2021 – 2023", "2023 – Present", "2020 – ?" (ended, year unknown), "2022". */
export function jobDates(start: number | null, end: number | null, current: boolean, endUnknown = false): string {
  if (start === null) return current ? "Present" : end !== null ? String(end) : "";
  if (current) return `${start} – Present`;
  if (endUnknown) return `${start} – ?`;
  if (end === null || end === start) return String(start);
  return `${start} – ${end}`;
}

/** "3 yrs" — years only, since the sheet has no months; "" when under a year, undated
 *  or the end year is unknown. */
export function jobLength(start: number | null, end: number | null, current: boolean, endUnknown = false, now = new Date().getFullYear()): string {
  if (start === null || endUnknown) return "";
  const n = (current ? now : end ?? start) - start;
  return n >= 1 ? `${n} ${n === 1 ? "yr" : "yrs"}` : "";
}

/** The person's present job, for one-line display: the "Current role" column, else
 *  their current employment entry. */
export function currentRoleOf(p: FullPerson): string | null {
  if (p.currentRole) return p.currentRole;
  const j = p.employment.find((x) => x.current);
  return j ? [j.title, j.company].filter(Boolean).join(", ") : null;
}

export const personHref =(slug: string) => `/dashboard/directory?view=full&person=${encodeURIComponent(slug)}`;

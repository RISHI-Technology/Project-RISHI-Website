// ============================================================================
//  Full Directory — filter/sort/view state (lives in the URL) and filtering.
// ----------------------------------------------------------------------------
//  Year, project group, position and hiatus filters apply to the SAME year:
//  "2019–20" + "Health" means Health in 2019–20, not Health some year and
//  around in 2019–20. Everything else filters on the person.
// ============================================================================

import {
  ALUMNI_YEAR, CURRENT_YEAR, POSITION_TYPE_LABELS, type FullMembership, type FullPerson, type PositionType,
} from "@/lib/fullDirectory/types";
import { isCurrent, longYear, shortYear } from "@/components/fullDirectory/model";

export type YearMode = "any" | "all" | "range";
export type SortKey = "relevance" | "name" | "years" | "group" | "position" | "grad" | "major";
export type GroupBy = "" | "year" | "group" | "position";
export type Layout = "table" | "cards";
export type ColKey = "years" | "group" | "position" | "grad" | "major" | "trip" | "hindi" | "contact";

/** Table columns (Name is always shown). "Contact" = email, plus phone for exec. */
export const ALL_COLS: { key: ColKey; label: string }[] = [
  { key: "years", label: "Years" },
  { key: "group", label: "Project group" },
  { key: "position", label: "Position" },
  { key: "grad", label: "Class of" },
  { key: "major", label: "Major" },
  { key: "trip", label: "India trip" },
  { key: "hindi", label: "Hindi" },
  { key: "contact", label: "Contact" },
];
export const DEFAULT_COLS: ColKey[] = ["years", "group", "position", "grad", "major", "contact"];

/** The column each sort reads from: sorting by it shows that column even if hidden. */
export const SORT_COL: Partial<Record<SortKey, ColKey>> = {
  years: "years", group: "group", position: "position", grad: "grad", major: "major",
};

export type DirState = {
  q: string;
  years: string[];
  yearMode: YearMode;
  from: number | null;
  to: number | null;
  groups: string[];
  ptypes: PositionType[];
  positions: string[];
  trips: string[]; // "any" = has any India trip
  grads: string[];
  /** Subjects — each matches a person's majors OR minors. */
  majors: string[];
  /** "any" = has at least one checked subject; "all" = has every checked subject. */
  majorMode: "any" | "all";
  companies: string[];
  hindi: string[];
  status: "" | "current" | "alumni";
  contact: ContactKind[];
  hiatus: boolean;
  sort: SortKey | null; // null = default (relevance while searching, else name)
  dir: "asc" | "desc";
  layout: Layout | null; // null = remembered choice / default
  groupBy: GroupBy;
  cols: ColKey[] | null; // null = default columns
  person: string | null;
};

/** "Contact info" checkboxes. Email and phone are exec/webmaster only; LinkedIn is
 *  visible to every member (as it already is on each person), so anyone can filter on it. */
export type ContactKind = "email" | "phone" | "linkedin";
const CONTACT_KINDS: ContactKind[] = ["email", "phone", "linkedin"];
const PRIVATE_CONTACT: ContactKind[] = ["email", "phone"];
/** The contact checkboxes this viewer may use (any others in a shared link are ignored). */
export const usableContact = (s: Pick<DirState, "contact">, canSeePrivate: boolean): ContactKind[] =>
  canSeePrivate ? s.contact : s.contact.filter((c) => !PRIVATE_CONTACT.includes(c));
const CONTACT_CHIP: Record<ContactKind, string> = { email: "Has email", phone: "Has phone", linkedin: "Has LinkedIn" };

export const EMPTY_FILTERS: Pick<DirState,
  "years" | "yearMode" | "from" | "to" | "groups" | "ptypes" | "positions" | "trips" | "grads" | "majors" | "majorMode" | "companies" | "hindi" | "status" | "contact" | "hiatus"> = {
  years: [], yearMode: "any", from: null, to: null, groups: [], ptypes: [], positions: [], trips: [],
  grads: [], majors: [], majorMode: "any", companies: [], hindi: [], status: "", contact: [], hiatus: false,
};

const PTYPES: PositionType[] = ["exec", "lead", "member", "other"];
const SORTS: SortKey[] = ["relevance", "name", "years", "group", "position", "grad", "major"];
const COLS = ALL_COLS.map((c) => c.key);
const int = (v: string | null) => (v && /^\d{4}$/.test(v) ? Number(v) : null);

export function parseState(sp: URLSearchParams): DirState {
  const list = (k: string) => sp.getAll(k).flatMap((v) => v.split("~")).map((v) => v.trim()).filter(Boolean);
  const ym = sp.get("ym");
  const sort = sp.get("sort") as SortKey | null;
  const layout = sp.get("layout");
  const by = sp.get("by");
  const status = sp.get("status");
  const cols = sp.has("cols") ? list("cols").filter((c): c is ColKey => (COLS as string[]).includes(c)) : null;
  return {
    q: sp.get("q") ?? "",
    years: list("years"),
    yearMode: ym === "all" || ym === "range" ? ym : "any",
    from: int(sp.get("from")),
    to: int(sp.get("to")),
    groups: list("groups"),
    ptypes: list("ptype").filter((t): t is PositionType => (PTYPES as string[]).includes(t)),
    positions: list("pos"),
    trips: list("trip"),
    grads: list("grad"),
    majors: list("major"),
    majorMode: sp.get("mm") === "all" ? "all" : "any",
    companies: list("co"),
    hindi: list("hindi"),
    status: status === "current" || status === "alumni" ? status : "",
    contact: list("contact").filter((c): c is ContactKind => (CONTACT_KINDS as string[]).includes(c)),
    hiatus: sp.get("hiatus") === "1",
    sort: sort && SORTS.includes(sort) ? sort : null,
    dir: sp.get("dir") === "desc" ? "desc" : "asc",
    layout: layout === "table" || layout === "cards" ? layout : null,
    groupBy: by === "year" || by === "group" || by === "position" ? by : "",
    cols,
    person: canonicalPersonSlug(sp.get("person")),
  };
}

/** Profile links from before a person was renamed (old slug → current slug), so
 *  saved links keep working. Mirrors PERSON_RENAMES in scripts/import-full-directory.mjs. */
export const PERSON_SLUG_REDIRECTS: Record<string, string> = {
  bani: "bani-bedi",
  rushabh: "rushabh-shah",
  suraj: "suraj-patel",
};
export const canonicalPersonSlug = (slug: string | null): string | null =>
  slug && Object.hasOwn(PERSON_SLUG_REDIRECTS, slug) ? PERSON_SLUG_REDIRECTS[slug] : slug;

/** State → query string (defaults omitted, so shared links stay short). */
export function toQuery(s: DirState): string {
  const p = new URLSearchParams();
  p.set("view", "full");
  const setList = (k: string, v: string[]) => { if (v.length) p.set(k, v.join("~")); };
  if (s.q.trim()) p.set("q", s.q);
  if (s.yearMode === "range") {
    p.set("ym", "range");
    if (s.from !== null) p.set("from", String(s.from));
    if (s.to !== null) p.set("to", String(s.to));
  } else {
    setList("years", s.years);
    if (s.yearMode === "all") p.set("ym", "all");
  }
  setList("groups", s.groups);
  setList("ptype", s.ptypes);
  setList("pos", s.positions);
  setList("trip", s.trips);
  setList("grad", s.grads);
  setList("major", s.majors);
  if (s.majors.length && s.majorMode === "all") p.set("mm", "all");
  setList("co", s.companies);
  setList("hindi", s.hindi);
  if (s.status) p.set("status", s.status);
  setList("contact", s.contact);
  if (s.hiatus) p.set("hiatus", "1");
  if (s.sort) p.set("sort", s.sort);
  if (s.sort && s.dir === "desc") p.set("dir", "desc");
  if (s.layout) p.set("layout", s.layout);
  if (s.groupBy) p.set("by", s.groupBy);
  if (s.cols) p.set("cols", s.cols.join("~"));
  if (s.person) p.set("person", s.person);
  return p.toString();
}

// ----------------------------------------------------------------- filtering
export type Facet = "years" | "groups" | "ptypes" | "positions" | "trips" | "grads" | "majors" | "companies" | "hindi" | "status" | "contact" | "hiatus";

/** A person who passed the filters, with the years that made them pass. */
export type Match = { person: FullPerson; context: FullMembership[] };

const hindiValues = (s: string | null) => (s ?? "").split("|").map((x) => x.trim()).filter(Boolean);
/** Every employer in a person's history (current & past), as written. */
export const personCompanies = (p: FullPerson) =>
  Array.from(new Set(p.employment.map((j) => j.company).filter((c): c is string => !!c)));
/** Every subject a person studied: majors and minors (what the Major filter matches). */
export const personSubjects = (p: FullPerson) => Array.from(new Set([...p.majors, ...p.minors]));
/** Does the person match the checked subjects, under "any" or "all"? */
export function matchesSubjects(p: FullPerson, picked: string[], mode: DirState["majorMode"]): boolean {
  if (!picked.length) return true;
  const mine = personSubjects(p);
  return mode === "all" ? picked.every((m) => mine.includes(m)) : picked.some((m) => mine.includes(m));
}
export const personHindi = (p: FullPerson) =>
  Array.from(new Set([...hindiValues(p.hindi), ...p.memberships.flatMap((m) => hindiValues(m.hindi))]));

export function hasFilters(s: DirState, canSeePrivate: boolean): boolean {
  return activeCount(s, canSeePrivate) > 0;
}
export function activeCount(s: DirState, canSeePrivate: boolean): number {
  return (s.yearMode === "range" ? (s.from !== null || s.to !== null ? 1 : 0) : s.years.length)
    + s.groups.length + s.ptypes.length + s.positions.length + s.trips.length + s.grads.length
    + s.majors.length + s.companies.length + s.hindi.length + (s.status ? 1 : 0) + usableContact(s, canSeePrivate).length + (s.hiatus ? 1 : 0);
}

export function applyFilters(people: FullPerson[], s: DirState, canSeePrivate: boolean, skip?: Facet): Match[] {
  const use = (f: Facet) => f !== skip;
  const groups = use("groups") ? s.groups : [];
  const ptypes = use("ptypes") ? s.ptypes : [];
  const positions = use("positions") ? s.positions : [];
  const hiatus = use("hiatus") && s.hiatus;
  const yearsOn = use("years") && (s.yearMode === "range" ? s.from !== null || s.to !== null : s.years.length > 0);
  const lo = s.from ?? -Infinity, hi = s.to ?? Infinity;

  const msOk = (m: FullMembership) =>
    (!groups.length || m.groups.some((g) => groups.includes(g)))
    && (!ptypes.length || ptypes.includes(m.positionType))
    && (!positions.length || m.positions.some((p) => positions.includes(p)))
    && (!hiatus || !!m.hiatus);
  const msFiltering = groups.length > 0 || ptypes.length > 0 || positions.length > 0 || hiatus;

  const out: Match[] = [];
  for (const p of people) {
    // ---- person-level
    if (use("trips") && s.trips.length) {
      const anyTrip = s.trips.includes("any");
      if (!(anyTrip ? p.indiaTrips.length > 0 : p.indiaTrips.some((t) => s.trips.includes(t)))) continue;
    }
    if (use("grads") && s.grads.length && !(p.gradYear && s.grads.includes(String(p.gradYear)))) continue;
    if (use("majors") && !matchesSubjects(p, s.majors, s.majorMode)) continue;
    if (use("companies") && s.companies.length && !personCompanies(p).some((c) => s.companies.includes(c))) continue;
    if (use("hindi") && s.hindi.length && !personHindi(p).some((h) => s.hindi.includes(h))) continue;
    if (use("status") && s.status === "current" && !isCurrent(p)) continue;
    if (use("status") && s.status === "alumni" && isCurrent(p)) continue;
    if (use("contact")) {
      const contact = usableContact(s, canSeePrivate);
      if (contact.includes("email") && !p.emails.length) continue;
      if (contact.includes("phone") && !p.phones?.length) continue;
      if (contact.includes("linkedin") && !p.linkedin) continue;
    }

    // ---- year-level (all conditions on the same year)
    if (!yearsOn && !msFiltering) { out.push({ person: p, context: p.memberships }); continue; }
    const ok = p.memberships.filter(msOk);
    let context: FullMembership[];
    if (!yearsOn) context = ok;
    else if (s.yearMode === "range") context = ok.filter((m) => m.yearStart !== null && m.yearStart >= lo && m.yearStart <= hi);
    else if (s.yearMode === "all") {
      const hit = ok.filter((m) => s.years.includes(m.year));
      context = s.years.every((y) => hit.some((m) => m.year === y)) ? hit : [];
    } else context = ok.filter((m) => s.years.includes(m.year));
    if (context.length) out.push({ person: p, context });
  }
  return out;
}

// -------------------------------------------------------------- facet options
export type Option = { value: string; label: string; count: number; hint?: string };

const tally = (matches: Match[], f: (m: Match) => string[]) => {
  const c = new Map<string, number>();
  for (const m of matches) for (const v of Array.from(new Set(f(m)))) c.set(v, (c.get(v) ?? 0) + 1);
  return c;
};

/** Options for every filter, counted against all OTHER active filters. */
export function facetOptions(people: FullPerson[], s: DirState, canSeePrivate: boolean) {
  const base = (f: Facet) => applyFilters(people, s, canSeePrivate, f);
  const allYears = Array.from(new Set(people.flatMap((p) => p.memberships.map((m) => m.year))))
    .sort((a, b) => (a === ALUMNI_YEAR ? 1 : b === ALUMNI_YEAR ? -1 : a.localeCompare(b)));
  const yearC = tally(base("years"), (m) => m.context.map((x) => x.year));
  const groupC = tally(base("groups"), (m) => m.context.flatMap((x) => x.groups));
  const typeC = tally(base("ptypes"), (m) => m.context.map((x) => x.positionType));
  const posC = tally(base("positions"), (m) => m.context.flatMap((x) => x.positions));
  const tripC = tally(base("trips"), (m) => [...m.person.indiaTrips, ...(m.person.indiaTrips.length ? ["any"] : [])]);
  const gradC = tally(base("grads"), (m) => (m.person.gradYear ? [String(m.person.gradYear)] : []));
  // Subject counts: with "Match all", count among people who already have every
  // checked subject (so the number is what checking one more would leave).
  const subjectBase = s.majorMode === "all" && s.majors.length
    ? base("majors").filter((m) => matchesSubjects(m.person, s.majors, "all"))
    : base("majors");
  const majorC = tally(subjectBase, (m) => personSubjects(m.person));
  const asMajor = tally(subjectBase, (m) => m.person.majors);
  const asMinor = tally(subjectBase, (m) => m.person.minors);
  const hindiC = tally(base("hindi"), (m) => personHindi(m.person));
  const companyC = tally(base("companies"), (m) => personCompanies(m.person));
  const statusC = tally(base("status"), (m) => [isCurrent(m.person) ? "current" : "alumni"]);
  const contactC = tally(base("contact"), (m) => [
    ...(m.person.emails.length ? ["email"] : []), ...(m.person.phones?.length ? ["phone"] : []),
    ...(m.person.linkedin ? ["linkedin"] : []),
  ]);
  const count = (c: Map<string, number>, v: string) => c.get(v) ?? 0;

  const distinct = (f: (p: FullPerson) => string[]) => Array.from(new Set(people.flatMap(f)));
  const inferredGrad = new Set(people.filter((p) => p.gradYearInferred && p.gradYear).map((p) => String(p.gradYear)));
  const statedGrad = new Set(people.filter((p) => !p.gradYearInferred && p.gradYear).map((p) => String(p.gradYear)));

  return {
    years: allYears.map((y) => ({ value: y, label: y === ALUMNI_YEAR ? "Alumni (years unknown)" : shortYear(y), count: count(yearC, y), hint: longYear(y) })),
    yearStarts: allYears.filter((y) => y !== ALUMNI_YEAR).map((y) => Number(y.slice(0, 4))),
    groups: distinct((p) => p.memberships.flatMap((m) => m.groups))
      .map((g) => ({ value: g, label: g, count: count(groupC, g) }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    ptypes: (Object.keys(POSITION_TYPE_LABELS) as PositionType[]).map((t) => ({ value: t, label: POSITION_TYPE_LABELS[t], count: count(typeC, t) })),
    positions: distinct((p) => p.memberships.flatMap((m) => m.positions))
      .map((x) => ({ value: x, label: x, count: count(posC, x) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    trips: [
      { value: "any", label: "Any India trip", count: count(tripC, "any") },
      ...distinct((p) => p.indiaTrips).sort().reverse().map((t) => ({ value: t, label: t, count: count(tripC, t) })),
    ],
    grads: distinct((p) => (p.gradYear ? [String(p.gradYear)] : [])).sort().reverse()
      .map((g) => ({ value: g, label: `Class of ${g}`, count: count(gradC, g), hint: inferredGrad.has(g) && !statedGrad.has(g) ? "estimated" : inferredGrad.has(g) ? "some estimated" : undefined })),
    // One option per subject, from majors AND minors; the hint says when some of
    // the count are minors ("2 minor", or "minor" when all of them are).
    majors: distinct(personSubjects).sort((a, b) => a.localeCompare(b))
      .map((m) => {
        const minors = count(asMinor, m), majors = count(asMajor, m);
        return { value: m, label: m, count: count(majorC, m), hint: minors ? (majors ? `${minors} minor` : "minor") : undefined };
      }),
    companies: distinct(personCompanies).sort((a, b) => a.localeCompare(b))
      .map((c) => ({ value: c, label: c, count: count(companyC, c) })),
    hindi: distinct(personHindi).sort().map((h) => ({ value: h, label: h, count: count(hindiC, h) })),
    status: [
      { value: "current", label: `Current (${shortYear(CURRENT_YEAR)})`, count: count(statusC, "current") },
      { value: "alumni", label: "Alumni", count: count(statusC, "alumni") },
    ],
    contact: [
      ...(canSeePrivate ? [
        { value: "email", label: "Has an email", count: count(contactC, "email") },
        { value: "phone", label: "Has a phone number", count: count(contactC, "phone") },
      ] : []),
      { value: "linkedin", label: "Has LinkedIn", count: count(contactC, "linkedin") },
    ],
    hasHiatus: people.some((p) => p.memberships.some((m) => !!m.hiatus)),
  };
}

// --------------------------------------------------------------------- chips
export type Chip = { key: string; label: string; remove: Partial<DirState> };

export function chipsFor(s: DirState, canSeePrivate: boolean): Chip[] {
  const chips: Chip[] = [];
  const without = <K extends keyof DirState>(k: K, v: string) =>
    ({ [k]: (s[k] as string[]).filter((x) => x !== v) }) as Partial<DirState>;
  if (s.yearMode === "range") {
    if (s.from !== null || s.to !== null)
      chips.push({ key: "range", label: `Active ${s.from ?? "…"}–${s.to !== null ? s.to + 1 : "…"}`, remove: { from: null, to: null, yearMode: "any" } });
  } else {
    for (const y of s.years)
      chips.push({ key: `y:${y}`, label: `${s.yearMode === "all" && s.years.length > 1 ? "All of " : ""}${y === ALUMNI_YEAR ? "Alumni (years unknown)" : shortYear(y)}`, remove: without("years", y) });
  }
  for (const g of s.groups) chips.push({ key: `g:${g}`, label: g, remove: without("groups", g) });
  for (const t of s.ptypes) chips.push({ key: `t:${t}`, label: POSITION_TYPE_LABELS[t], remove: { ptypes: s.ptypes.filter((x) => x !== t) } });
  for (const p of s.positions) chips.push({ key: `p:${p}`, label: p, remove: without("positions", p) });
  for (const t of s.trips) chips.push({ key: `tr:${t}`, label: t === "any" ? "Any India trip" : t, remove: without("trips", t) });
  for (const g of s.grads) chips.push({ key: `gr:${g}`, label: `Class of ${g}`, remove: without("grads", g) });
  for (const m of s.majors)
    chips.push({ key: `m:${m}`, label: `${s.majorMode === "all" && s.majors.length > 1 ? "All of " : ""}${m}`, remove: without("majors", m) });
  for (const c of s.companies) chips.push({ key: `co:${c}`, label: c, remove: without("companies", c) });
  for (const h of s.hindi) chips.push({ key: `h:${h}`, label: `Hindi: ${h}`, remove: without("hindi", h) });
  if (s.status) chips.push({ key: "status", label: s.status === "current" ? "Current members" : "Alumni", remove: { status: "" } });
  for (const c of usableContact(s, canSeePrivate))
    chips.push({ key: `c:${c}`, label: CONTACT_CHIP[c], remove: { contact: s.contact.filter((x) => x !== c) } });
  if (s.hiatus) chips.push({ key: "hiatus", label: "On hiatus", remove: { hiatus: false } });
  return chips;
}

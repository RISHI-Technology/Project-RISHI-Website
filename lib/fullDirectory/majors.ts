// ============================================================================
//  Full Directory — split a person's free-text "Major" into individual majors.
// ----------------------------------------------------------------------------
//  The stored `major` string is never changed: it is still what the profile,
//  table, search and CSV show. This only derives `FullPerson.majors`, the list
//  the Major FILTER uses, so someone with "Bioengineering + CS" is listed under
//  both "Bioengineering" and "CS" rather than under a combined checkbox.
//
//  Separators: |  ;  ,  +  &  and   (never inside parentheses).
//  Minors are not handled yet: a piece like "Data Science minor" is, for now,
//  just another Major checkbox.
// ============================================================================

/** Entries the separator rule can't get right on its own (decided case by case). */
const OVERRIDES = new Map<string, string[]>(
  ([
    ["Computer Science Data Science Economics", ["Computer Science", "Data Science", "Economics"]],
    ["EECs ieor", ["EECS", "IEOR"]],
    ["PolEcon + Public Policy, Premed", ["Political Economy", "Public Policy", "Premed"]],
    // Two versions joined by "|" that disagree; the first calls Data Science a minor.
    ["Business + Economics; Minor in Data Science | Business Admin & Economics & Data Science", ["Business", "Economics"]],
  ] as [string, string[]][]).map(([raw, majors]) => [raw.toLowerCase(), majors]),
);

/** Different names for the same major → one shared checkbox label. */
const ALIASES = new Map<string, string>(
  ([
    ["CS", "Computer Science"],
  ] as [string, string][]).map(([alias, label]) => [alias.toLowerCase(), label]),
);

/** Single majors whose own name contains a separator — never split these. */
const ONE_MAJOR: RegExp[] = [
  /molecular\s*(?:&|and)\s*cell(?:ular)?\s+biology/gi,
  /electrical\s+engineering\s*(?:&|and)\s*computer\s+sciences?/gi,
  /environmental\s+economics\s*(?:&|and)\s*policy/gi,
  /conservation\s*(?:&|and)\s*resource\s+studies/gi,
  /city\s*(?:&|and)\s*regional\s+planning/gi,
  /gender\s*(?:&|and)\s*women'?s\s+studies/gi,
  /society\s*(?:&|and)\s*environment/gi,
  /industrial\s+engineering\s*(?:\+|&|and)\s*operations\s+research/gi,
  /physiology\s*(?:&|and)\s*metabolism/gi,
  /global\s+poverty\s*(?:&|and)\s*practice/gi,
];

// Separators inside a protected span are swapped for private-use characters
// before splitting, then swapped back.
const MASK: [RegExp, string, string][] = [
  [/&/g, "", "&"],
  [/\+/g, "", "+"],
  [/,/g, "", ","],
  [/;/g, "", ";"],
  [/\|/g, "", "|"],
  [/\band\b/gi, "", "and"],
];
const mask = (s: string) => MASK.reduce((t, [re, ch]) => t.replace(re, ch), s);
const unmask = (s: string) => {
  let t = s;
  for (const [, ch, orig] of MASK) t = t.split(ch).join(orig);
  return t;
};

const SEPARATOR = /\s*(?:\||;|,|\+|&|\band\b)\s*/i;

/** Degree-type tags only distinguish "Data Science (BA)" from "Data Science". */
const DEGREE_TAG = /\s*(?:\((?:B\.?A\.?|B\.?S\.?|Major)\)|\bB\.[AS]\.)\s*$/i;

const tidy = (s: string) => s.replace(/\s+/g, " ").replace(/^[\s\-–:]+|[\s\-–:]+$/g, "").trim();

/** Individual majors in one person's free-text major (labels not yet case-merged). */
export function splitMajor(raw: string | null | undefined): string[] {
  const whole = tidy(raw ?? "");
  if (!whole) return [];
  const override = OVERRIDES.get(whole.toLowerCase());
  if (override) return [...override];

  let masked = whole.replace(/\([^)]*\)/g, mask);
  for (const re of ONE_MAJOR) masked = masked.replace(re, mask);

  const parts = masked.split(SEPARATOR).map((p) => tidy(unmask(p))).filter(Boolean);
  const noDegree = (p: string) => tidy(p.replace(DEGREE_TAG, "")) || p;
  if (parts.length <= 1) return [noDegree(whole)];
  return Array.from(new Set(parts.map(noDegree)));
}

const upperCount = (s: string) => (s.match(/[A-Z]/g) ?? []).length;

/**
 * Split every person's major, merge known aliases ("CS" → "Computer Science"),
 * and give spellings that differ only by case one shared label
 * ("Data science" / "Data Science" → "Data Science").
 */
export function majorLists(raws: (string | null | undefined)[]): string[][] {
  const lists = raws.map((r) => splitMajor(r).map((m) => ALIASES.get(m.toLowerCase()) ?? m));
  const variants = new Map<string, Map<string, number>>();
  for (const m of lists.flat()) {
    const key = m.toLowerCase();
    const v = variants.get(key) ?? new Map<string, number>();
    v.set(m, (v.get(m) ?? 0) + 1);
    variants.set(key, v);
  }
  const label = new Map<string, string>();
  variants.forEach((v, key) => {
    const best = Array.from(v.entries()).sort((a, b) => upperCount(b[0]) - upperCount(a[0]) || b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
    label.set(key, best);
  });
  return lists.map((l) => Array.from(new Set(l.map((m) => label.get(m.toLowerCase()) ?? m))));
}

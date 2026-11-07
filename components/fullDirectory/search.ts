// ============================================================================
//  Full Directory — instant, typo-tolerant search (no dependencies).
// ----------------------------------------------------------------------------
//  Every query word must match somewhere in the person (name, emails, phones if
//  the viewer has them, major, trips, class year, Hindi, other info, current role,
//  employers and job titles, years at Berkeley) or in one of
//  their years (year, project group, position, class standing, trip).
//
//  Ranking rewards a SINGLE year matching every word, so "rainwater lead" puts
//  actual Rainwater Harvesting Leads first and "president 2019" finds whoever
//  was President in 2018–19 / 2019–20 — not someone who graduated in 2019 and
//  was President some other year.
//
//  Matching per word: exact > prefix > substring > typo (1 edit; 2 for long
//  words). Numbers never fuzzy-match: "2019" must not find "2018".
// ============================================================================

import type { FullMembership, FullPerson, PositionType } from "@/lib/fullDirectory/types";

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Words of a text, plus the sub-parts of compound tokens ("2019-2020" → 2019, 2020). */
export function words(text: string): string[] {
  const out: string[] = [];
  for (const chunk of fold(text).split(/[\s,;:|()/"“”]+/)) {
    if (!chunk) continue;
    const clean = chunk.replace(/^[^a-z0-9@+]+|[^a-z0-9]+$/g, "");
    if (!clean) continue;
    out.push(clean);
    const parts = clean.split(/[-@._'’&+]+/).filter(Boolean);
    if (parts.length > 1) out.push(...parts);
  }
  return out;
}

/** Query → tokens. Compound words are searched by their parts ("women's" → women,
 *  "akank@berk" → akank + berk, which then prefix-match the stored email's parts);
 *  stray single letters are dropped when there's anything else. */
export function queryTokens(q: string): string[] {
  const ts = Array.from(new Set(words(q).filter((w) => !/[-@._'’&+]/.test(w))));
  return ts.some((t) => t.length > 1) ? ts.filter((t) => t.length > 1) : ts;
}

/** Optimal string alignment distance, giving up once it exceeds `max`. */
function osa(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2][j - 2] + 1);
      d[i][j] = v;
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length][b.length];
}

/** How well one query token matches one word (0 = not at all). */
export function wordScore(token: string, word: string): number {
  if (word === token) return 3;
  if (word.startsWith(token)) return 2.4;
  if (token.length >= 3 && word.includes(token)) return 1.4;
  if (/\d/.test(token) || token.length < 4) return 0;
  const max = token.length >= 7 ? 2 : 1;
  if (osa(token, word, max) <= max) return 1;
  // A typo while still typing: compare against the start of a longer word.
  if (token.length >= 5 && word.length > token.length && osa(token, word.slice(0, token.length), 1) <= 1) return 0.8;
  return 0;
}

const bestIn = (token: string, ws: string[]) => {
  let best = 0;
  for (const w of ws) { const s = wordScore(token, w); if (s > best) { best = s; if (s === 3) break; } }
  return best;
};

const TYPE_WORDS: Record<PositionType, string> = {
  exec: "exec executive leadership board",
  lead: "lead leader project lead",
  member: "member general",
  other: "committee",
};

export type IndexEntry = {
  person: FullPerson;
  name: string[];
  other: string[];
  years: { m: FullMembership; words: string[] }[];
};

export function buildIndex(people: FullPerson[]): IndexEntry[] {
  return people.map((p) => ({
    person: p,
    name: words(p.name),
    other: words([
      ...p.emails, ...(p.phones ?? []), ...(p.phones ?? []).map((x) => x.replace(/\D/g, "")),
      p.major, ...p.indiaTrips, p.gradYear ? `class of ${p.gradYear} ${p.gradYear}` : "",
      p.hindi ? `hindi ${p.hindi}` : "", p.postGradPlans, p.joined, p.birthday,
      ...p.otherInfo.map((o) => `${o.label} ${o.value}`),
      // Career: current role, every employer and title, and years at Berkeley
      // ("2020–2024" is indexed as its two years).
      p.currentRole, ...p.employment.flatMap((j) => [j.title, j.company]),
      p.berkeleyYears ? `berkeley ${p.berkeleyYears.replace(/[–—-]/g, " ")}` : "",
    ].filter(Boolean).join(" ")),
    years: p.memberships.map((m) => ({
      m,
      words: words([
        m.year, m.yearStart ? `${String(m.yearStart).slice(2)}-${String(m.yearStart + 1).slice(2)}` : "alumni",
        ...m.groups, ...m.positions, TYPE_WORDS[m.positionType], m.classStanding, m.indiaTrip,
        m.notYetPlaced ? "not yet placed" : "", m.hindi ? `hindi ${m.hindi}` : "",
      ].filter(Boolean).join(" ")),
    })),
  }));
}

export type SearchHit = { score: number; best: FullMembership | null };

/** Score one person against the query tokens, or null if any token is unmatched. */
export function scoreEntry(e: IndexEntry, tokens: string[]): SearchHit | null {
  if (!tokens.length) return { score: 0, best: null };
  let score = 0;
  const cover = e.years.map(() => 0); // how many query words each year matches
  const yearScore = e.years.map(() => 0); // and how strongly
  for (const t of tokens) {
    const inName = bestIn(t, e.name) * 1.6;
    const inOther = bestIn(t, e.other);
    let inYears = 0;
    e.years.forEach((y, i) => {
      const s = bestIn(t, y.words);
      if (s > 0) { cover[i]++; yearScore[i] += s; }
      if (s > inYears) inYears = s;
    });
    const best = Math.max(inName, inOther, inYears * 1.2);
    if (best === 0) return null;
    score += best;
  }
  // One year that matches every word is the strongest signal; among equals, the
  // year whose words match most exactly ("Lead" beats "Leadership" for "lead").
  let bestYear = -1;
  cover.forEach((c, i) => {
    if (c === 0) return;
    if (bestYear === -1 || c > cover[bestYear] || (c === cover[bestYear] && yearScore[i] > yearScore[bestYear])) bestYear = i;
  });
  if (bestYear !== -1) score += yearScore[bestYear] * 0.25;
  if (bestYear !== -1 && cover[bestYear] === tokens.length && tokens.length > 1) score += 4;
  // Typing the start of a name is the most common search of all.
  const joined = fold(e.person.name);
  const q = tokens.join(" ");
  if (joined.startsWith(q)) score += 3;
  else if (joined.split(/\s+/).some((w) => w.startsWith(q))) score += 1.5;
  // Only point at a year when that year alone explains the whole query.
  return { score, best: bestYear !== -1 && cover[bestYear] === tokens.length ? e.years[bestYear].m : null };
}

/** Split text into plain and highlighted runs for <mark>. */
export function highlightRuns(text: string, tokens: string[]): { text: string; hit: boolean }[] {
  if (!tokens.length || !text) return [{ text, hit: false }];
  const runs: { text: string; hit: boolean }[] = [];
  // Letters (incl. accented Latin) and digits form words; everything else is a separator.
  const WORD = "A-Za-z0-9À-ɏ";
  const segs = text.match(new RegExp(`[${WORD}]+|[^${WORD}]+`, "g")) ?? [];
  for (const seg of segs) {
    const low = fold(seg);
    if (!new RegExp(`[${WORD}]`).test(seg)) { runs.push({ text: seg, hit: false }); continue; }
    let start = -1, len = 0;
    for (const t of tokens) {
      if (low.startsWith(t)) { start = 0; len = Math.max(len, t.length); }
      else if (t.length >= 3 && low.includes(t) && start === -1) { start = low.indexOf(t); len = t.length; }
    }
    if (start === -1 && tokens.some((t) => wordScore(t, low) > 0)) { start = 0; len = seg.length; }
    if (start === -1) { runs.push({ text: seg, hit: false }); continue; }
    len = Math.min(len, seg.length - start);
    if (start > 0) runs.push({ text: seg.slice(0, start), hit: false });
    runs.push({ text: seg.slice(start, start + len), hit: true });
    if (start + len < seg.length) runs.push({ text: seg.slice(start + len), hit: false });
  }
  return runs;
}

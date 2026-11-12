#!/usr/bin/env node
/**
 * Imports the compiled member spreadsheet into the Full Directory tables
 * (directory_people, directory_memberships — see migration-full-directory.sql).
 *
 *   node --env-file=.env.local scripts/import-full-directory.mjs --dry-run
 *   node --env-file=.env.local scripts/import-full-directory.mjs
 *   node --env-file=.env.local scripts/import-full-directory.mjs --verify
 *
 *   --file <path>   spreadsheet to read (default: $FULL_DIRECTORY_XLSX, else
 *                   ~/Downloads/rishi-context/RISHI_Member_Directory_v11.xlsx)
 *   --dry-run       parse, then diff against the database (read-only); write nothing
 *   --verify        read counts back from the database and compare with the sheet
 *
 * The spreadsheet is read where it lives and is never copied into the repo.
 *
 * WHAT IS IMPORTED
 *   People       ← "All Members" (one row per person)
 *   Memberships  ← each year tab ("2015-2016" … "2026-2027") + "Alumni (years unknown)"
 *   Never read: the Read Me / Resolutions / Conflicts / Added from PDF / Coresignal log
 *   tabs, and the Sources, Notes and "Paid dues?" columns of any tab. Cell shading
 *   (provenance markup in the sheet) is never read either — only cell values.
 *   Year tabs only supply per-year project group / position (and fill gaps).
 *
 * v6 COLUMNS (All Members, far right): LinkedIn, Current role, Employment history
 *   (current & past) — one job per line, newest first, "Title, Company (2020–2024)" —
 *   and Years at Berkeley ("2020–2024"). Needs migration-full-directory-v6.sql.
 *   "(Coresignal)" labels in "Class year / Graduation" are stripped; only the year is kept.
 *
 * v7 COLUMNS: "Majors (list)" and "Minors (list)", already cleaned, split on "; " and
 *   nothing else. Needs migration-full-directory-v7.sql. The free-text "Major" column
 *   is still stored as-is in `major`.
 *
 * BLANK KEEPS EXISTING: a cell the sheet leaves blank never clears what the database
 *   already holds — the stored value is kept. Columns that belong together (grad year +
 *   "inferred", Berkeley text + start/end, …) are kept or replaced together.
 *
 * EMAILS ARE MERGED: stored emails are never removed; addresses the sheet adds are
 *   appended after them.
 *
 * GRADUATION YEARS ARE HELD: a stored graduation year is never replaced by a
 *   DIFFERENT year from the sheet (the club reviewed v7's changed years and rejected
 *   them). Those rows are listed on every run. A sheet year still fills a blank one,
 *   and the same year stated outright clears the "estimated" flag. To accept the
 *   sheet's differing years, pass --allow-grad-year-changes.
 *
 * YEARS AT BERKELEY ARE HELD the same way: a stored value (text + start/end) is only
 *   ever filled in when blank, never replaced. --allow-berkeley-changes to accept.
 *
 * CLEARING A CURRENT ROLE (--clear-ref <previous sheet>): blank keeps the stored value,
 *   except that when this sheet's "Current role" is blank AND the stored value equals the
 *   reference sheet's value for that person (same slug), the role is cleared — i.e. the
 *   new sheet deliberately removed a role the old sheet had. Without --clear-ref nothing
 *   is ever cleared. (v11: --clear-ref ~/Downloads/rishi-context/RISHI_Member_Directory_v10.xlsx)
 *
 * EMPLOYMENT DATES: "(2020–2024)", "(2023–present)" (current), "(2020–?)" (v11: a past
 *   job no longer on LinkedIn, end year unknown — stored with end_unknown: true, never current).
 *
 * NOTHING IS REMOVED: if the sheet no longer has a person or a membership that the
 *   database holds, the run stops before writing anything (pass --allow-removals to
 *   prune them). The dry run reports every removal it would make — normally none.
 *
 * IDEMPOTENT: people are upserted on `slug`, memberships on (person_id, year).
 * Re-running updates in place; it never duplicates.
 *
 * SAFETY: this script only ever touches directory_people / directory_memberships.
 * It does not read or write lms_roster, lms_profiles or anything the Google Sheets
 * roster sync uses.
 *
 * No dependencies beyond @supabase/supabase-js (already in package.json): the xlsx
 * is a zip of XML, read with node:zlib.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";

// ------------------------------------------------------------------ arguments
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (f) => { const i = args.indexOf(f); return i !== -1 ? args[i + 1] : undefined; };
const DRY = flag("--dry-run");
const VERIFY = flag("--verify");
const ALLOW_GRAD_CHANGES = flag("--allow-grad-year-changes");
const ALLOW_BERKELEY_CHANGES = flag("--allow-berkeley-changes");
const ALLOW_REMOVALS = flag("--allow-removals");
const CLEAR_REF = opt("--clear-ref") && path.resolve(opt("--clear-ref").replace(/^~(?=$|\/)/, os.homedir()));
const FILE = path.resolve(
  (opt("--file") ?? process.env.FULL_DIRECTORY_XLSX ?? "~/Downloads/rishi-context/RISHI_Member_Directory_v11.xlsx")
    .replace(/^~(?=$|\/)/, os.homedir()),
);

// ------------------------------------------------------------- table guard
const PEOPLE = "directory_people";
const MEMBERSHIPS = "directory_memberships";
const ALLOWED_TABLES = new Set([PEOPLE, MEMBERSHIPS]);
function table(db, name) {
  if (!ALLOWED_TABLES.has(name)) throw new Error(`Refusing to touch table "${name}"`);
  return db.from(name);
}

// ================================================================ xlsx reader
/** Read every file in a zip archive into a Map<name, Buffer>. */
function readZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Not a zip/xlsx file (no end-of-central-directory record)");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = new Map();
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("Corrupt zip central directory");
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;
    if (buf.readUInt32LE(local) !== 0x04034b50) throw new Error(`Corrupt zip entry ${name}`);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(start, start + csize);
    if (method === 0) files.set(name, Buffer.from(raw));
    else if (method === 8) files.set(name, zlib.inflateRawSync(raw));
    else throw new Error(`Unsupported zip compression (${method}) for ${name}`);
  }
  return files;
}

const decodeXml = (s) =>
  s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

/** All text runs inside an XML fragment, concatenated (handles rich text). */
const textOf = (frag) => [...frag.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decodeXml(m[1])).join("");

/** Workbook → Map<sheetName, () => rows as objects keyed by the header row>. */
function readWorkbook(file) {
  const zip = readZip(fs.readFileSync(file));
  const get = (n) => { const b = zip.get(n); if (!b) throw new Error(`xlsx is missing ${n}`); return b.toString("utf8"); };
  const shared = zip.has("xl/sharedStrings.xml")
    ? [...get("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1]))
    : [];
  const rels = new Map(
    [...get("xl/_rels/workbook.xml.rels").matchAll(/<Relationship\b[^>]*>/g)].map((m) => {
      const id = m[0].match(/\bId="([^"]+)"/)[1];
      const target = m[0].match(/\bTarget="([^"]+)"/)[1].replace(/^\/?xl\//, "");
      return [id, `xl/${target}`];
    }),
  );
  const sheets = new Map();
  for (const m of get("xl/workbook.xml").matchAll(/<sheet\b[^>]*>/g)) {
    const name = decodeXml(m[0].match(/\bname="([^"]+)"/)[1]);
    const rid = m[0].match(/\br:id="([^"]+)"/)[1];
    sheets.set(name, () => parseSheet(get(rels.get(rid)), shared));
  }
  return sheets; // lazily parsed: tabs we don't import are never even parsed
}

const colIndex = (letters) => [...letters].reduce((n, c) => n * 26 + (c.charCodeAt(0) - 64), 0) - 1;

function parseSheet(xml, shared) {
  const grid = [];
  for (const row of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = [];
    for (const c of row[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = c[1].match(/\br="([A-Z]+)\d+"/);
      if (!ref) continue;
      const type = (c[1].match(/\bt="([^"]+)"/) ?? [])[1];
      const body = c[2] ?? "";
      const v = (body.match(/<v>([\s\S]*?)<\/v>/) ?? [])[1];
      let value = "";
      if (type === "s") value = shared[Number(v)] ?? "";
      else if (type === "inlineStr") value = textOf(body);
      else if (v !== undefined) value = decodeXml(v);
      cells[colIndex(ref[1])] = value.replace(/\r\n?/g, "\n");
    }
    grid.push(cells);
  }
  const header = (grid[0] ?? []).map((h) => (h ?? "").trim());
  return grid.slice(1)
    .map((cells) => Object.fromEntries(header.map((h, i) => [h, (cells[i] ?? "").trim()]).filter(([h]) => h)))
    .filter((r) => Object.values(r).some(Boolean));
}

// ============================================================== normalization
const YEAR_RE = /^(\d{4})-(\d{4})$/;
const ALUMNI = "alumni";
const ALUMNI_TAB = "Alumni (years unknown)";
const SKIPPED_TABS = ["Read Me", "Resolutions", "Conflicts", "Added from PDF", "Coresignal log"];
// Columns that are never read, from any tab.
const NEVER_IMPORT = [/^sources/i, /^notes$/i, /dues/i];
// Columns this script knows how to use, per kind of tab.
const PEOPLE_COLUMNS = new Set([
  "Full Name", "Years in RISHI (from Drive data)", "Project Group(s) by year", "Position(s) by year",
  "Email(s)", "Phone(s)", "Class year / Graduation", "Major", "Joined RISHI", "Birthday", "India Trip(s)", "Other info",
  "LinkedIn", "Current role", "Employment history (current & past)", "Years at Berkeley",
  "Majors (list)", "Minors (list)",
]);
const YEAR_COLUMNS = new Set([
  "Full Name", "Project Group", "Position", "Email(s)", "Phone(s)", "Major", "Joined RISHI", "Birthday",
  "India Trip experience", "Class standing (this year)", "Semesters in RISHI", "Hindi",
]);

const warnings = [];
const warn = (m) => warnings.push(m);

/** Drop every column we must not import (and flag ones we don't recognise). */
function pick(row, known, tab) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (NEVER_IMPORT.some((re) => re.test(k))) continue;
    if (!known.has(k)) { warn(`[${tab}] ignored unknown column "${k}"`); continue; }
    out[k] = v;
  }
  return out;
}

const nameKey = (s) => s.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
const slugify = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const uniq = (xs) => [...new Set(xs.filter(Boolean))];
const lines = (s) => (s ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
const nullIf = (s) => (s && s.trim() ? s.trim() : null);

/** Split on separators that are not inside parentheses. */
function splitTop(s, seps) {
  const out = []; let depth = 0; let cur = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);
    const sep = depth === 0 && seps.find((x) => s.startsWith(x, i));
    if (sep) { out.push(cur); cur = ""; i += sep.length - 1; } else cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}

/** "2019-2020: Rainwater Harvesting\n2020-2021: …" → Map(year → value). */
function byYear(cell) {
  const m = new Map();
  for (const l of lines(cell)) {
    const hit = l.match(/^(\d{4}-\d{4}):\s*(.*)$/);
    if (hit) m.set(hit[1], hit[2].trim());
  }
  return m;
}

const emailsOf = (cell) => uniq((cell ?? "").split(/[\n,;]+/).map((e) => e.trim().toLowerCase()).filter((e) => e.includes("@")));
const phonesOf = (cell) => uniq(lines(cell).flatMap((l) => l.split(/\s*;\s*/)).map((p) => p.trim()));

// Project groups -------------------------------------------------------------
const GROUP_TERM = /\s*\((?:Spring|Fall|Summer|Winter)\s+\d{4}\)\s*$/i;
function normalizeGroups(raw) {
  const groups = []; let notYetPlaced = false;
  for (const part0 of splitTop(raw ?? "", [";"])) {
    const part = part0.replace(GROUP_TERM, "").trim();
    if (/^not yet placed/i.test(part)) { notYetPlaced = true; continue; }
    if (/^none\b/i.test(part)) continue;
    let g;
    if (/^wom[ae]n'?s(\s+empowerment)?$/i.test(part)) g = "Women's Empowerment";
    else if (/^wom[ae]n'?s\s+health$/i.test(part)) g = "Women's Health";
    else if (/watsan|water\s*(&|and)\s*sanitation/i.test(part)) g = "Water & Sanitation (WatSan)";
    else if (/^(ffm|finfundmark)\b/i.test(part)) g = "FFM (Finance/Fundraising/Marketing)";
    else if (/^rainwater/i.test(part)) g = "Rainwater Harvesting";
    else if (/^education$/i.test(part)) g = "Education";
    else if (/^health$/i.test(part)) g = "Health";
    else if (/^agriculture$/i.test(part)) g = "Agriculture";
    else { g = part; warn(`unrecognised project group kept as-is: "${part0}"`); }
    groups.push(g);
  }
  return { groups: uniq(groups), notYetPlaced };
}

// Positions ------------------------------------------------------------------
// Parentheticals that cite where a title came from are provenance, not part of
// the title: "(per PDF)", "(on leads roster; title not named in any doc)".
const PROVENANCE = /\bper\b|pdf|\bdocs?\b|roster|agenda|not named/i;
function cleanPosition(p) {
  return p.replace(/\s*\(([^()]*)\)/g, (whole, inner) => {
    if (!PROVENANCE.test(inner)) return whole;
    const term = inner.match(/^((?:from\s+|until\s+)?(?:Spring|Fall|Summer|Winter)\s+\d{4}(?:\s+only)?)/i);
    return term ? ` (${term[1]})` : "";
  }).replace(/\s+/g, " ").trim();
}
// Different spellings of one title (keys lower-case). The finance variants are all
// the same role, per the club: one consolidated "Director of Finance".
const POSITION_ALIASES = {
  gm: "General Member",
  "director of finance (fall 2019)": "Director of Finance",
  "finance & fundraising": "Director of Finance",
  "finance director": "Director of Finance",
  // Project lead titles: each group's variants are the same role.
  "water & sanitation (watsan) project lead": "Water & Sanitation Lead",
  "water & sanitation lead": "Water & Sanitation Lead",
  "watsan lead": "Water & Sanitation Lead",
  "women's lead": "Women's Empowerment Lead",
  "womens lead": "Women's Empowerment Lead",
  "women's empowerment project lead": "Women's Empowerment Lead",
  "women's empowerment lead": "Women's Empowerment Lead",
  "education lead": "Education Lead",
  "education project lead": "Education Lead",
  "health lead": "Health Lead",
  "health project lead": "Health Lead",
};
function positionsOf(raw) {
  // "Vice President, Projects" is one title (VP of Projects), not two roles.
  const s = (raw ?? "").replace(/\b(Vice President|President|Director),\s*(Projects|Internal|External|Finance|Outreach)\b/g, "$1 of $2");
  return uniq(splitTop(s, [";", "→", ",", "\n"]).map(cleanPosition).map((p) => POSITION_ALIASES[p.toLowerCase()] ?? p));
}
const TYPE_RANK = { member: 0, other: 1, lead: 2, exec: 3 };
// Titles that say "Director" but are not exec positions (per the club).
const NOT_EXEC = new Set(["director of technology"]);
function positionType(p) {
  const s = p.toLowerCase().replace(/\(.*?\)/g, "").trim();
  if (NOT_EXEC.has(s)) return "other";
  if (/\bco-?founder\b|\bpresident\b|\bvice president\b|\bvp\b|\bdirector\b|^exec\b|\btreasurer\b|\bsecretary\b/.test(s)) return "exec";
  if (/\blead\b/.test(s)) return "lead";
  if (!s || /^(general |new )?member$/.test(s) || /\bmember$/.test(s)) return "member";
  return "other";
}
const membershipType = (positions) =>
  positions.map(positionType).reduce((best, t) => (TYPE_RANK[t] > TYPE_RANK[best] ? t : best), "member");

// Titles the club has confirmed that the sheet doesn't record (keys: nameKey).
// Added to the person's earliest membership (their "alumni" one if no years are
// known), merged with whatever the sheet says — never replacing it.
const TITLE_OVERRIDES = {
  "abhishek gupta": ["Co-founder", "President"], // co-founded UC Berkeley Project RISHI
};

// Employment, Berkeley years -------------------------------------------------
// A company name that itself contains ", " — keep these glued to the company.
const COMPANY_SUFFIX = /^(inc\.?|llc|l\.l\.c\.|llp|pllc|ltd\.?|limited|co\.?|corp\.?|corporation|plc|gmbh|s\.a\.|n\.a\.|pc|p\.c\.|md|m\.d\.|phd|dds|dmd|do|jd|esq\.?)$/i;
const UNIVERSITY = /^(university of|uc\s|the university of)/i;
/** "Senior PM, Acme, Inc. (2021–present)" → { title, company, start, end, current[, end_unknown] } */
function jobOf(line) {
  const s = line.replace(/\s+/g, " ").trim();
  // Dates: "(2020–2024)", "(2023–present)", "(2020–?)", "(2022)". Years only — no months.
  // Only "–present" is current; "–?" (v11+) is a past job whose end year is unknown.
  const d = s.match(/\s*\((\d{4})\s*(?:[–—-]\s*(\d{4}|present|\?))?\)\s*$/i);
  const body = d ? s.slice(0, d.index).trim() : s;
  const start = d ? Number(d[1]) : null;
  const current = !!d?.[2] && /^present$/i.test(d[2]);
  const endUnknown = d?.[2] === "?";
  const end = d ? (d[2] === undefined ? start : current || endUnknown ? null : Number(d[2])) : null;
  if (!d) warn(`an employment line has no dates (kept, undated)`);

  let title = body, company = null;
  const seg = body.split(", ");
  if (seg.length > 1) {
    // Glue "…, Inc." / "…, MD" back onto the name before it.
    for (let i = seg.length - 1; i > 0; i--)
      if (COMPANY_SUFFIX.test(seg[i])) seg.splice(i - 1, 2, `${seg[i - 1]}, ${seg[i]}`);
    // The company is the last part — except "University of California, Berkeley[, …]",
    // which is one employer however many commas it has. Titles may contain commas
    // ("Director, Product Management, Motive").
    const uni = seg.findIndex((x, i) => i > 0 && UNIVERSITY.test(x));
    const at = uni > 0 ? uni : seg.length - 1;
    title = at > 0 ? seg.slice(0, at).join(", ") : null;
    company = seg.slice(at).join(", ");
  } else {
    const m = body.match(/^(.*\S)\s+(?:at|@)\s+(\S.*)$/);
    if (m) { title = m[1]; company = m[2]; }
  }
  // end_unknown is only stored when true, so unchanged entries keep their exact shape.
  return { title: nullIf(title), company: nullIf(company), start, end, current, ...(endUnknown ? { end_unknown: true } : {}) };
}
const employmentOf = (cell) => lines(cell).map(jobOf);

/** "2020–2024" → { text, start, end }; "–2024" → end only. */
function berkeleyYearsOf(raw) {
  const s = (raw ?? "").replace(/\s+/g, "").trim();
  if (!s) return { text: null, start: null, end: null };
  const m = s.match(/^(\d{4})?[–—-](\d{4})?$/) ?? s.match(/^(\d{4})()$/);
  if (!m) { warn(`unrecognised Years at Berkeley value kept as-is`); return { text: s, start: null, end: null }; }
  const start = m[1] ? Number(m[1]) : null, end = m[2] ? Number(m[2]) : null;
  const text = start && end ? `${start}–${end}` : start ? `${start}–` : `–${end}`;
  return { text, start, end };
}
/** "Majors (list)" / "Minors (list)": already cleaned in the sheet — split on "; " only. */
const subjectsOf = (cell) => {
  const items = uniq((cell ?? "").split("; ").map((s) => s.trim()));
  if (items.some((s) => /[;\n]/.test(s))) warn(`a Majors/Minors (list) item still contains ";" or a line break (kept as-is)`);
  return items;
};
const linkedinOf = (raw) => {
  const s = nullIf(raw);
  return s ? s.replace(/^(?!https?:\/\/)/, "https://") : null;
};

// Trips, joined, graduation ---------------------------------------------------
/** "India trip 25" / "India Trip 2017 (detail)" → { trip: "India Trip 2025", detail } */
function tripOf(raw) {
  const s = (raw ?? "").trim();
  if (!s || /^none$/i.test(s)) return null;
  const m = s.match(/^india\s+trip\s+(\d{2}|\d{4})\b\s*(?:\((.*)\))?/i);
  if (!m) { warn(`unrecognised India trip kept as-is: "${s}"`); return { trip: s, detail: null }; }
  const y = m[1].length === 2 ? `20${m[1]}` : m[1];
  return { trip: `India Trip ${y}`, detail: m[2]?.trim() || null };
}
function joinedOf(raw) {
  const s = (raw ?? "").trim();
  if (!s) return { joined: null, approx: false };
  const approx = s.startsWith("~") || /from semester count/i.test(s);
  return { joined: s.replace(/^~\s*/, "").replace(/\s*\(from semester count[^)]*\)\s*$/i, "").trim(), approx };
}
const STANDING_OFFSET = { freshman: 4, sophomore: 3, junior: 2, senior: 1 };

// ===================================================================== parse
function build(file) {
  if (!fs.existsSync(file)) throw new Error(`Spreadsheet not found: ${file}`);
  const wb = readWorkbook(file);
  const tabs = [...wb.keys()];
  const yearTabs = tabs.filter((t) => YEAR_RE.test(t)).sort();
  if (!wb.has("All Members")) throw new Error(`No "All Members" tab (tabs: ${tabs.join(", ")})`);
  const ignoredTabs = tabs.filter((t) => t !== "All Members" && t !== ALUMNI_TAB && !yearTabs.includes(t));
  for (const t of ignoredTabs) if (!SKIPPED_TABS.some((s) => t.startsWith(s))) warn(`tab not imported: "${t}"`);

  // ---- people
  const people = wb.get("All Members")().map((row0, i) => {
    const r = pick(row0, PEOPLE_COLUMNS, "All Members");
    const name = (r["Full Name"] ?? "").replace(/\s+/g, " ").trim();
    if (!name) throw new Error(`All Members row ${i + 2} has no name`);
    const standing = {}; let grad = null;
    for (const l0 of lines(r["Class year / Graduation"])) {
      // "(Coresignal)" says where a value came from — strip it, keep the year.
      const l = l0.replace(/\s*\(\s*coresignal\s*\)/gi, "").trim();
      if (!l) continue;
      const y = l.match(/^(\d{4}-\d{4}):\s*(.+)$/);
      if (y) { standing[y[1]] = y[2].trim(); continue; }
      const g = l.match(/^grad:.*?(\d{4})\D*$/i);
      if (g) grad = Number(g[1]); else warn(`[${name}] unparsed class/graduation line: "${l}"`);
    }
    const other = []; let hindi = null, linkedin = null, postGrad = null;
    for (const l of lines(r["Other info"])) {
      const m = l.match(/^([^:]+):\s*(.+)$/);
      if (!m) { other.push({ label: "Note", value: l }); continue; }
      const [label, value] = [m[1].trim(), m[2].trim()];
      if (/^hindi$/i.test(label)) hindi = value;
      else if (/^linkedin/i.test(label)) linkedin = value.replace(/^(?!https?:\/\/)/, "https://");
      else if (/^post-?grad plans/i.test(label)) {
        const when = label.match(/\(([^)]+)\)/);
        postGrad = when ? `${value} (${when[1]})` : value;
      } else other.push({ label, value });
    }
    const trips = [];
    for (const l of lines(r["India Trip(s)"])) {
      const t = tripOf(l);
      if (t) { trips.push(t.trip); if (t.detail) other.push({ label: t.trip, value: t.detail }); }
    }
    const joined = joinedOf(r["Joined RISHI"]);
    const berkeley = berkeleyYearsOf(r["Years at Berkeley"]);
    return {
      key: nameKey(name), name,
      listedYears: (r["Years in RISHI (from Drive data)"] ?? "").split(",").map((s) => s.trim()).filter((s) => YEAR_RE.test(s)),
      groupsByYear: byYear(r["Project Group(s) by year"]),
      positionsByYear: byYear(r["Position(s) by year"]),
      emails: emailsOf(r["Email(s)"]), phones: phonesOf(r["Phone(s)"]),
      standing, grad, major: nullIf(r["Major"]), joined: joined.joined, joinedApprox: joined.approx,
      majors: subjectsOf(r["Majors (list)"]), minors: subjectsOf(r["Minors (list)"]),
      birthday: nullIf(r["Birthday"]), trips, hindi, postGrad, other,
      // The v6 LinkedIn column wins; older sheets had it as an "Other info" line.
      linkedin: linkedinOf(r["LinkedIn"]) ?? linkedin,
      currentJob: nullIf(r["Current role"]),
      employment: employmentOf(r["Employment history (current & past)"]),
      berkeley,
      memberships: [],
    };
  });
  const byName = new Map();
  for (const p of people) byName.set(p.key, [...(byName.get(p.key) ?? []), p]);

  // ---- memberships
  const perTab = {};
  const conflicts = [];
  for (const tab of [...yearTabs, ...(wb.has(ALUMNI_TAB) ? [ALUMNI_TAB] : [])]) {
    const year = tab === ALUMNI_TAB ? ALUMNI : tab;
    const rows = wb.get(tab)();
    perTab[year] = rows.length;
    for (const row0 of rows) {
      const r = pick(row0, YEAR_COLUMNS, tab);
      const name = (r["Full Name"] ?? "").replace(/\s+/g, " ").trim();
      const emails = emailsOf(r["Email(s)"]);
      let cands = byName.get(nameKey(name)) ?? [];
      if (cands.length > 1) {
        const byEmail = cands.filter((p) => p.emails.some((e) => emails.includes(e)));
        cands = byEmail.length ? byEmail : cands.filter((p) => p.listedYears.includes(year));
      }
      if (cands.length !== 1) throw new Error(`[${tab}] "${name}" matches ${cands.length} people in All Members — fix the sheet`);
      const p = cands[0];
      if (p.memberships.some((m) => m.year === year)) throw new Error(`[${tab}] "${name}" is listed twice`);

      // Year tab wins; fall back to the person's "by year" summary cells.
      const groupRaw = nullIf(r["Project Group"]) ?? nullIf(p.groupsByYear.get(year));
      const positionRaw = nullIf(r["Position"]) ?? nullIf(p.positionsByYear.get(year));
      if (r["Position"] && p.positionsByYear.has(year) && cleanPosition(r["Position"]) !== cleanPosition(p.positionsByYear.get(year)))
        conflicts.push(`${year} ${name}: position "${r["Position"]}" (tab) vs "${p.positionsByYear.get(year)}" (All Members)`);
      const { groups, notYetPlaced } = normalizeGroups(groupRaw);
      const positions = positionsOf(positionRaw);
      const trip = tripOf(r["India Trip experience"]);
      const standing = nullIf(r["Class standing (this year)"]);
      const sem = Number.parseInt(r["Semesters in RISHI"] ?? "", 10);

      p.emails = uniq([...p.emails, ...emails]);
      p.phones = uniq([...p.phones, ...phonesOf(r["Phone(s)"])]);
      p.major ??= nullIf(r["Major"]);
      p.birthday ??= nullIf(r["Birthday"]);
      if (!p.joined && r["Joined RISHI"]) { const j = joinedOf(r["Joined RISHI"]); p.joined = j.joined; p.joinedApprox = j.approx; }
      if (standing && year !== ALUMNI) p.standing[year] ??= standing;
      if (trip) p.trips = uniq([...p.trips, trip.trip]);

      p.memberships.push({
        year, year_start: year === ALUMNI ? null : Number(year.slice(0, 4)),
        project_group_raw: groupRaw, project_groups: groups, not_yet_placed: notYetPlaced,
        position_raw: positionRaw, positions, position_type: membershipType(positions),
        class_standing: standing, semesters_in_rishi: Number.isFinite(sem) ? sem : null,
        hiatus: null, hindi: nullIf(r["Hindi"]), india_trip: trip?.trip ?? null,
      });
    }
  }

  // ---- confirmed titles the sheet doesn't record
  for (const [key, titles] of Object.entries(TITLE_OVERRIDES)) {
    const hits = byName.get(key) ?? [];
    if (hits.length !== 1) { warn(`title override for "${key}" matches ${hits.length} people — skipped`); continue; }
    const p = hits[0];
    let m = [...p.memberships].sort((a, b) => (a.year_start ?? -1) - (b.year_start ?? -1))[0];
    if (!m) {
      m = { year: ALUMNI, year_start: null, project_group_raw: null, project_groups: [], not_yet_placed: false,
        position_raw: null, positions: [], position_type: "member", class_standing: null, semesters_in_rishi: null,
        hiatus: null, hindi: null, india_trip: null };
      p.memberships.push(m);
    }
    m.positions = uniq([...titles, ...m.positions.filter((x) => positionType(x) !== "member")]);
    m.position_type = membershipType(m.positions);
  }

  // ---- finish people: years, grad year, slugs
  for (const p of people) {
    p.memberships.sort((a, b) => (a.year_start ?? 9999) - (b.year_start ?? 9999));
    p.years = p.memberships.filter((m) => m.year !== ALUMNI).map((m) => m.year);
    const starts = p.memberships.map((m) => m.year_start).filter((y) => y !== null);
    p.first = starts.length ? Math.min(...starts) : null;
    p.last = starts.length ? Math.max(...starts) : null;
    p.gradInferred = false;
    if (p.grad === null) {
      const latest = Object.entries(p.standing).sort(([a], [b]) => b.localeCompare(a))
        .find(([, s]) => STANDING_OFFSET[s.toLowerCase()] !== undefined);
      if (latest) { p.grad = Number(latest[0].slice(0, 4)) + STANDING_OFFSET[latest[1].toLowerCase()]; p.gradInferred = true; }
    }
    if (!p.hindi) p.hindi = [...p.memberships].reverse().map((m) => m.hindi).find(Boolean) ?? null;
    const extra = p.listedYears.filter((y) => !p.years.includes(y));
    if (extra.length) warn(`[${p.name}] "Years in RISHI" lists ${extra.join(", ")} but no year tab has them (not imported as memberships)`);
  }
  const slugCount = new Map();
  for (const p of people) slugCount.set(slugify(p.name), (slugCount.get(slugify(p.name)) ?? 0) + 1);
  const seen = new Set();
  for (const p of people) {
    const base = slugify(p.name);
    p.slug = slugCount.get(base) > 1 ? `${base}-${p.first ?? ALUMNI}` : base;
    if (!p.slug || seen.has(p.slug)) throw new Error(`Cannot make a unique slug for "${p.name}" (${p.slug})`);
    seen.add(p.slug);
  }
  return { people, perTab, ignoredTabs, conflicts };
}

// ================================================================== database
async function db() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set (run with --env-file=.env.local)");
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Every row of a table, 1000 at a time (no silent row cap). */
async function selectAll(client, name, columns) {
  const out = []; const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await table(client, name).select(columns).order("id").range(from, from + PAGE - 1);
    if (error) throw new Error(`${name}: ${error.message}`);
    out.push(...data);
    if (data.length < PAGE) return out;
  }
}

async function inBatches(rows, size, fn) {
  for (let i = 0; i < rows.length; i += size) await fn(rows.slice(i, i + size));
}

function personRow(p, now) {
  return {
    slug: p.slug, full_name: p.name, emails: p.emails, phones: p.phones,
    grad_year: p.grad, grad_year_inferred: p.gradInferred, class_standing: p.standing,
    major: p.major, majors: p.majors, minors: p.minors, joined_rishi: p.joined, joined_rishi_approx: p.joinedApprox, birthday: p.birthday,
    india_trips: [...p.trips].sort(), hindi_level: p.hindi, linkedin: p.linkedin, post_grad_plans: p.postGrad,
    other_info: p.other, years_active: p.years, first_year: p.first, last_year: p.last,
    current_job: p.currentJob, employment_history: p.employment,
    berkeley_years: p.berkeley.text, berkeley_start: p.berkeley.start, berkeley_end: p.berkeley.end,
    updated_at: now,
  };
}

// ====================================================================== main
const yearLabel = (y) => (y === ALUMNI ? "Alumni (years unknown)" : y);
const countYear = (people, y) => people.reduce((c, p) => c + p.memberships.filter((m) => m.year === y).length, 0);

function printSummary({ people, perTab, ignoredTabs, conflicts }) {
  const total = people.reduce((n, p) => n + p.memberships.length, 0);
  console.log(`\nSpreadsheet: ${FILE}`);
  console.log(`Tabs not imported: ${ignoredTabs.join(" · ")}`);
  console.log(`\nPeople: ${people.length}`);
  console.log(`Memberships: ${total}`);
  for (const [y, n] of Object.entries(perTab)) {
    const attached = countYear(people, y);
    console.log(`  ${yearLabel(y).padEnd(24)} ${String(attached).padStart(3)}${attached !== n ? `  ✗ tab has ${n} rows` : ""}`);
  }
  const tally = (f) => { const m = new Map(); for (const p of people) for (const x of p.memberships.flatMap(f)) m.set(x, (m.get(x) ?? 0) + 1); return [...m].sort((a, b) => b[1] - a[1]); };
  console.log("\nProject groups (normalized):");
  for (const [g, n] of tally((m) => m.project_groups)) console.log(`  ${String(n).padStart(4)}  ${g}`);
  console.log(`  ${String(people.reduce((c, p) => c + p.memberships.filter((m) => m.not_yet_placed).length, 0)).padStart(4)}  (not yet placed)`);
  console.log("\nPosition types (per membership):");
  for (const [t, n] of tally((m) => [m.position_type])) console.log(`  ${String(n).padStart(4)}  ${t}`);
  console.log("\nSpecific positions by type:");
  const byType = new Map();
  for (const p of people) for (const m of p.memberships) for (const pos of m.positions) {
    const t = positionType(pos); byType.set(t, new Set([...(byType.get(t) ?? []), pos]));
  }
  for (const [t, s] of byType) console.log(`  ${t}: ${[...s].sort().join(" | ")}`);
  console.log("\nPerson fields filled:");
  const filled = (f) => people.filter(f).length;
  console.log(`  emails ${filled((p) => p.emails.length)} · phones ${filled((p) => p.phones.length)} · grad year ${filled((p) => p.grad)} (${filled((p) => p.gradInferred)} inferred) · major ${filled((p) => p.major)} · joined ${filled((p) => p.joined)} · birthday ${filled((p) => p.birthday)} · India trip ${filled((p) => p.trips.length)} · Hindi ${filled((p) => p.hindi)} · LinkedIn ${filled((p) => p.linkedin)} · post-grad ${filled((p) => p.postGrad)}`);
  console.log(`  majors (list) ${filled((p) => p.majors.length)} (${new Set(people.flatMap((p) => p.majors)).size} distinct) · minors (list) ${filled((p) => p.minors.length)} (${new Set(people.flatMap((p) => p.minors)).size} distinct)`);
  console.log(`  current role ${filled((p) => p.currentJob)} · employment history ${filled((p) => p.employment.length)} (${people.reduce((n, p) => n + p.employment.length, 0)} jobs) · Years at Berkeley ${filled((p) => p.berkeley.text)}`);
  console.log(`  multiple emails: ${filled((p) => p.emails.length > 1)} · multiple phones: ${filled((p) => p.phones.length > 1)}`);
  const dupSlugs = people.filter((p) => p.slug !== slugify(p.name)).map((p) => p.slug);
  if (dupSlugs.length) console.log(`  disambiguated slugs: ${dupSlugs.join(", ")}`);
  if (conflicts.length) { console.log(`\nPosition differences, year tab vs All Members (year tab used): ${conflicts.length}`); for (const c of conflicts) console.log(`  ${c}`); }
  if (warnings.length) { console.log(`\nWarnings: ${uniq(warnings).length}`); for (const w of uniq(warnings)) console.log(`  ${w}`); }
  return Object.entries(perTab).every(([y, n]) => countYear(people, y) === n);
}

// ======================================================= blank keeps existing
// A blank cell in the sheet never clears a stored value. Columns that only make
// sense together are kept or replaced as a group; `by` lists the columns whose
// blankness means "the sheet had nothing here" (default: the first column).
const isBlank = (v) =>
  v === null || v === undefined || v === "" || v === false ||
  (Array.isArray(v) ? v.length === 0 : typeof v === "object" && Object.keys(v).length === 0);

const PERSON_FIELDS = [
  { label: "emails", cols: ["emails"] },
  { label: "phones", cols: ["phones"] },
  { label: "graduation year", cols: ["grad_year", "grad_year_inferred"] },
  { label: "class standing", cols: ["class_standing"] },
  { label: "major (raw text)", cols: ["major"] },
  { label: "majors (list)", cols: ["majors"] },
  { label: "minors (list)", cols: ["minors"] },
  { label: "joined RISHI", cols: ["joined_rishi", "joined_rishi_approx"] },
  { label: "birthday", cols: ["birthday"] },
  { label: "India trips", cols: ["india_trips"] },
  { label: "Hindi", cols: ["hindi_level"] },
  { label: "LinkedIn", cols: ["linkedin"] },
  { label: "post-grad plans", cols: ["post_grad_plans"] },
  { label: "other info", cols: ["other_info"] },
  { label: "years in RISHI", cols: ["years_active", "first_year", "last_year"] },
  { label: "current role", cols: ["current_job"] },
  { label: "employment history", cols: ["employment_history"] },
  { label: "Years at Berkeley", cols: ["berkeley_years", "berkeley_start", "berkeley_end"] },
];
const MEMBERSHIP_FIELDS = [
  { label: "project group", cols: ["project_groups", "project_group_raw", "not_yet_placed"], by: ["project_groups", "project_group_raw", "not_yet_placed"] },
  { label: "position", cols: ["positions", "position_raw", "position_type"], by: ["positions", "position_raw"] },
  { label: "class standing", cols: ["class_standing"] },
  { label: "semesters in RISHI", cols: ["semesters_in_rishi"] },
  { label: "hiatus", cols: ["hiatus"] },
  { label: "Hindi", cols: ["hindi"] },
  { label: "India trip", cols: ["india_trip"] },
];
const blankIn = (row, f) => (f.by ?? [f.cols[0]]).every((c) => isBlank(row?.[c]));

/** The row to write: `next`, except that any field the sheet left blank keeps `prev`'s value. */
function keepExisting(next, prev, fields) {
  if (!prev) return next;
  const out = { ...next };
  for (const f of fields) {
    if (!f.cols.every((c) => c in prev && c in next)) continue; // column not in the database yet
    if (blankIn(next, f) && !blankIn(prev, f)) for (const c of f.cols) out[c] = prev[c];
  }
  return out;
}

/** Emails are merged, never replaced: stored addresses first, then any new ones from the sheet. */
function mergeEmails(row, prev) {
  if (!prev) return row;
  return { ...row, emails: uniq([...(prev.emails ?? []), ...(row.emails ?? [])]) };
}

/** A stored graduation year is never replaced by a different one (see the header). */
function holdGradYear(row, prev) {
  if (ALLOW_GRAD_CHANGES || !prev || prev.grad_year == null || row.grad_year == null || row.grad_year === prev.grad_year) return { row, held: null };
  return { row: { ...row, grad_year: prev.grad_year, grad_year_inferred: prev.grad_year_inferred }, held: { stored: prev.grad_year, sheet: row.grad_year } };
}
function printHeldGradYears(plan) {
  const held = plan.filter((x) => x.gradHeld);
  if (!held.length) return;
  console.log(`\nGraduation years held at the stored value — the sheet says otherwise (${held.length}; --allow-grad-year-changes to accept):`);
  for (const x of held.sort((a, b) => a.p.name.localeCompare(b.p.name)))
    console.log(`  ${x.p.name}: kept ${x.gradHeld.stored}${x.prev.grad_year_inferred ? " (estimated)" : ""}, sheet has ${x.gradHeld.sheet}`);
}

/** A stored Years at Berkeley is never replaced, only filled when blank (see the header). */
const BERKELEY_COLS = ["berkeley_years", "berkeley_start", "berkeley_end"];
function holdBerkeley(row, prev) {
  if (ALLOW_BERKELEY_CHANGES || !prev || !BERKELEY_COLS.every((c) => c in prev) || isBlank(prev.berkeley_years) || row.berkeley_years === prev.berkeley_years)
    return { row, held: null };
  return { row: { ...row, ...Object.fromEntries(BERKELEY_COLS.map((c) => [c, prev[c]])) }, held: { stored: prev.berkeley_years, sheet: row.berkeley_years } };
}
function printHeldBerkeley(plan) {
  const held = plan.filter((x) => x.berkeleyHeld);
  if (!held.length) return;
  console.log(`\nYears at Berkeley held at the stored value — the sheet says otherwise (${held.length}; --allow-berkeley-changes to accept):`);
  for (const x of held.sort((a, b) => a.p.name.localeCompare(b.p.name)))
    console.log(`  ${x.p.name}: kept ${x.berkeleyHeld.stored}, sheet has ${x.berkeleyHeld.sheet}`);
}

// Comparison: order is irrelevant for set-like arrays; object keys are sorted.
const SET_COLS = new Set(["emails", "phones", "india_trips", "years_active"]);
const stable = (v) => JSON.stringify(v, (_, x) =>
  x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x);
const canon = (v, col) => (isBlank(v) ? "" : SET_COLS.has(col) && Array.isArray(v) ? stable([...v].sort()) : stable(v));
const sameField = (a, b, f) => f.cols.every((c) => canon(a?.[c], c) === canon(b?.[c], c));

/** Per field: newly filled / changed / kept (sheet blank) / unchanged, over rows that already exist. */
function tallyDiff(pairs, fields) {
  const t = fields.map((f) => ({ f, filled: 0, changed: 0, kept: 0, same: 0 }));
  for (const { prev, next, merged } of pairs) for (const k of t) {
    const pb = blankIn(prev, k.f), mb = blankIn(merged, k.f);
    if (pb && mb) continue;
    if (pb) k.filled++;
    else if (blankIn(next, k.f)) k.kept++;
    else if (sameField(prev, merged, k.f)) k.same++;
    else k.changed++;
  }
  return t;
}
function printTally(title, t) {
  console.log(`\n${title}`);
  console.log(`  ${"field".padEnd(22)} ${"newly filled".padStart(12)} ${"changed".padStart(8)} ${"kept (sheet blank)".padStart(19)} ${"unchanged".padStart(10)}`);
  for (const k of t) console.log(`  ${k.f.label.padEnd(22)} ${String(k.filled).padStart(12)} ${String(k.changed).padStart(8)} ${String(k.kept).padStart(19)} ${String(k.same).padStart(10)}`);
}

async function hasColumns(client, name, cols) {
  const { error } = await table(client, name).select(cols).limit(1);
  return !error;
}

// ====================================================================== main
async function main() {
  const parsed = build(FILE);
  const ok = printSummary(parsed);
  if (!ok) { console.error("\n✗ Membership counts don't match the tabs. Nothing written."); process.exit(1); }
  const { people } = parsed;

  if (VERIFY) {
    const client = await db();
    const dbPeople = await selectAll(client, PEOPLE, "id, slug");
    const dbMs = await selectAll(client, MEMBERSHIPS, "id, person_id, year");
    console.log(`\nDatabase: ${dbPeople.length} people, ${dbMs.length} memberships`);
    let bad = dbPeople.length !== people.length;
    console.log(`  ${"People".padEnd(24)} db ${String(dbPeople.length).padStart(3)}  sheet ${String(people.length).padStart(3)}  ${bad ? "✗" : "✓"}`);
    const counts = {};
    for (const m of dbMs) counts[m.year] = (counts[m.year] ?? 0) + 1;
    for (const y of Object.keys(parsed.perTab)) {
      const want = countYear(people, y);
      const got = counts[y] ?? 0;
      if (got !== want) bad = true;
      console.log(`  ${yearLabel(y).padEnd(24)} db ${String(got).padStart(3)}  sheet ${String(want).padStart(3)}  ${got === want ? "✓" : "✗"}`);
    }
    const slugs = new Set(people.map((p) => p.slug));
    const strays = dbPeople.filter((p) => !slugs.has(p.slug));
    if (strays.length) { bad = true; console.log(`  people in db but not in the sheet: ${strays.length}`); }
    // Field fill, read back from the database (counts only — never values). A blank
    // cell keeps the stored value, so the database may hold more than the sheet.
    const filledDb = await selectAll(client, PEOPLE, "id, linkedin, major, majors, minors, current_job, berkeley_years, employment_history, grad_year");
    const nDb = (f) => filledDb.filter(f).length, nSheet = (f) => people.filter(f).length;
    console.log("\n  Field                     db  sheet");
    for (const [label, fd, fs] of [
      ["people total", () => true, () => true],
      ["with at least one major", (r) => r.majors?.length, (p) => p.majors.length],
      ["with a minor", (r) => r.minors?.length, (p) => p.minors.length],
      ["with LinkedIn", (r) => r.linkedin, (p) => p.linkedin],
      ["with major (raw text)", (r) => r.major, (p) => p.major],
      ["with current role", (r) => r.current_job, (p) => p.currentJob],
      ["with employment history", (r) => r.employment_history?.length, (p) => p.employment.length],
      ["with Years at Berkeley", (r) => r.berkeley_years, (p) => p.berkeley.text],
      ["with graduation year", (r) => r.grad_year, (p) => p.grad],
    ]) {
      const a = nDb(fd), b = nSheet(fs);
      if (a < b) bad = true;
      console.log(`  ${label.padEnd(25)} ${String(a).padStart(3)}  ${String(b).padStart(3)}  ${a === b ? "✓" : a > b ? "(kept from db)" : "✗"}`);
    }
    const distinct = (rows) => new Set(rows.flat()).size;
    const dm = distinct(filledDb.map((r) => r.majors ?? [])), sm = distinct(people.map((p) => p.majors));
    if (dm < sm) bad = true;
    console.log(`  ${"distinct majors".padEnd(25)} ${String(dm).padStart(3)}  ${String(sm).padStart(3)}  ${dm === sm ? "✓" : dm > sm ? "(kept from db)" : "✗"}`);
    console.log(`  ${"distinct minors".padEnd(25)} ${String(distinct(filledDb.map((r) => r.minors ?? []))).padStart(3)}  ${String(distinct(people.map((p) => p.minors))).padStart(3)}`);
    console.log(bad ? "\n✗ Database does not match the sheet." : "\n✓ Database matches the sheet.");
    process.exit(bad ? 1 : 0);
  }

  let client;
  try { client = await db(); } catch (e) {
    if (!DRY) throw e;
    console.log(`\n(Database not checked: ${e instanceof Error ? e.message : e})\n\nDry run — nothing was written.`);
    return;
  }
  const hasLists = await hasColumns(client, PEOPLE, "majors, minors");
  if (!DRY && !hasLists) throw new Error("directory_people has no majors/minors columns — run migration-full-directory-v7.sql first. Nothing written.");

  // ---- plan: what each row becomes (the sheet's value, or the stored one where the sheet is blank)
  const now = new Date().toISOString(); // an instant (UTC, with "Z") — never a naive timestamp
  if (CLEAR_REF && CLEAR_REF === FILE) throw new Error("--clear-ref must be the PREVIOUS sheet, not the one being imported");
  const refBySlug = CLEAR_REF ? new Map(build(CLEAR_REF).people.map((p) => [p.slug, p])) : null;
  if (CLEAR_REF) console.log(`\nCurrent-role clearing reference: ${CLEAR_REF} (${refBySlug.size} people)`);
  const prevPeople = await selectAll(client, PEOPLE, "*");
  const prevBySlug = new Map(prevPeople.map((r) => [r.slug, r]));
  const plan = people.map((p) => {
    const next = personRow(p, now);
    if (!hasLists) { delete next.majors; delete next.minors; } // dry run before the migration
    const prev = prevBySlug.get(p.slug);
    const g = holdGradYear(mergeEmails(keepExisting(next, prev, PERSON_FIELDS), prev), prev);
    const b = holdBerkeley(g.row, prev);
    // Clear a role the new sheet dropped (blank here, stored value = the reference sheet's).
    const ref = refBySlug?.get(p.slug);
    let roleCleared = null;
    if (ref && ref.name === p.name && !p.currentJob && prev?.current_job && ref.currentJob && prev.current_job === ref.currentJob) {
      b.row.current_job = null;
      roleCleared = prev.current_job;
    }
    return { p, prev, next, merged: b.row, gradHeld: g.held, berkeleyHeld: b.held, roleCleared };
  });
  printHeldGradYears(plan);
  printHeldBerkeley(plan);
  const slugs = new Set(people.map((p) => p.slug));
  const stalePeople = prevPeople.filter((r) => !slugs.has(r.slug));

  const prevMs = await selectAll(client, MEMBERSHIPS, "*");
  const prevMsByKey = new Map(prevMs.map((m) => [`${m.person_id}|${m.year}`, m]));
  const msPlan = (idOf) => plan.flatMap(({ p }) => p.memberships.map((m) => {
    const next = { ...m, person_id: idOf(p.slug), updated_at: now };
    const prev = next.person_id ? prevMsByKey.get(`${next.person_id}|${m.year}`) : undefined;
    return { prev, next, merged: keepExisting(next, prev, MEMBERSHIP_FIELDS) };
  }));

  if (DRY) {
    await printDryRun({ plan, prevPeople, stalePeople, hasLists, msPlan: msPlan((s) => prevBySlug.get(s)?.id), prevMs });
    console.log("\nDry run — nothing was written.");
    return;
  }

  // ---- never remove (unless asked): stop before writing anything
  const plannedMs = new Set(msPlan((s) => prevBySlug.get(s)?.id).filter((x) => x.next.person_id).map((x) => `${x.next.person_id}|${x.next.year}`));
  const removingMs = prevMs.filter((m) => !plannedMs.has(`${m.person_id}|${m.year}`));
  if (!ALLOW_REMOVALS && (stalePeople.length || removingMs.length))
    throw new Error(`The sheet no longer has ${stalePeople.length} people and ${removingMs.length} memberships that the database holds. Nothing written (see --dry-run; --allow-removals to prune them).`);

  // ---- write
  const idBySlug = new Map();
  await inBatches(plan.map((x) => x.merged), 100, async (batch) => {
    const { data, error } = await table(client, PEOPLE).upsert(batch, { onConflict: "slug" }).select("id, slug");
    if (error) throw new Error(`${PEOPLE} upsert: ${error.message}`);
    for (const r of data) idBySlug.set(r.slug, r.id);
  });
  if (idBySlug.size !== people.length) throw new Error(`Upserted ${idBySlug.size} people, expected ${people.length}`);

  const msRows = msPlan((s) => idBySlug.get(s)).map((x) => x.merged);
  await inBatches(msRows, 200, async (batch) => {
    const { error } = await table(client, MEMBERSHIPS).upsert(batch, { onConflict: "person_id,year" });
    if (error) throw new Error(`${MEMBERSHIPS} upsert: ${error.message}`);
  });

  // Prune what the sheet no longer has (only ever in these two tables).
  const keep = new Set(msRows.map((m) => `${m.person_id}|${m.year}`));
  const staleMs = (await selectAll(client, MEMBERSHIPS, "id, person_id, year")).filter((m) => !keep.has(`${m.person_id}|${m.year}`));
  await inBatches(staleMs.map((m) => m.id), 200, async (ids) => {
    const { error } = await table(client, MEMBERSHIPS).delete().in("id", ids);
    if (error) throw new Error(`${MEMBERSHIPS} prune: ${error.message}`);
  });
  await inBatches(stalePeople.map((p) => p.id), 200, async (ids) => {
    const { error } = await table(client, PEOPLE).delete().in("id", ids);
    if (error) throw new Error(`${PEOPLE} prune: ${error.message}`);
  });

  console.log(`\nWrote ${people.length} people and ${msRows.length} memberships; removed ${stalePeople.length} people and ${staleMs.length} memberships no longer in the sheet.`);
  console.log("Now confirm with:  node --env-file=.env.local scripts/import-full-directory.mjs --verify");
}

/** The dry-run report: what a real run would change, against the live database. */
async function printDryRun({ plan, prevPeople, stalePeople, hasLists, msPlan, prevMs }) {
  const added = plan.filter((x) => !x.prev);
  console.log(`\nDatabase now: ${prevPeople.length} people, ${prevMs.length} memberships.`);
  console.log(`A real run would update ${plan.length - added.length} people, add ${added.length}${added.length ? ` (${added.map((x) => x.p.name).join(", ")})` : ""}, remove ${stalePeople.length}${stalePeople.length ? ` (${stalePeople.map((r) => r.full_name).join(", ")})` : ""}.`);

  // What a real run stores: the sheet's list, or (sheet blank) the stored list.
  const after = (x, col) => (hasLists ? x.merged[col] ?? [] : x.p[col]);
  const stored = (x, col) => x.prev?.[col] ?? [];
  const sameSet = (a, b) => a.length === b.length && a.every((v) => b.includes(v));
  const sameList = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  const fmt = (xs) => (xs.length ? xs.join("; ") : "(none)");
  const byName = (a, b) => a.p.name.localeCompare(b.p.name);
  const existing = plan.filter((x) => x.prev);
  const label = (x) => `${x.p.name}${plan.filter((y) => y.p.name === x.p.name).length > 1 ? ` [${x.p.slug}]` : ""}`;

  // (b) Per column: how many stored values a real run fills / changes / keeps.
  const pairs = existing.map((x) => ({ name: x.p.name, prev: x.prev, next: x.next, merged: x.merged }));
  printTally(`(b) Changed fields per column, over the ${existing.length} people already in the database:`, tallyDiff(pairs, PERSON_FIELDS));

  // (s) Majors/minors per person: the stored lists → what a real run stores.
  const subj = existing.map((x) => ({
    x,
    majors: !sameSet(stored(x, "majors"), after(x, "majors")),
    minors: !sameSet(stored(x, "minors"), after(x, "minors")),
    orderOnly: ["majors", "minors"].every((c) => sameSet(stored(x, c), after(x, c))) &&
      ["majors", "minors"].some((c) => !sameList(stored(x, c), after(x, c))),
  }));
  const subjChanged = subj.filter((r) => r.majors || r.minors).sort((a, b) => byName(a.x, b.x));
  console.log(`\n(s) People whose majors or minors would change: ${subjChanged.length}`);
  console.log(`    (majors ${subj.filter((r) => r.majors).length} · minors ${subj.filter((r) => r.minors).length} · both ${subj.filter((r) => r.majors && r.minors).length}; order-only changes, not listed: ${subj.filter((r) => r.orderOnly).length})`);
  for (const { x, majors, minors } of subjChanged) {
    console.log(`  ${label(x)}`);
    if (majors) console.log(`      majors: ${fmt(stored(x, "majors"))}  →  ${fmt(after(x, "majors"))}`);
    if (minors) console.log(`      minors: ${fmt(stored(x, "minors"))}  →  ${fmt(after(x, "minors"))}`);
  }
  const before = (col) => new Set(existing.flatMap((x) => stored(x, col)));
  const afterSet = (col) => new Set(plan.flatMap((x) => after(x, col)));
  for (const col of ["majors", "minors"]) {
    const gone = [...before(col)].filter((s) => !afterSet(col).has(s)).sort();
    const added = [...afterSet(col)].filter((s) => !before(col).has(s)).sort();
    console.log(`  ${col} names no longer used: ${gone.join(" | ") || "(none)"}`);
    console.log(`  ${col} names new:           ${added.join(" | ") || "(none)"}`);
  }

  // (c) Every current-role change, including roles filled in for the first time.
  const roleChanges = existing.filter((x) => !x.roleCleared && (x.merged.current_job ?? null) !== (x.prev.current_job ?? null)).sort(byName);
  console.log(`\n(c) Current role changes: ${roleChanges.length} (${roleChanges.filter((x) => !x.prev.current_job).length} newly filled, ${roleChanges.filter((x) => x.prev.current_job).length} replaced)`);
  for (const x of roleChanges) console.log(`  ${label(x)}: ${x.prev.current_job ? `"${x.prev.current_job}"` : "(none)"}  →  "${x.merged.current_job}"`);
  const roleClears = existing.filter((x) => x.roleCleared).sort(byName);
  console.log(`\n(c′) Current roles CLEARED (blank in this sheet, stored value = --clear-ref sheet's value): ${CLEAR_REF ? roleClears.length : "— (no --clear-ref given: nothing cleared)"}`);
  for (const x of roleClears) console.log(`  ${label(x)}: "${x.roleCleared}"  →  (none)`);
  // The site falls back to a "–present" employment entry when Current role is blank.
  const fallback = roleClears.filter((x) => (x.merged.employment_history ?? []).some((j) => j.current));
  if (CLEAR_REF) console.log(`  of these, ${fallback.length} would still show a role on the site, from a "–present" employment entry${fallback.length ? ` (${fallback.map(label).join(", ")})` : ""}`);
  const keptRoles = existing.filter((x) => !x.p.currentJob && x.prev.current_job && !x.roleCleared);
  console.log(`  blank in this sheet but kept (stored value differs from the reference, or no reference): ${keptRoles.length}${keptRoles.length ? ` (${keptRoles.sort(byName).map(label).join(", ")})` : ""}`);

  // (h) Employment history, matched job by job on (title, company, start year).
  const jobKey = (j) => `${j.title ?? ""}|${j.company ?? ""}|${j.start ?? ""}`;
  const h = { relabelled: 0, people: new Set(), added: 0, removed: 0, removedPeople: [], other: 0 };
  for (const x of existing) {
    // One-for-one: a person can hold two entries with the same key, so each stored
    // entry is paired with at most one new entry (in order).
    const was = new Map();
    for (const j of x.prev.employment_history ?? []) was.set(jobKey(j), [...(was.get(jobKey(j)) ?? []), j]);
    for (const j of x.merged.employment_history ?? []) {
      const o = was.get(jobKey(j))?.shift();
      if (!o) { h.added++; continue; }
      if (o.current && j.end_unknown) { h.relabelled++; h.people.add(x.p.slug); }
      else if (stable(o) !== stable(j)) h.other++;
    }
    const gone = [...was.values()].reduce((n, l) => n + l.length, 0);
    if (gone) { h.removed += gone; h.removedPeople.push(`${label(x)} (${gone})`); }
  }
  const allJobs = plan.flatMap((x) => x.merged.employment_history ?? []);
  console.log(`\n(h) Employment history entries relabelled "–present" → "–?": ${h.relabelled} across ${h.people.size} people`);
  console.log(`    other entries changed: ${h.other} · entries added: ${h.added} · entries removed: ${h.removed}${h.removedPeople.length ? ` (${h.removedPeople.join(", ")})` : ""}`);
  console.log(`    after the run: ${allJobs.length} entries · ${allJobs.filter((j) => j.current).length} "–present" · ${allJobs.filter((j) => j.end_unknown).length} "–?" · ${allJobs.filter((j) => !j.current && !j.end_unknown).length} other`);

  // (d) Emails are merged (see mergeEmails) — counts only, never addresses.
  const emailAdds = existing.map((x) => ({ x, n: x.merged.emails.filter((e) => !(x.prev.emails ?? []).includes(e)).length })).filter((r) => r.n);
  console.log(`\n(d) Emails that would be added: ${emailAdds.reduce((n, r) => n + r.n, 0)} across ${emailAdds.length} people${emailAdds.length ? ` (${emailAdds.sort((a, b) => byName(a.x, b.x)).map((r) => `${label(r.x)} +${r.n}`).join(", ")})` : ""}`);

  // --show <column>: list the people whose value for that field changes (old → new).
  const show = opt("--show");
  const f = show && PERSON_FIELDS.find((x) => x.cols.includes(show));
  if (show && !f) console.log(`\n--show: unknown column "${show}" (one of: ${PERSON_FIELDS.flatMap((x) => x.cols).join(", ")})`);
  if (f) {
    const val = (row) => f.cols.map((c) => `${c}=${canon(row?.[c], c) || "∅"}`).join(" ");
    const hits = pairs.filter((x) => !blankIn(x.prev, f) && !blankIn(x.next, f) && !sameField(x.prev, x.merged, f));
    console.log(`\n--show ${show}: ${hits.length} changed`);
    for (const x of hits.sort((a, b) => a.name.localeCompare(b.name))) console.log(`  ${x.name}: ${val(x.prev)}  →  ${val(x.merged)}`);
  }

  const existingMs = msPlan.filter((x) => x.prev);
  const keepMs = new Set(msPlan.filter((x) => x.next.person_id).map((x) => `${x.next.person_id}|${x.next.year}`));
  const staleMs = prevMs.filter((m) => !keepMs.has(`${m.person_id}|${m.year}`) && !stalePeople.some((s) => s.id === m.person_id));
  console.log(`\nMemberships: update ${existingMs.length}, add ${msPlan.length - existingMs.length}, remove ${staleMs.length}${staleMs.length ? ` (${staleMs.map((m) => `${prevPeople.find((r) => r.id === m.person_id)?.full_name} ${m.year}`).join(", ")})` : ""}.`);
  printTally(`Per membership field, over the ${existingMs.length} memberships already in the database:`, tallyDiff(existingMs, MEMBERSHIP_FIELDS));

  const finalMajors = plan.map((x) => after(x, "majors")), finalMinors = plan.map((x) => after(x, "minors"));
  console.log(`\nAfter the run: ${finalMajors.filter((m) => m.length).length} with at least one major · ${finalMinors.filter((m) => m.length).length} with a minor · ${new Set(finalMajors.flat()).size} distinct majors · ${new Set(finalMinors.flat()).size} distinct minors`);
  const majorSet = new Set(finalMajors.flat());
  console.log(`  ${finalMajors.filter((m) => m.length >= 2).length} with 2+ majors · ${new Set([...finalMajors.flat(), ...finalMinors.flat()]).size} distinct subjects in the Major filter (majors ∪ minors)`);
  console.log(`  subjects that are someone's major AND someone's minor: ${[...new Set(finalMinors.flat())].filter((m) => majorSet.has(m)).join(", ") || "(none)"}`);

  // (r) Removals: rows, values blanked, and list items a replacement would drop.
  const blanked = (pairsOf, fields) => fields.map((fl) => ({ fl, n: pairsOf.filter((x) => !blankIn(x.prev, fl) && blankIn(x.merged, fl)).length })).filter((r) => r.n);
  // Employment is compared job by job in (h) — a relabelled date is not a removed job.
  const LIST_COLS = ["emails", "phones", "majors", "minors", "india_trips", "years_active", "other_info"];
  const dropped = LIST_COLS.map((c) => {
    const hit = existing.filter((x) => Array.isArray(x.prev[c]) && Array.isArray(x.merged[c]) &&
      x.prev[c].some((v) => !x.merged[c].some((w) => stable(w) === stable(v))));
    return { c, hit };
  }).filter((r) => r.hit.length);
  const blankP = blanked(pairs, PERSON_FIELDS), blankM = blanked(existingMs, MEMBERSHIP_FIELDS);
  console.log(`\n(r) Removals`);
  console.log(`  people removed: ${stalePeople.length} · memberships removed: ${staleMs.length}${ALLOW_REMOVALS ? "" : " (a real run refuses to remove any)"}`);
  const intended = (r) => r.fl.cols[0] === "current_job" && r.n === roleClears.length;
  const unexpected = [...blankP, ...blankM].filter((r) => !intended(r));
  console.log(`  stored values that would be blanked: ${unexpected.length ? unexpected.map((r) => `${r.fl.label} ${r.n}`).join(", ") : "0"}${roleClears.length ? ` (plus the ${roleClears.length} intended current-role clears in (c′))` : ""}`);
  console.log(`  employment history entries removed: ${h.removed}`);
  console.log(`  stored list items not in the new value (the sheet's non-blank value replaces the list):${dropped.length ? "" : " 0"}`);
  for (const { c, hit } of dropped) console.log(`    ${c}: ${hit.length} people${["majors", "minors"].includes(c) ? " (see (s))" : ""}`);
}

main().catch((e) => { console.error(`\n✗ ${e instanceof Error ? e.message : e}`); process.exit(1); });

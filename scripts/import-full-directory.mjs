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
 *                   ~/Downloads/rishi-context/RISHI_Member_Directory_v3.xlsx)
 *   --dry-run       parse and print counts; write nothing
 *   --verify        read counts back from the database and compare with the sheet
 *
 * The spreadsheet is read where it lives and is never copied into the repo.
 *
 * WHAT IS IMPORTED
 *   People       ← "All Members" (one row per person)
 *   Memberships  ← each year tab ("2015-2016" … "2026-2027") + "Alumni (years unknown)"
 *   Never read: the Read Me / Resolutions / Conflicts / Added from PDF tabs, and the
 *   Sources, Notes and "Paid dues?" columns of any tab.
 *
 * IDEMPOTENT: people are upserted on `slug`, memberships on (person_id, year), and
 * rows in these two tables that are no longer in the sheet are removed. Re-running
 * updates in place; it never duplicates.
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
const FILE = path.resolve(
  (opt("--file") ?? process.env.FULL_DIRECTORY_XLSX ?? "~/Downloads/rishi-context/RISHI_Member_Directory_v3.xlsx")
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
const SKIPPED_TABS = ["Read Me", "Resolutions", "Conflicts", "Added from PDF"];
// Columns that are never read, from any tab.
const NEVER_IMPORT = [/^sources/i, /^notes$/i, /dues/i];
// Columns this script knows how to use, per kind of tab.
const PEOPLE_COLUMNS = new Set([
  "Full Name", "Years in RISHI (from Drive data)", "Project Group(s) by year", "Position(s) by year",
  "Email(s)", "Phone(s)", "Class year / Graduation", "Major", "Joined RISHI", "Birthday", "India Trip(s)", "Other info",
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
  if (/\bpresident\b|\bvice president\b|\bvp\b|\bdirector\b|^exec\b|\btreasurer\b|\bsecretary\b/.test(s)) return "exec";
  if (/\blead\b/.test(s)) return "lead";
  if (!s || /^(general |new )?member$/.test(s) || /\bmember$/.test(s)) return "member";
  return "other";
}
const membershipType = (positions) =>
  positions.map(positionType).reduce((best, t) => (TYPE_RANK[t] > TYPE_RANK[best] ? t : best), "member");

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
    for (const l of lines(r["Class year / Graduation"])) {
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
    return {
      key: nameKey(name), name,
      listedYears: (r["Years in RISHI (from Drive data)"] ?? "").split(",").map((s) => s.trim()).filter((s) => YEAR_RE.test(s)),
      groupsByYear: byYear(r["Project Group(s) by year"]),
      positionsByYear: byYear(r["Position(s) by year"]),
      emails: emailsOf(r["Email(s)"]), phones: phonesOf(r["Phone(s)"]),
      standing, grad, major: nullIf(r["Major"]), joined: joined.joined, joinedApprox: joined.approx,
      birthday: nullIf(r["Birthday"]), trips, hindi, linkedin, postGrad, other,
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
    major: p.major, joined_rishi: p.joined, joined_rishi_approx: p.joinedApprox, birthday: p.birthday,
    india_trips: [...p.trips].sort(), hindi_level: p.hindi, linkedin: p.linkedin, post_grad_plans: p.postGrad,
    other_info: p.other, years_active: p.years, first_year: p.first, last_year: p.last, updated_at: now,
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
  console.log(`  multiple emails: ${filled((p) => p.emails.length > 1)} · multiple phones: ${filled((p) => p.phones.length > 1)}`);
  const dupSlugs = people.filter((p) => p.slug !== slugify(p.name)).map((p) => p.slug);
  if (dupSlugs.length) console.log(`  disambiguated slugs: ${dupSlugs.join(", ")}`);
  if (conflicts.length) { console.log(`\nPosition differences, year tab vs All Members (year tab used): ${conflicts.length}`); for (const c of conflicts) console.log(`  ${c}`); }
  if (warnings.length) { console.log(`\nWarnings: ${uniq(warnings).length}`); for (const w of uniq(warnings)) console.log(`  ${w}`); }
  return Object.entries(perTab).every(([y, n]) => countYear(people, y) === n);
}

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
    console.log(bad ? "\n✗ Database does not match the sheet." : "\n✓ Database matches the sheet.");
    process.exit(bad ? 1 : 0);
  }

  if (DRY) {
    try {
      const client = await db();
      const existing = await selectAll(client, PEOPLE, "id, slug, full_name");
      const have = new Set(existing.map((e) => e.slug));
      const slugs = new Set(people.map((p) => p.slug));
      const gone = existing.filter((p) => !slugs.has(p.slug));
      console.log(`\nDatabase now: ${existing.length} people. A real run would add ${people.filter((p) => !have.has(p.slug)).length}, update ${people.filter((p) => have.has(p.slug)).length}, remove ${gone.length}${gone.length ? `: ${gone.map((g) => g.full_name).join(", ")}` : ""}.`);
    } catch (e) {
      console.log(`\n(Database not checked: ${e instanceof Error ? e.message : e})`);
    }
    console.log("\nDry run — nothing was written.");
    return;
  }

  // ---- write
  const client = await db();
  const now = new Date().toISOString(); // an instant (UTC, with "Z") — never a naive timestamp
  const idBySlug = new Map();
  await inBatches(people.map((p) => personRow(p, now)), 100, async (batch) => {
    const { data, error } = await table(client, PEOPLE).upsert(batch, { onConflict: "slug" }).select("id, slug");
    if (error) throw new Error(`${PEOPLE} upsert: ${error.message}`);
    for (const r of data) idBySlug.set(r.slug, r.id);
  });
  if (idBySlug.size !== people.length) throw new Error(`Upserted ${idBySlug.size} people, expected ${people.length}`);

  const msRows = people.flatMap((p) => p.memberships.map((m) => ({ ...m, person_id: idBySlug.get(p.slug), updated_at: now })));
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
  const slugs = new Set(people.map((p) => p.slug));
  const stalePeople = (await selectAll(client, PEOPLE, "id, slug")).filter((p) => !slugs.has(p.slug));
  await inBatches(stalePeople.map((p) => p.id), 200, async (ids) => {
    const { error } = await table(client, PEOPLE).delete().in("id", ids);
    if (error) throw new Error(`${PEOPLE} prune: ${error.message}`);
  });

  console.log(`\nWrote ${people.length} people and ${msRows.length} memberships; removed ${stalePeople.length} people and ${staleMs.length} memberships no longer in the sheet.`);
  console.log("Now confirm with:  node --env-file=.env.local scripts/import-full-directory.mjs --verify");
}

main().catch((e) => { console.error(`\n✗ ${e instanceof Error ? e.message : e}`); process.exit(1); });

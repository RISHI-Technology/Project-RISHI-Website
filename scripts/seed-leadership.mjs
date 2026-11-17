#!/usr/bin/env node
/**
 * Seeds Lore → Leadership (leadership_years / leadership_roles / leadership_holders)
 * from scripts/leadership-seed-data.mjs.
 *
 *   node --env-file=.env.local scripts/seed-leadership.mjs --dry-run   # plan only, writes nothing
 *   node --env-file=.env.local scripts/seed-leadership.mjs             # write, then read back
 *   node --env-file=.env.local scripts/seed-leadership.mjs --verify    # read back only
 *
 * Needs migration-leadership.sql to have run (a dry run works before it, and says so).
 *
 * DIRECTORY LINKS: every holder is matched to exactly one Full Directory record
 *   (directory_people) by exact name (case/space-insensitive), and that record's
 *   id is stored. Decided exceptions live in the data file (LINK_BY_SLUG,
 *   keepUnlinked). If any name matches no record or several, NOTHING is written
 *   and the names are listed — they need a decision, not a guess.
 *
 * IDEMPOTENT: rows are keyed by year, (year, title) and (role, name). A re-run
 *   inserts only what's missing and updates only rows that differ from the seed,
 *   so a second run writes nothing. It NEVER deletes: rows added in the editor
 *   are left alone (listed as "not in the seed").
 *
 * Touches only the three leadership_* tables; reads directory_people and
 * directory_memberships.
 */
import { createClient } from "@supabase/supabase-js";
import { SEED, LINK_BY_SLUG, keepUnlinked } from "./leadership-seed-data.mjs";

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const VERIFY = args.includes("--verify");

const YEARS = "leadership_years", ROLES = "leadership_roles", HOLDERS = "leadership_holders";
const WRITABLE = new Set([YEARS, ROLES, HOLDERS]);
const READABLE = new Set([...WRITABLE, "directory_people", "directory_memberships"]);
const SLOTS = new Set(["president", "vp", "vp_internal", "vp_projects", "director", "projects_director", "senior_lead", "lead", "intern", "other"]);
const STRUCTURES = new Set(["two_vp", "one_vp", "pvp_only"]);

const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing (run with --env-file=.env.local)."); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false } });
const read = (t) => { if (!READABLE.has(t)) throw new Error(`Refusing to read "${t}"`); return db.from(t); };
const write = (t) => { if (!WRITABLE.has(t)) throw new Error(`Refusing to write "${t}"`); return db.from(t); };

const nameKey = (s) => s.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
const blank = (v) => (v === undefined || v === null || String(v).trim() === "" ? null : String(v).trim());

async function selectAll(table, cols) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await read(table).select(cols).order("id").range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) return out;
  }
}
async function selectYears() {
  const { data, error } = await read(YEARS).select("year, structure, note").order("year");
  if (error) throw new Error(`${YEARS}: ${error.message}`);
  return data;
}
const missingTable = (e) => /leadership_|schema cache|does not exist/i.test(e instanceof Error ? e.message : String(e));

// ------------------------------------------------------------------ 1. the seed, flattened
function flatten() {
  const problems = [];
  const years = [], roles = [], holders = [];
  const seenYears = new Set();
  for (const y of SEED) {
    if (!/^\d{4}-\d{4}$/.test(y.year) || Number(y.year.slice(5)) !== Number(y.year.slice(0, 4)) + 1) problems.push(`bad year key ${y.year}`);
    if (seenYears.has(y.year)) problems.push(`year ${y.year} listed twice`);
    seenYears.add(y.year);
    if (!STRUCTURES.has(y.structure)) problems.push(`${y.year}: bad structure ${y.structure}`);
    years.push({ year: y.year, structure: y.structure, note: blank(y.note) });
    const titles = new Set();
    y.roles.forEach((r, i) => {
      if (!SLOTS.has(r.slot)) problems.push(`${y.year} "${r.title}": bad slot ${r.slot}`);
      if (titles.has(r.title)) problems.push(`${y.year}: role "${r.title}" listed twice`);
      titles.add(r.title);
      if ((r.slot === "lead" || r.slot === "senior_lead") && !r.group) problems.push(`${y.year} "${r.title}": a ${r.slot} needs a group`);
      if (r.parent && !y.roles.some((p) => p.title === r.parent)) problems.push(`${y.year} "${r.title}": parent "${r.parent}" not in that year`);
      roles.push({ year: y.year, title: r.title, slot: r.slot, project_group: blank(r.group), parent: r.parent ?? null, sort_order: i });
      const names = new Set();
      r.holders.forEach((h, j) => {
        const o = typeof h === "string" ? { name: h } : h;
        if (names.has(o.name)) problems.push(`${y.year} "${r.title}": ${o.name} listed twice`);
        names.add(o.name);
        holders.push({ year: y.year, title: r.title, slot: r.slot, display_name: o.name, qualifier: blank(o.qualifier), note: blank(o.note), sort_order: j });
      });
    });
  }
  if (problems.length) { console.error("Seed data problems:\n  " + problems.join("\n  ")); process.exit(1); }
  return { years, roles, holders };
}

// ------------------------------------------------------------------ 2. directory links
async function resolveLinks(holders) {
  const people = await selectAll("directory_people", "id, slug, full_name");
  const ms = await selectAll("directory_memberships", "id, person_id, year");
  const yearsOf = new Map();
  for (const m of ms) yearsOf.set(m.person_id, [...(yearsOf.get(m.person_id) ?? []), m.year]);
  const byName = new Map(), bySlug = new Map(people.map((p) => [p.slug, p]));
  for (const p of people) byName.set(nameKey(p.full_name), [...(byName.get(nameKey(p.full_name)) ?? []), p]);

  const unmatched = [], ambiguous = [], keptUnlinked = [], byOverride = [], noYear = [];
  for (const h of holders) {
    h.directory_person_id = null;
    if (keepUnlinked(h.year, h.slot)) { keptUnlinked.push(`${h.year}  ${h.display_name} (${h.title})`); continue; }
    const o = LINK_BY_SLUG.find((x) => x.year === h.year && nameKey(x.name) === nameKey(h.display_name));
    let p = null;
    if (o) {
      p = bySlug.get(o.slug);
      if (!p) { unmatched.push(`${h.year}  ${h.display_name}: decided slug "${o.slug}" is not in the directory`); continue; }
      byOverride.push(`${h.year}  ${h.display_name} → ${o.slug}`);
    } else {
      const c = byName.get(nameKey(h.display_name)) ?? [];
      if (c.length === 0) { unmatched.push(`${h.year}  ${h.display_name} (${h.title})`); continue; }
      if (c.length > 1) { ambiguous.push(`${h.year}  ${h.display_name} → ${c.map((x) => x.slug).join(" | ")}`); continue; }
      p = c[0];
    }
    h.directory_person_id = p.id;
    h.slug = p.slug;
    if (!(yearsOf.get(p.id) ?? []).includes(h.year)) noYear.push(`${h.year}  ${h.display_name} → ${p.slug} (directory has no ${h.year} membership)`);
  }
  return { unmatched, ambiguous, keptUnlinked, byOverride, noYear: [...new Set(noYear)] };
}

// ------------------------------------------------------------------ 3. what's stored now
async function loadStored() {
  try {
    const years = await selectYears();
    const roles = await selectAll(ROLES, "id, year, title, slot, project_group, parent_role_id, sort_order");
    const holders = await selectAll(HOLDERS, "id, role_id, display_name, directory_person_id, qualifier, note, sort_order");
    return { years, roles, holders };
  } catch (e) {
    if (missingTable(e)) return null;
    throw e;
  }
}

const roleKey = (year, title) => `${year}|${title}`;
const holderKey = (year, title, name) => `${year}|${title}|${name}`;

function plan(seed, stored) {
  const s = stored ?? { years: [], roles: [], holders: [] };
  const sYear = new Map(s.years.map((y) => [y.year, y]));
  const sRole = new Map(s.roles.map((r) => [roleKey(r.year, r.title), r]));
  const roleById = new Map(s.roles.map((r) => [r.id, r]));
  const sHolder = new Map(s.holders.map((h) => {
    const r = roleById.get(h.role_id);
    return [holderKey(r?.year, r?.title, h.display_name), h];
  }));

  const diff = (prev, next, fields) => fields.filter((f) => (prev[f] ?? null) !== (next[f] ?? null));
  const out = { years: { add: [], update: [], same: 0 }, roles: { add: [], update: [], same: 0 }, holders: { add: [], update: [], same: 0 } };

  for (const y of seed.years) {
    const p = sYear.get(y.year);
    if (!p) out.years.add.push(y);
    else { const d = diff(p, y, ["structure", "note"]); if (d.length) out.years.update.push({ ...y, changed: d }); else out.years.same++; }
  }
  for (const r of seed.roles) {
    const p = sRole.get(roleKey(r.year, r.title));
    const parentId = r.parent ? sRole.get(roleKey(r.year, r.parent))?.id ?? "(new)" : null;
    if (!p) out.roles.add.push(r);
    else {
      const d = diff(p, { ...r, parent_role_id: parentId }, ["slot", "project_group", "sort_order", "parent_role_id"]);
      if (d.length) out.roles.update.push({ ...r, id: p.id, changed: d }); else out.roles.same++;
    }
  }
  for (const h of seed.holders) {
    const p = sHolder.get(holderKey(h.year, h.title, h.display_name));
    if (!p) out.holders.add.push(h);
    else {
      const d = diff(p, h, ["directory_person_id", "qualifier", "note", "sort_order"]);
      if (d.length) out.holders.update.push({ ...h, id: p.id, changed: d }); else out.holders.same++;
    }
  }
  const seedYears = new Set(seed.years.map((y) => y.year));
  const seedRoles = new Set(seed.roles.map((r) => roleKey(r.year, r.title)));
  const seedHolders = new Set(seed.holders.map((h) => holderKey(h.year, h.title, h.display_name)));
  out.extra = {
    years: s.years.filter((y) => !seedYears.has(y.year)).map((y) => y.year),
    roles: s.roles.filter((r) => !seedRoles.has(roleKey(r.year, r.title))).map((r) => `${r.year} ${r.title}`),
    holders: [...sHolder.entries()].filter(([k]) => !seedHolders.has(k)).map(([k]) => k.replaceAll("|", " · ")),
  };
  return out;
}

// ------------------------------------------------------------------ 4. write
async function apply(seed, p) {
  if (p.years.add.length) {
    const { error } = await write(YEARS).insert(p.years.add);
    if (error) throw new Error(`${YEARS} insert: ${error.message}`);
  }
  for (const y of p.years.update) {
    const { error } = await write(YEARS).update({ structure: y.structure, note: y.note }).eq("year", y.year);
    if (error) throw new Error(`${YEARS} update ${y.year}: ${error.message}`);
  }
  // Roles without parents first; parents are linked once every role has an id.
  if (p.roles.add.length) {
    const rows = p.roles.add.map(({ year, title, slot, project_group, sort_order }) => ({ year, title, slot, project_group, sort_order }));
    const { error } = await write(ROLES).insert(rows);
    if (error) throw new Error(`${ROLES} insert: ${error.message}`);
  }
  for (const r of p.roles.update) {
    const { error } = await write(ROLES).update({ slot: r.slot, project_group: r.project_group, sort_order: r.sort_order }).eq("id", r.id);
    if (error) throw new Error(`${ROLES} update ${r.year} ${r.title}: ${error.message}`);
  }
  const roles = await selectAll(ROLES, "id, year, title, parent_role_id");
  const idOf = new Map(roles.map((r) => [roleKey(r.year, r.title), r]));
  for (const r of seed.roles) {
    const row = idOf.get(roleKey(r.year, r.title));
    const want = r.parent ? idOf.get(roleKey(r.year, r.parent)).id : null;
    if ((row.parent_role_id ?? null) !== want) {
      const { error } = await write(ROLES).update({ parent_role_id: want }).eq("id", row.id);
      if (error) throw new Error(`${ROLES} parent ${r.year} ${r.title}: ${error.message}`);
    }
  }
  if (p.holders.add.length) {
    const rows = p.holders.add.map((h) => ({
      role_id: idOf.get(roleKey(h.year, h.title)).id, display_name: h.display_name,
      directory_person_id: h.directory_person_id, qualifier: h.qualifier, note: h.note, sort_order: h.sort_order,
    }));
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await write(HOLDERS).insert(rows.slice(i, i + 200));
      if (error) throw new Error(`${HOLDERS} insert: ${error.message}`);
    }
  }
  for (const h of p.holders.update) {
    const { error } = await write(HOLDERS)
      .update({ directory_person_id: h.directory_person_id, qualifier: h.qualifier, note: h.note, sort_order: h.sort_order })
      .eq("id", h.id);
    if (error) throw new Error(`${HOLDERS} update ${h.year} ${h.display_name}: ${error.message}`);
  }
}

// ------------------------------------------------------------------ 5. read back
async function verify(seed) {
  const stored = await loadStored();
  if (!stored) { console.log("✗ The leadership tables don't exist yet — run migration-leadership.sql first."); return false; }
  const p = plan(seed, stored);
  const linked = stored.holders.filter((h) => h.directory_person_id).length;
  console.log("\nRead back from the database:");
  console.log(`  years   ${stored.years.length}   (seed ${seed.years.length})`);
  console.log(`  roles   ${stored.roles.length}   (seed ${seed.roles.length})`);
  console.log(`  holders ${stored.holders.length}   (seed ${seed.holders.length}) — linked to the Full Directory ${linked}, unlinked ${stored.holders.length - linked}`);
  const pending = p.years.add.length + p.years.update.length + p.roles.add.length + p.roles.update.length + p.holders.add.length + p.holders.update.length;
  // Parent links, checked by title.
  const byId = new Map(stored.roles.map((r) => [r.id, r]));
  const parentBad = seed.roles.filter((r) => {
    const row = stored.roles.find((x) => x.year === r.year && x.title === r.title);
    const parent = row?.parent_role_id ? byId.get(row.parent_role_id)?.title ?? "?" : null;
    return (r.parent ?? null) !== parent;
  });
  if (pending || parentBad.length) {
    console.log(`✗ ${pending} seeded rows missing or different; ${parentBad.length} parent links wrong.`);
    for (const r of parentBad) console.log(`    parent of ${r.year} "${r.title}" should be "${r.parent}"`);
    return false;
  }
  const extra = p.extra.years.length + p.extra.roles.length + p.extra.holders.length;
  console.log(`✓ Every seeded row is stored exactly as planned${extra ? ` (plus ${extra} rows not in the seed, e.g. added in the editor — left alone)` : ""}.`);
  return true;
}

// ------------------------------------------------------------------ main
const seed = flatten();
console.log(`Seed: ${seed.years.length} years · ${seed.roles.length} roles · ${seed.holders.length} holders`);
for (const y of seed.years)
  console.log(`  ${y.year}  ${y.structure.padEnd(8)}  ${String(seed.roles.filter((r) => r.year === y.year).length).padStart(2)} roles  ${String(seed.holders.filter((h) => h.year === y.year).length).padStart(2)} holders`);

const links = await resolveLinks(seed.holders);
if (VERIFY) process.exit((await verify(seed)) ? 0 : 1);

const linkedCount = seed.holders.filter((h) => h.directory_person_id).length;
console.log(`\nDirectory links: ${linkedCount} linked · ${seed.holders.length - linkedCount} unlinked`);
console.log(`  unmatched: ${links.unmatched.length}${links.unmatched.length ? "\n    " + links.unmatched.join("\n    ") : ""}`);
console.log(`  ambiguous: ${links.ambiguous.length}${links.ambiguous.length ? "\n    " + links.ambiguous.join("\n    ") : ""}`);
console.log(`  linked by a recorded decision: ${links.byOverride.length}${links.byOverride.length ? "\n    " + links.byOverride.join("\n    ") : ""}`);
console.log(`  kept unlinked by decision: ${links.keptUnlinked.length}${links.keptUnlinked.length ? "\n    " + links.keptUnlinked.join("\n    ") : ""}`);
console.log(`  linked, but the directory has no membership that year (FYI): ${links.noYear.length}${links.noYear.length ? "\n    " + links.noYear.join("\n    ") : ""}`);

const stored = await loadStored();
if (!stored) console.log("\nThe leadership tables don't exist yet (run migration-leadership.sql first). Planning against empty tables.");
const p = plan(seed, stored);
const line = (label, x) => console.log(`  ${label.padEnd(8)} add ${String(x.add.length).padStart(3)} · update ${String(x.update.length).padStart(3)} · unchanged ${String(x.same).padStart(3)}`);
console.log("\nPlan:");
line("years", p.years); line("roles", p.roles); line("holders", p.holders);
for (const x of [...p.years.update, ...p.roles.update, ...p.holders.update])
  console.log(`    update ${x.year} ${x.title ?? ""} ${x.display_name ?? ""}: ${x.changed.join(", ")}`);
const extra = [...p.extra.years.map((y) => `year ${y}`), ...p.extra.roles.map((r) => `role ${r}`), ...p.extra.holders.map((h) => `holder ${h}`)];
console.log(`  in the database but not in the seed (never deleted): ${extra.length}${extra.length ? "\n    " + extra.join("\n    ") : ""}`);

if (links.unmatched.length || links.ambiguous.length) {
  console.log("\n✗ Some names need a decision (above). Nothing written.");
  process.exit(1);
}
if (DRY) { console.log("\nDry run — nothing was written."); process.exit(0); }
if (!stored) { console.log("\n✗ Run migration-leadership.sql first. Nothing written."); process.exit(1); }

await apply(seed, p);
console.log("\nWritten.");
process.exit((await verify(seed)) ? 0 : 1);

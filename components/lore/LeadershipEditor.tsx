"use client";

// Webmaster editor for Lore → Leadership.
//   • Years: add, change structure/note, delete (confirmed).
//   • Roles: add, edit (title, slot, project group, parent), reorder, delete (confirmed).
//   • Holders: add, edit (name, qualifier, note, Full Directory link), reorder, delete (confirmed).
// Every save goes to /api/lms/leadership/admin, which answers with everything read
// back from the database; the editor then shows exactly what was stored.
// The preview redraws the tree as you type (unsaved edits included). Edges are never
// drawn by hand — the tree comes from each role's slot (lib/leadership/tree.ts).

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import DashboardBanner from "@/components/DashboardBanner";
import { toast } from "@/components/Toast";
import LeadershipTree from "@/components/lore/LeadershipTree";
import {
  PROJECT_GROUPS, SLOTS, SLOT_LABELS, STRUCTURES, STRUCTURE_LABELS, isYearKey, shortLeadershipYear,
  type LeadershipData, type LeadershipHolder, type LeadershipRole, type Slot, type Structure,
} from "@/lib/leadership/types";
import { PVP_ONLY_NOTE, defaultYear, profileHrefFor } from "@/components/lore/LeadershipView";

type DirPerson = { id: string; name: string; slug: string; years: string[] };
type RoleDraft = Pick<LeadershipRole, "title" | "slot" | "projectGroup" | "parentRoleId">;
type HolderDraft = Pick<LeadershipHolder, "name" | "qualifier" | "note" | "personId">;

const INPUT = "w-full rounded-xl border border-pine/20 bg-paper px-3 py-2 text-sm text-ink outline-none placeholder:text-ink/40 focus:border-pine/50 focus:ring-2 focus:ring-pine/15";
const LABEL = "block text-[11px] font-semibold uppercase tracking-wide text-ink/55";
const SMALL_BTN = "inline-flex items-center justify-center rounded-full border border-pine/20 px-3 py-1.5 text-xs font-semibold text-pine-deep transition-colors hover:border-pine/45 hover:bg-pine/[0.06] disabled:cursor-not-allowed disabled:opacity-40";
const SAVE_BTN = "inline-flex items-center justify-center rounded-full bg-pine px-3.5 py-1.5 text-xs font-semibold text-paper transition-colors hover:bg-pine-deep disabled:cursor-not-allowed disabled:opacity-40";
const ICON_BTN = "grid h-8 w-8 place-items-center rounded-full text-ink/65 hover:bg-pine/[0.07] hover:text-pine-deep disabled:opacity-30 disabled:hover:bg-transparent";

const blank = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);
const sameRole = (a: RoleDraft, b: RoleDraft) =>
  a.title.trim() === b.title.trim() && a.slot === b.slot && blank(a.projectGroup) === blank(b.projectGroup) && (a.parentRoleId ?? null) === (b.parentRoleId ?? null);
const sameHolder = (a: HolderDraft, b: HolderDraft) =>
  a.name.trim() === b.name.trim() && blank(a.qualifier) === blank(b.qualifier) && blank(a.note) === blank(b.note) && (a.personId ?? null) === (b.personId ?? null);

export default function LeadershipEditor() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [data, setData] = useState<LeadershipData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [people, setPeople] = useState<DirPerson[]>([]);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, RoleDraft>>({});
  const [holderDrafts, setHolderDrafts] = useState<Record<string, HolderDraft>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [a, b] = await Promise.all([
          fetch("/api/lms/leadership", { cache: "no-store" }),
          fetch("/api/lms/leadership/admin", { cache: "no-store" }),
        ]);
        const [da, db] = await Promise.all([a.json().catch(() => ({})), b.json().catch(() => ({}))]);
        if (!a.ok) return setLoadError(da.error ?? "Couldn't load leadership history.");
        if (!b.ok) return setLoadError(db.error ?? "Couldn't load the Full Directory.");
        setData(da as LeadershipData);
        setPeople((db as { people: DirPerson[] }).people);
      } catch {
        setLoadError("Couldn't load the editor. Check your connection and try again.");
      }
    })();
  }, []);

  const allYears = useMemo(() => (data ? data.years.map((y) => y.year).sort() : []), [data]);
  const asked = params.get("year");
  const year = asked && allYears.includes(asked) ? asked : defaultYear(allYears);
  const setYear = useCallback((y: string) => router.replace(`${pathname}?year=${y}`, { scroll: false }), [pathname, router]);

  /** Send one edit; on success show what the database now holds. */
  const save = useCallback(async (body: Record<string, unknown>, done?: string): Promise<boolean> => {
    setBusy(true);
    try {
      const res = await fetch("/api/lms/leadership/admin", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) { toast({ tone: "error", message: out.error ?? "Couldn't save that." }); return false; }
      setData(out as LeadershipData);
      if (done) toast({ message: done });
      return true;
    } catch {
      toast({ tone: "error", message: "Couldn't reach the server. Nothing was saved." });
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  if (loadError) return <Shell year={null}><p className="py-16 text-center text-sm text-ink/70" role="alert">{loadError}</p></Shell>;
  if (!data) return <Shell year={null}><p className="py-16 text-center text-sm text-ink/60" role="status">Loading the editor…</p></Shell>;

  const yearRow = year ? data.years.find((y) => y.year === year) ?? null : null;
  const roles = data.roles.filter((r) => r.year === year).sort((a, b) => a.sortOrder - b.sortOrder);
  const roleIds = new Set(roles.map((r) => r.id));
  const holders = data.holders.filter((h) => roleIds.has(h.roleId));

  // The preview: stored rows with any unsaved edits applied.
  const previewRoles = roles.map((r) => (roleDrafts[r.id] ? { ...r, ...roleDrafts[r.id] } : r));
  const previewHolders = holders.map((h) => (holderDrafts[h.id] ? { ...h, ...holderDrafts[h.id] } : h));
  const dropRoleDraft = (id: string) => setRoleDrafts(({ [id]: _, ...rest }) => rest);
  const dropHolderDraft = (id: string) => setHolderDrafts(({ [id]: _, ...rest }) => rest);

  return (
    <Shell year={year}>
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="min-w-0 space-y-6" data-editor>
          <YearBar years={allYears} year={year} onPick={setYear} busy={busy}
            onCreate={async (y, structure, note) => {
              if (await save({ op: "year.create", year: y, structure, note }, `Added ${shortLeadershipYear(y)}`)) setYear(y);
            }} />

          {yearRow && (
            <YearSettings key={yearRow.year} yearRow={yearRow} roleCount={roles.length} busy={busy}
              onSave={(structure, note) => save({ op: "year.update", year: yearRow.year, structure, note }, "Year saved")}
              onDelete={async () => {
                if (await save({ op: "year.delete", year: yearRow.year }, `Deleted ${shortLeadershipYear(yearRow.year)}`)) router.replace(pathname);
              }} />
          )}

          {yearRow && (
            <section aria-labelledby="roles-h" className="space-y-3">
              <h2 id="roles-h" className="font-display text-xl font-semibold text-pine-deep">Roles in {shortLeadershipYear(yearRow.year)}</h2>
              {roles.length === 0 && <p className="text-sm text-ink/60">No roles yet. Add the first one below.</p>}
              {roles.map((r, i) => (
                <RoleEditor
                  key={r.id}
                  role={r}
                  draft={roleDrafts[r.id] ?? null}
                  onDraft={(d) => (sameRole(d, r) ? dropRoleDraft(r.id) : setRoleDrafts((x) => ({ ...x, [r.id]: d })))}
                  others={roles.filter((o) => o.id !== r.id)}
                  holders={holders.filter((h) => h.roleId === r.id).sort((a, b) => a.sortOrder - b.sortOrder)}
                  holderDrafts={holderDrafts}
                  onHolderDraft={(h, d) => (sameHolder(d, h) ? dropHolderDraft(h.id) : setHolderDrafts((x) => ({ ...x, [h.id]: d })))}
                  people={people}
                  first={i === 0}
                  last={i === roles.length - 1}
                  busy={busy}
                  save={save}
                  onSaved={() => dropRoleDraft(r.id)}
                  onHolderSaved={dropHolderDraft}
                />
              ))}
              <AddRole year={yearRow.year} roles={roles} busy={busy} save={save} />
            </section>
          )}
        </div>

        <aside className="min-w-0 xl:sticky xl:top-[calc(var(--header-h,4rem)+1rem)] xl:self-start" aria-labelledby="preview-h">
          <div className="rounded-3xl border border-pine/12 bg-paper p-4 sm:p-6" data-editor-preview>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 id="preview-h" className="font-display text-xl font-semibold text-pine-deep">Live preview</h2>
              <span className="text-xs text-ink/50">Includes unsaved edits</span>
            </div>
            {yearRow ? (
              <>
                {(yearRow.note ?? (yearRow.structure === "pvp_only" ? PVP_ONLY_NOTE : null)) && (
                  <p className="mb-3 text-center text-sm text-ink/55">{yearRow.note ?? PVP_ONLY_NOTE}</p>
                )}
                <LeadershipTree year={yearRow} roles={previewRoles} holders={previewHolders}
                  hrefOf={profileHrefFor(data)} meId={data.meId}
                  label={`Preview of ${shortLeadershipYear(yearRow.year)}`} />
              </>
            ) : (
              <p className="py-10 text-center text-sm text-ink/60">Add a year to start.</p>
            )}
          </div>
        </aside>
      </div>
    </Shell>
  );
}

function Shell({ year, children }: { year: string | null; children: React.ReactNode }) {
  return (
    <>
      <DashboardBanner>
        <div className="container-rishi relative z-10 py-12">
          <Link href={`/dashboard/lore?tab=leadership${year ? `&year=${year}` : ""}`}
            className="inline-flex items-center gap-2 text-sm text-paper/70 transition-colors hover:text-paper">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
            Back to Lore
          </Link>
          <h1 className="mt-4 font-display text-4xl font-semibold">Edit leadership</h1>
          <p className="mt-2 max-w-2xl text-paper/75">Webmasters only. The tree is drawn from each role&apos;s slot, so you never connect boxes by hand.</p>
        </div>
      </DashboardBanner>
      <section className="container-rishi py-10">{children}</section>
    </>
  );
}

// ------------------------------------------------------------------ years
function YearBar({ years, year, onPick, onCreate, busy }: {
  years: string[]; year: string | null; onPick: (y: string) => void; busy: boolean;
  onCreate: (y: string, s: Structure, note: string | null) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [y, setY] = useState("");
  const [s, setS] = useState<Structure>("one_vp");
  const [note, setNote] = useState("");
  const valid = isYearKey(y.trim()) && !years.includes(y.trim());
  return (
    <div className="rounded-3xl border border-pine/12 bg-pine/[0.03] p-4 sm:p-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[10rem] flex-1">
          <span className={LABEL}>Year</span>
          <select className={`${INPUT} mt-1`} value={year ?? ""} onChange={(e) => onPick(e.target.value)} disabled={!years.length}>
            {[...years].reverse().map((x) => <option key={x} value={x}>{shortLeadershipYear(x)}</option>)}
          </select>
        </label>
        <button type="button" className={SMALL_BTN} onClick={() => setAdding((a) => !a)} aria-expanded={adding}>
          {adding ? "Cancel" : "Add a year"}
        </button>
      </div>
      {adding && (
        <form className="mt-4 grid gap-3 sm:grid-cols-[8rem_1fr]" onSubmit={async (e) => {
          e.preventDefault();
          if (!valid) return;
          await onCreate(y.trim(), s, blank(note));
          setAdding(false); setY(""); setNote("");
        }}>
          <label><span className={LABEL}>Year key</span>
            <input className={`${INPUT} mt-1`} value={y} onChange={(e) => setY(e.target.value)} placeholder="2027-2028" inputMode="numeric" />
          </label>
          <label><span className={LABEL}>Structure</span>
            <select className={`${INPUT} mt-1`} value={s} onChange={(e) => setS(e.target.value as Structure)}>
              {STRUCTURES.map((x) => <option key={x} value={x}>{STRUCTURE_LABELS[x]}</option>)}
            </select>
          </label>
          <label className="sm:col-span-2"><span className={LABEL}>Note (optional)</span>
            <input className={`${INPUT} mt-1`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Shown above the tree" />
          </label>
          <div className="flex items-center gap-3 sm:col-span-2">
            <button type="submit" className={SAVE_BTN} disabled={!valid || busy}>Add year</button>
            {y.trim() && !valid && <span className="text-xs text-ink/55">{years.includes(y.trim()) ? "That year already exists." : 'Use the form "2027-2028".'}</span>}
          </div>
        </form>
      )}
    </div>
  );
}

function YearSettings({ yearRow, roleCount, busy, onSave, onDelete }: {
  yearRow: { year: string; structure: Structure; note: string | null }; roleCount: number; busy: boolean;
  onSave: (s: Structure, note: string | null) => Promise<boolean>; onDelete: () => Promise<void>;
}) {
  const [s, setS] = useState(yearRow.structure);
  const [note, setNote] = useState(yearRow.note ?? "");
  useEffect(() => { setS(yearRow.structure); setNote(yearRow.note ?? ""); }, [yearRow.structure, yearRow.note]);
  const dirty = s !== yearRow.structure || blank(note) !== blank(yearRow.note);
  return (
    <div className="rounded-3xl border border-pine/12 p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label><span className={LABEL}>Structure</span>
          <select className={`${INPUT} mt-1`} value={s} onChange={(e) => setS(e.target.value as Structure)}>
            {STRUCTURES.map((x) => <option key={x} value={x}>{STRUCTURE_LABELS[x]}</option>)}
          </select>
        </label>
        <label><span className={LABEL}>Year note</span>
          <input className={`${INPUT} mt-1`} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder={s === "pvp_only" ? PVP_ONLY_NOTE : "Optional"} />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <button type="button" className={SAVE_BTN} disabled={!dirty || busy} onClick={() => onSave(s, blank(note))}>Save year</button>
        <ConfirmDelete label={`Delete ${shortLeadershipYear(yearRow.year)}`} busy={busy}
          question={`Delete ${shortLeadershipYear(yearRow.year)} and its ${roleCount} ${roleCount === 1 ? "role" : "roles"} (with their holders)?`}
          onConfirm={onDelete} />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ roles
function RoleFields({ value, onChange, others }: { value: RoleDraft; onChange: (d: RoleDraft) => void; others: LeadershipRole[] }) {
  const needsGroup = value.slot === "lead" || value.slot === "senior_lead";
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="sm:col-span-2"><span className={LABEL}>Title</span>
        <input className={`${INPUT} mt-1`} value={value.title} onChange={(e) => onChange({ ...value, title: e.target.value })} placeholder="Director of Finance" />
      </label>
      <label><span className={LABEL}>Slot</span>
        <select className={`${INPUT} mt-1`} value={value.slot} onChange={(e) => onChange({ ...value, slot: e.target.value as Slot })}>
          {SLOTS.map((s) => <option key={s} value={s}>{SLOT_LABELS[s]}</option>)}
        </select>
      </label>
      <label><span className={LABEL}>Project group{needsGroup ? "" : " (leads only)"}</span>
        <input className={`${INPUT} mt-1`} list="lore-groups" value={value.projectGroup ?? ""} placeholder={needsGroup ? "Pick or type" : "—"}
          onChange={(e) => onChange({ ...value, projectGroup: e.target.value || null })} />
      </label>
      <label className="sm:col-span-2"><span className={LABEL}>Hangs under</span>
        <select className={`${INPUT} mt-1`} value={value.parentRoleId ?? ""} onChange={(e) => onChange({ ...value, parentRoleId: e.target.value || null })}>
          <option value="">Its slot&apos;s usual place (recommended)</option>
          {others.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
        </select>
      </label>
      <datalist id="lore-groups">{PROJECT_GROUPS.map((g) => <option key={g} value={g} />)}</datalist>
    </div>
  );
}

function RoleEditor(props: {
  role: LeadershipRole; draft: RoleDraft | null; onDraft: (d: RoleDraft) => void; others: LeadershipRole[];
  holders: LeadershipHolder[]; holderDrafts: Record<string, HolderDraft>; onHolderDraft: (h: LeadershipHolder, d: HolderDraft) => void;
  people: DirPerson[]; first: boolean; last: boolean; busy: boolean;
  save: (b: Record<string, unknown>, done?: string) => Promise<boolean>; onSaved: () => void; onHolderSaved: (id: string) => void;
}) {
  const { role: r, draft, busy, save } = props;
  const value: RoleDraft = draft ?? { title: r.title, slot: r.slot, projectGroup: r.projectGroup, parentRoleId: r.parentRoleId };
  const dirty = !!draft;
  const holdersDirty = props.holders.some((h) => props.holderDrafts[h.id]);
  const [expanded, setExpanded] = useState(false);
  const open = expanded || dirty || holdersDirty; // never hide unsaved edits
  const bodyId = `role-body-${r.id}`;
  return (
    <article className="rounded-3xl border border-pine/12 bg-paper p-4 sm:p-5" data-role-editor={r.title}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-pine-deep">
            {r.title}
            {(dirty || holdersDirty) && <span className="ml-2 text-xs font-normal text-marigold-ink">unsaved</span>}
          </p>
          <p className="mt-0.5 truncate text-xs text-ink/55">
            {SLOT_LABELS[r.slot]}{r.projectGroup ? ` · ${r.projectGroup}` : ""}
            {" · "}{props.holders.length ? props.holders.map((h) => h.name).join(", ") : "no holders"}
          </p>
        </div>
        <div className="flex shrink-0 items-center">
          <button type="button" className={ICON_BTN} aria-label={`Move ${r.title} up`} disabled={props.first || busy}
            onClick={() => save({ op: "role.move", id: r.id, dir: -1 })}>↑</button>
          <button type="button" className={ICON_BTN} aria-label={`Move ${r.title} down`} disabled={props.last || busy}
            onClick={() => save({ op: "role.move", id: r.id, dir: 1 })}>↓</button>
          <button type="button" className={`${SMALL_BTN} ml-1`} aria-expanded={open} aria-controls={bodyId}
            disabled={dirty || holdersDirty} onClick={() => setExpanded((x) => !x)}>
            {open ? "Done" : "Edit"}
          </button>
        </div>
      </div>
      {open && (
      <div id={bodyId} className="mt-4">
      <RoleFields value={value} onChange={props.onDraft} others={props.others} />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button type="button" className={SAVE_BTN} disabled={!dirty || busy || !value.title.trim()}
            onClick={async () => { if (await save({ op: "role.update", id: r.id, ...value }, "Role saved")) props.onSaved(); }}>Save role</button>
          {dirty && <button type="button" className={SMALL_BTN} onClick={() => props.onDraft({ title: r.title, slot: r.slot, projectGroup: r.projectGroup, parentRoleId: r.parentRoleId })}>Undo</button>}
        </div>
        <ConfirmDelete label="Delete role" busy={busy}
          question={`Delete “${r.title}”${props.holders.length ? ` and its ${props.holders.length} ${props.holders.length === 1 ? "holder" : "holders"}` : ""}?`}
          onConfirm={async () => { await save({ op: "role.delete", id: r.id }, "Role deleted"); }} />
      </div>

      <div className="mt-4 border-t border-pine/10 pt-4">
        <p className={LABEL}>Holders</p>
        <ul className="mt-2 space-y-3">
          {props.holders.map((h, i) => (
            <HolderEditor key={h.id} holder={h} draft={props.holderDrafts[h.id] ?? null} onDraft={(d) => props.onHolderDraft(h, d)}
              people={props.people} first={i === 0} last={i === props.holders.length - 1} busy={busy} save={save}
              onSaved={() => props.onHolderSaved(h.id)} />
          ))}
        </ul>
        <AddHolder roleId={r.id} people={props.people} busy={busy} save={save} />
      </div>
      </div>
      )}
    </article>
  );
}

function AddRole({ year, roles, busy, save }: {
  year: string; roles: LeadershipRole[]; busy: boolean; save: (b: Record<string, unknown>, done?: string) => Promise<boolean>;
}) {
  const empty: RoleDraft = { title: "", slot: "director", projectGroup: null, parentRoleId: null };
  const [v, setV] = useState<RoleDraft>(empty);
  const [open, setOpen] = useState(false);
  if (!open) return <button type="button" className={SMALL_BTN} onClick={() => setOpen(true)}>+ Add a role</button>;
  return (
    <form className="rounded-3xl border border-dashed border-pine/25 p-4 sm:p-5" onSubmit={async (e) => {
      e.preventDefault();
      if (await save({ op: "role.create", year, ...v }, `Added “${v.title.trim()}”`)) { setV(empty); setOpen(false); }
    }}>
      <p className="mb-3 font-semibold text-pine-deep">New role</p>
      <RoleFields value={v} onChange={setV} others={roles} />
      <div className="mt-3 flex gap-2">
        <button type="submit" className={SAVE_BTN} disabled={busy || !v.title.trim()}>Add role</button>
        <button type="button" className={SMALL_BTN} onClick={() => { setV(empty); setOpen(false); }}>Cancel</button>
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ holders
function HolderEditor({ holder: h, draft, onDraft, people, first, last, busy, save, onSaved }: {
  holder: LeadershipHolder; draft: HolderDraft | null; onDraft: (d: HolderDraft) => void; people: DirPerson[];
  first: boolean; last: boolean; busy: boolean; save: (b: Record<string, unknown>, done?: string) => Promise<boolean>; onSaved: () => void;
}) {
  const v: HolderDraft = draft ?? { name: h.name, qualifier: h.qualifier, note: h.note, personId: h.personId };
  return (
    <li className="rounded-2xl border border-pine/10 bg-pine/[0.02] p-3" data-holder-editor={h.name}>
      <div className="grid gap-2 sm:grid-cols-2">
        <label><span className={LABEL}>Name</span>
          <input className={`${INPUT} mt-1`} value={v.name} onChange={(e) => onDraft({ ...v, name: e.target.value })} />
        </label>
        <label><span className={LABEL}>Qualifier (on the tree)</span>
          <input className={`${INPUT} mt-1`} value={v.qualifier ?? ""} placeholder="e.g. Fall 2019" onChange={(e) => onDraft({ ...v, qualifier: e.target.value || null })} />
        </label>
        <label className="sm:col-span-2"><span className={LABEL}>Note (shown on hover)</span>
          <input className={`${INPUT} mt-1`} value={v.note ?? ""} placeholder="e.g. Title not stated" onChange={(e) => onDraft({ ...v, note: e.target.value || null })} />
        </label>
        <div className="sm:col-span-2">
          <DirectoryPicker people={people} value={v.personId} suggest={v.name} onChange={(personId) => onDraft({ ...v, personId })} />
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button type="button" className={SAVE_BTN} disabled={!draft || busy || !v.name.trim()}
            onClick={async () => { if (await save({ op: "holder.update", id: h.id, ...v }, "Holder saved")) onSaved(); }}>Save</button>
          {draft && <button type="button" className={SMALL_BTN} onClick={() => onDraft({ name: h.name, qualifier: h.qualifier, note: h.note, personId: h.personId })}>Undo</button>}
          <button type="button" className={ICON_BTN} aria-label={`Move ${h.name} up`} disabled={first || busy} onClick={() => save({ op: "holder.move", id: h.id, dir: -1 })}>↑</button>
          <button type="button" className={ICON_BTN} aria-label={`Move ${h.name} down`} disabled={last || busy} onClick={() => save({ op: "holder.move", id: h.id, dir: 1 })}>↓</button>
        </div>
        <ConfirmDelete label="Remove" busy={busy} question={`Remove ${h.name} from this role?`}
          onConfirm={async () => { await save({ op: "holder.delete", id: h.id }, `Removed ${h.name}`); }} />
      </div>
    </li>
  );
}

function AddHolder({ roleId, people, busy, save }: {
  roleId: string; people: DirPerson[]; busy: boolean; save: (b: Record<string, unknown>, done?: string) => Promise<boolean>;
}) {
  const empty: HolderDraft = { name: "", qualifier: null, note: null, personId: null };
  const [v, setV] = useState<HolderDraft>(empty);
  const [open, setOpen] = useState(false);
  if (!open) return <button type="button" className={`${SMALL_BTN} mt-3`} onClick={() => setOpen(true)}>+ Add a holder</button>;
  return (
    <form className="mt-3 rounded-2xl border border-dashed border-pine/25 p-3" onSubmit={async (e) => {
      e.preventDefault();
      if (await save({ op: "holder.create", roleId, ...v }, `Added ${v.name.trim()}`)) { setV(empty); setOpen(false); }
    }}>
      <div className="grid gap-2 sm:grid-cols-2">
        <label><span className={LABEL}>Name</span>
          <input className={`${INPUT} mt-1`} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} autoFocus />
        </label>
        <label><span className={LABEL}>Qualifier (optional)</span>
          <input className={`${INPUT} mt-1`} value={v.qualifier ?? ""} onChange={(e) => setV({ ...v, qualifier: e.target.value || null })} />
        </label>
        <div className="sm:col-span-2">
          <DirectoryPicker people={people} value={v.personId} suggest={v.name} onChange={(personId) => setV({ ...v, personId })} />
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <button type="submit" className={SAVE_BTN} disabled={busy || !v.name.trim()}>Add</button>
        <button type="button" className={SMALL_BTN} onClick={() => { setV(empty); setOpen(false); }}>Cancel</button>
      </div>
    </form>
  );
}

/** Link a holder to a Full Directory record by searching it — the stored id is what
 *  the tree's profile link and "You" highlight use, never the typed name. */
function DirectoryPicker({ people, value, suggest, onChange }: {
  people: DirPerson[]; value: string | null; suggest: string; onChange: (id: string | null) => void;
}) {
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState("");
  const linked = value ? people.find((p) => p.id === value) ?? null : null;
  const query = (searching ? q : "").trim().toLowerCase();
  const tokens = query.split(/\s+/).filter(Boolean);
  const results = tokens.length
    ? people.filter((p) => tokens.every((t) => p.name.toLowerCase().includes(t))).slice(0, 8)
    : [];
  const span = (p: DirPerson) => (p.years.length ? `${p.years[0].slice(0, 4)}–${p.years[p.years.length - 1].slice(7, 9)}` : "years unknown");

  return (
    <div>
      <span className={LABEL}>Full Directory link</span>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {linked ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-pine/[0.08] px-3 py-1 text-xs font-medium text-pine-deep" data-linked-slug={linked.slug}>
            {linked.name} <span className="text-ink/50">· {span(linked)}</span>
          </span>
        ) : value ? (
          <span className="text-xs text-red-700">Linked record no longer in the directory</span>
        ) : (
          <span className="text-xs text-ink/55">Not linked</span>
        )}
        <button type="button" className={SMALL_BTN} onClick={() => { setSearching((s) => !s); setQ(suggest); }}>
          {searching ? "Close search" : value ? "Change" : "Link…"}
        </button>
        {value && <button type="button" className={SMALL_BTN} onClick={() => onChange(null)}>Unlink</button>}
      </div>
      {searching && (
        <div className="mt-2">
          <input className={INPUT} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the Full Directory" aria-label="Search the Full Directory" autoFocus />
          <ul className="mt-1 max-h-56 overflow-y-auto rounded-xl border border-pine/12" role="listbox" aria-label="Directory matches">
            {results.map((p) => (
              <li key={p.id}>
                <button type="button" role="option" aria-selected={p.id === value}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-pine/[0.06]"
                  onClick={() => { onChange(p.id); setSearching(false); }}>
                  <span className="text-ink">{p.name}</span>
                  <span className="shrink-0 text-xs text-ink/50">{span(p)} · {p.slug}</span>
                </button>
              </li>
            ))}
            {tokens.length > 0 && !results.length && <li className="px-3 py-2 text-sm text-ink/55">No one in the directory matches.</li>}
            {!tokens.length && <li className="px-3 py-2 text-sm text-ink/55">Type a name.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ confirm
function ConfirmDelete({ label, question, onConfirm, busy }: { label: string; question: string; onConfirm: () => Promise<void>; busy: boolean }) {
  const [asking, setAsking] = useState(false);
  if (!asking)
    return <button type="button" className={`${SMALL_BTN} border-red-700/30 text-red-700 hover:border-red-700/60 hover:bg-red-700/[0.06]`} onClick={() => setAsking(true)} disabled={busy}>{label}</button>;
  return (
    <span className="inline-flex flex-wrap items-center gap-2 rounded-2xl bg-red-700/[0.06] px-3 py-1.5 text-xs text-ink" role="alertdialog" aria-label={question}>
      <span>{question}</span>
      <button type="button" className="rounded-full bg-red-700 px-3 py-1 font-semibold text-paper hover:bg-red-800 disabled:opacity-40" disabled={busy}
        onClick={async () => { await onConfirm(); setAsking(false); }} data-confirm-delete>Yes, delete</button>
      <button type="button" className="rounded-full px-2 py-1 font-semibold text-ink/70 hover:text-ink" onClick={() => setAsking(false)}>Cancel</button>
    </span>
  );
}

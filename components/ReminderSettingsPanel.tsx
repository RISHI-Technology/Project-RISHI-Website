"use client";

import { useEffect, useRef, useState } from "react";

// Reminder settings for anyone who can assign tasks: one section per team
// they're on (their group's leads, NMT leaders, an intern kind's supervisors,
// VPs/President). Each section only affects tasks that team assigns. Renders
// nothing for anyone else. Every change saves straight away; teammates share
// the same settings, so they see each other's changes.
//
// The page itself only shows each team's DEFAULT; per-member settings open in
// a dialog ("Customize members"), so long rosters (e.g. a VP's) don't fill
// the settings page.

type BeforeKey = "7d" | "6d" | "5d" | "4d" | "3d" | "2d" | "1d" | "6h" | "3h" | "1h";
type OverdueKey = "daily" | "2d" | "weekly" | "off";
type Prefs = { before: BeforeKey[]; overdue: OverdueKey };
type MemberRow = {
  email: string; name: string; prefs: Prefs; sourceLabel: string; custom: boolean;
  updatedAt: string | null; updatedBy: string | null;
};
type Scope = {
  id: string; label: string; team: string;
  default: { prefs: Prefs; custom: boolean; updatedAt: string | null; updatedBy: string | null };
  members: MemberRow[];
};
type Options = { before: { key: BeforeKey; label: string }[]; overdue: { key: OverdueKey; label: string }[] };
type Data = { options: Options; standard: Prefs; scopes: Scope[] };
type Save = (key: string, body: object, done: string) => Promise<void>;

const when = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const isDayKey = (k: BeforeKey) => k.endsWith("d");

/** One line describing a setting, e.g. "1 day, 1 hour before · overdue: daily". */
function summary(p: Prefs, options: Options): string {
  const labels = options.before.filter((o) => p.before.includes(o.key)).map((o) => o.label);
  const overdue = options.overdue.find((o) => o.key === p.overdue)?.label.toLowerCase() ?? p.overdue;
  return `${labels.length ? `${labels.join(", ")} before` : "Nothing before due"} · overdue: ${overdue}`;
}

function Chips({ label, keys, prefs, options, disabled, onToggle }: {
  label: string; keys: BeforeKey[]; prefs: Prefs; options: Options; disabled: boolean; onToggle: (k: BeforeKey) => void;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-1.5" role="group" aria-label={`Reminders ${label.toLowerCase()} the due time`}>
      <span className="w-24 shrink-0 text-xs text-ink/70 sm:pt-1.5">{label}:</span>
      <div className="flex flex-wrap gap-1.5">
        {options.before.filter((o) => keys.includes(o.key)).map((o) => {
          const on = prefs.before.includes(o.key);
          return (
            <button
              key={o.key}
              type="button"
              aria-pressed={on}
              disabled={disabled}
              onClick={() => onToggle(o.key)}
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
                on ? "border-pine bg-pine text-paper" : "border-ink/15 bg-paper text-ink/65 hover:border-pine/40"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PrefsEditor({ prefs, options, disabled, onChange, idPrefix }: {
  prefs: Prefs; options: Options; disabled: boolean; onChange: (p: Prefs) => void; idPrefix: string;
}) {
  const toggle = (k: BeforeKey) => {
    const on = prefs.before.includes(k);
    onChange({ ...prefs, before: on ? prefs.before.filter((x) => x !== k) : [...prefs.before, k] });
  };
  const keys = options.before.map((o) => o.key);
  return (
    <div className="space-y-2">
      <Chips label="Days before" keys={keys.filter(isDayKey)} prefs={prefs} options={options} disabled={disabled} onToggle={toggle} />
      <Chips label="Hours before" keys={keys.filter((k) => !isDayKey(k))} prefs={prefs} options={options} disabled={disabled} onToggle={toggle} />
      <label className="flex items-center gap-1.5 text-xs text-ink/70" htmlFor={`${idPrefix}-overdue`}>
        <span className="w-24 shrink-0">When overdue:</span>
        <select
          id={`${idPrefix}-overdue`}
          value={prefs.overdue}
          disabled={disabled}
          onChange={(e) => onChange({ ...prefs, overdue: e.target.value as OverdueKey })}
          className="rounded-lg border border-pine/20 bg-paper px-2 py-1 text-xs font-semibold text-ink outline-none focus:border-pine disabled:opacity-50"
        >
          {options.overdue.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </label>
    </div>
  );
}

function StatusLine({ msg }: { msg: { text: string; error: boolean } | null }) {
  return msg ? (
    <p role="status" className={`text-xs ${msg.error ? "text-red-700" : "text-pine-deep"}`}>{msg.text}</p>
  ) : null;
}

/** Per-member settings for one team, in a dialog. */
function MembersDialog({ scope, options, busy, msg, save, onClose }: {
  scope: Scope; options: Options; busy: string | null; msg: { text: string; error: boolean } | null;
  save: Save; onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [openRow, setOpenRow] = useState<string | null>(null);
  const search = useRef<HTMLInputElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; });

  // Once, on open: focus the search, Escape closes, and the page behind stays put.
  useEffect(() => {
    search.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close.current(); };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; };
  }, []);

  const q = query.trim().toLowerCase();
  const rows = scope.members.filter((m) => !q || m.name.toLowerCase().includes(q) || m.email.includes(q));
  const titleId = `rem-dialog-${scope.id}`;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-ink/50 p-4 safe-overlay" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-3xl bg-paper shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-ink/10 p-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 id={titleId} className="font-display text-lg font-semibold text-pine-deep">{scope.label}: member reminders</h3>
              <p className="mt-0.5 text-xs text-ink/65">For tasks assigned by {scope.team}. Members without their own setting use the default.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-ink/15 px-3 py-1.5 text-xs font-semibold text-ink/70 hover:bg-ink/5"
            >
              Close
            </button>
          </div>
          <input
            ref={search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Find one of ${scope.members.length} members…`}
            aria-label="Find a member"
            className="mt-3 w-full rounded-lg border border-pine/20 bg-paper px-3 py-2 text-sm outline-none focus:border-pine"
          />
          <div className="mt-2 min-h-[1rem]"><StatusLine msg={msg} /></div>
        </div>

        <ul className="space-y-2 overflow-y-auto p-5 pt-3">
          {rows.map((m) => {
            const open = openRow === m.email;
            return (
              <li key={m.email} className="rounded-xl border border-ink/10 bg-paper/70 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">
                      <span>{m.name}</span>{" "}
                      <span
                        className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          m.custom ? "bg-marigold-soft/60 text-marigold-ink" : "bg-sage/15 text-pine-deep"
                        }`}
                      >
                        {m.sourceLabel}
                      </span>
                    </p>
                    {!open && <p className="mt-0.5 text-xs text-ink/65">{summary(m.prefs, options)}</p>}
                  </div>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenRow(open ? null : m.email)}
                    className="rounded-full border border-pine/30 px-3 py-1 text-xs font-semibold text-pine-deep hover:bg-pine/5"
                  >
                    {open ? "Done" : "Change"}
                  </button>
                </div>
                {open && (
                  <div className="mt-3">
                    <PrefsEditor
                      idPrefix={`${scope.id}-${m.email}`}
                      prefs={m.prefs}
                      options={options}
                      disabled={busy !== null}
                      onChange={(p) => void save(`${scope.id}:${m.email}`, { scope: scope.id, email: m.email, prefs: p }, `Saved for ${m.name}.`)}
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {m.custom && (
                        <button
                          type="button"
                          disabled={busy !== null}
                          onClick={() => void save(`${scope.id}:${m.email}`, { scope: scope.id, email: m.email, prefs: null }, `${m.name} is back on the default.`)}
                          className="text-xs font-semibold text-pine underline-offset-2 hover:underline disabled:opacity-50"
                        >
                          Use default
                        </button>
                      )}
                      {m.custom && m.updatedAt && (
                        <p className="text-[11px] text-ink/60">Changed by {m.updatedBy} on {when(m.updatedAt)}</p>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
          {rows.length === 0 && <li className="text-xs text-ink/60">No members match.</li>}
        </ul>
      </div>
    </div>
  );
}

export default function ReminderSettingsPanel() {
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // what's saving right now
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [dialog, setDialog] = useState<string | null>(null); // scope id whose members are open
  const opener = useRef<HTMLButtonElement | null>(null);

  const load = () =>
    fetch("/api/lms/reminders/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setData(d))
      .catch(() => {});

  useEffect(() => { void load(); }, []);

  const save: Save = async (key, body, done) => {
    setBusy(key);
    setMsg(null);
    try {
      const r = await fetch("/api/lms/reminders/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error || "Couldn't save that change.");
      setData(d as Data);
      setMsg({ text: done, error: false });
    } catch (e) {
      setMsg({ text: (e as Error).message, error: true });
      void load(); // show what's actually saved
    } finally {
      setBusy(null);
    }
  };

  const closeDialog = () => {
    setDialog(null);
    setMsg(null);
    opener.current?.focus(); // back to the button that opened it
  };

  if (!data || data.scopes.length === 0) return null;
  const openScope = data.scopes.find((s) => s.id === dialog) ?? null;

  return (
    <div className="mx-auto mt-6 max-w-xl rounded-3xl border border-pine/15 bg-pine/[0.03] p-8">
      <h2 className="font-display text-lg font-semibold text-pine-deep">Reminder emails</h2>
      <p className="mt-1 text-sm text-ink/75">Automatic reminders for tasks that aren&apos;t done yet.</p>
      {!openScope && <div className="mt-3"><StatusLine msg={msg} /></div>}

      {data.scopes.map((scope) => {
        const customCount = scope.members.filter((m) => m.custom).length;
        return (
          <section key={scope.id} className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/70">
              {scope.label} <span className="font-normal normal-case tracking-normal text-ink/60">· {scope.members.length} members</span>
            </h3>
            <p className="mt-0.5 text-xs text-ink/65">For tasks assigned by {scope.team}.</p>

            <div className="mt-2 rounded-xl border border-pine/20 bg-paper p-4">
              <p className="text-sm font-semibold text-ink">{scope.id === "club" ? "Default for everyone" : `Default for everyone in ${scope.label}`}</p>
              <p className="mb-3 mt-0.5 text-xs text-ink/65">
                {scope.default.custom && scope.default.updatedAt
                  ? `Changed by ${scope.default.updatedBy} on ${when(scope.default.updatedAt)}. `
                  : "Standard reminders. "}
                Applies to everyone who doesn&apos;t have their own setting.
              </p>
              <PrefsEditor
                idPrefix={`${scope.id}-default`}
                prefs={scope.default.prefs}
                options={data.options}
                disabled={busy !== null}
                onChange={(p) => void save(`${scope.id}:default`, { scope: scope.id, prefs: p }, `${scope.label} default saved.`)}
              />
              {scope.default.custom && (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void save(`${scope.id}:default`, { scope: scope.id, prefs: null }, `${scope.label} default reset to the standard reminders.`)}
                  className="mt-3 rounded-full border border-ink/15 px-3 py-1.5 text-xs font-semibold text-ink/70 hover:bg-ink/5 disabled:opacity-50"
                >
                  Reset default to standard
                </button>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink/10 bg-paper/70 px-4 py-3">
              <p className="text-xs text-ink/70">
                {customCount === 0
                  ? `All ${scope.members.length} members use the default.`
                  : `${customCount} of ${scope.members.length} member${scope.members.length === 1 ? "" : "s"} ${customCount === 1 ? "has" : "have"} their own setting.`}
              </p>
              <div className="flex flex-wrap gap-2">
                {customCount > 0 && (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => {
                      if (!confirm(`Put the ${customCount} member${customCount === 1 ? "" : "s"} with their own setting back on the ${scope.label} default?`)) return;
                      void save(`${scope.id}:reset`, { scope: scope.id, resetMembers: true }, `Everyone in ${scope.label} now uses the default.`);
                    }}
                    className="rounded-full border border-ink/15 px-3 py-1.5 text-xs font-semibold text-ink/70 hover:bg-ink/5 disabled:opacity-50"
                  >
                    Apply default to everyone
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => { opener.current = e.currentTarget; setMsg(null); setDialog(scope.id); }}
                  className="rounded-full border border-pine/30 px-3 py-1.5 text-xs font-semibold text-pine-deep hover:bg-pine/5"
                >
                  Customize members
                </button>
              </div>
            </div>
          </section>
        );
      })}

      {openScope && (
        <MembersDialog
          scope={openScope}
          options={data.options}
          busy={busy}
          msg={msg}
          save={save}
          onClose={closeDialog}
        />
      )}
    </div>
  );
}

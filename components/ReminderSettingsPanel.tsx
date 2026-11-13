"use client";

import { useEffect, useState } from "react";

// Reminder settings for anyone who can assign tasks: one section per team
// they're on (their group's leads, NMT leaders, an intern kind's supervisors,
// VPs/President). Each section only affects tasks that team assigns. Renders
// nothing for anyone else. Every change saves straight away; teammates share
// the same settings, so they see each other's changes.

type BeforeKey = "1d" | "6h" | "3h" | "1h";
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
type Data = {
  options: { before: { key: BeforeKey; label: string }[]; overdue: { key: OverdueKey; label: string }[] };
  standard: Prefs;
  scopes: Scope[];
};

const when = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

function PrefsEditor({
  prefs, options, disabled, onChange, idPrefix,
}: {
  prefs: Prefs; options: Data["options"]; disabled: boolean; onChange: (p: Prefs) => void; idPrefix: string;
}) {
  const toggle = (k: BeforeKey) => {
    const on = prefs.before.includes(k);
    onChange({ ...prefs, before: on ? prefs.before.filter((x) => x !== k) : [...prefs.before, k] });
  };
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Reminders before the due time">
        <span className="mr-0.5 text-xs text-ink/70">Before due:</span>
        {options.before.map((o) => {
          const on = prefs.before.includes(o.key);
          return (
            <button
              key={o.key}
              type="button"
              aria-pressed={on}
              disabled={disabled}
              onClick={() => toggle(o.key)}
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
                on ? "border-pine bg-pine text-paper" : "border-ink/15 bg-paper text-ink/65 hover:border-pine/40"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <label className="flex items-center gap-1.5 text-xs text-ink/70" htmlFor={`${idPrefix}-overdue`}>
        When overdue:
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

export default function ReminderSettingsPanel() {
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // what's saving right now
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [filter, setFilter] = useState<Record<string, string>>({}); // per section

  const load = () =>
    fetch("/api/lms/reminders/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setData(d))
      .catch(() => {});

  useEffect(() => { void load(); }, []);

  async function save(key: string, body: object, done: string) {
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
  }

  if (!data || data.scopes.length === 0) return null;

  return (
    <div className="mx-auto mt-6 max-w-xl rounded-3xl border border-pine/15 bg-pine/[0.03] p-8">
      <h2 className="font-display text-lg font-semibold text-pine-deep">Reminder emails</h2>
      <p className="mt-1 text-sm text-ink/75">
        Automatic reminders for tasks that aren&apos;t done yet. These settings only apply to tasks you and your
        co-leads (or fellow NMT leaders, supervisors, VPs) assign; tasks from anyone else follow their own settings.
        Nothing is sent more than a day before a task is due, and each email lists everything that&apos;s due soon or
        overdue, so tasks due at different times share emails.
      </p>
      {msg && (
        <p role="status" className={`mt-3 text-xs ${msg.error ? "text-red-700" : "text-pine-deep"}`}>{msg.text}</p>
      )}

      {data.scopes.map((scope) => {
        const customCount = scope.members.filter((m) => m.custom).length;
        const q = (filter[scope.id] ?? "").trim().toLowerCase();
        const rows = scope.members.filter((m) => !q || m.name.toLowerCase().includes(q) || m.email.includes(q));
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
              <div className="mt-3 flex flex-wrap gap-2">
                {customCount > 0 && (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => {
                      if (!confirm(`Put the ${customCount} member${customCount === 1 ? "" : "s"} with their own setting back on the ${scope.label} default?`)) return;
                      void save(`${scope.id}:reset`, { scope: scope.id, resetMembers: true }, `Everyone in ${scope.label} now uses the default.`);
                    }}
                    className="rounded-full border border-pine/30 px-3 py-1.5 text-xs font-semibold text-pine-deep hover:bg-pine/5 disabled:opacity-50"
                  >
                    Apply default to everyone ({customCount} custom)
                  </button>
                )}
                {scope.default.custom && (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void save(`${scope.id}:default`, { scope: scope.id, prefs: null }, `${scope.label} default reset to the standard reminders.`)}
                    className="rounded-full border border-ink/15 px-3 py-1.5 text-xs font-semibold text-ink/70 hover:bg-ink/5 disabled:opacity-50"
                  >
                    Reset default to standard
                  </button>
                )}
              </div>
            </div>

            {scope.members.length > 8 && (
              <input
                value={filter[scope.id] ?? ""}
                onChange={(e) => setFilter({ ...filter, [scope.id]: e.target.value })}
                placeholder="Find a member…"
                aria-label="Find a member"
                className="mt-3 w-full rounded-lg border border-pine/20 bg-paper px-3 py-2 text-sm outline-none focus:border-pine"
              />
            )}

            <ul className="mt-3 space-y-2">
              {rows.map((m) => (
                <li key={m.email} className="rounded-xl border border-ink/10 bg-paper/70 p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
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
                  </div>
                  <PrefsEditor
                    idPrefix={`${scope.id}-${m.email}`}
                    prefs={m.prefs}
                    options={data.options}
                    disabled={busy !== null}
                    onChange={(p) => void save(`${scope.id}:${m.email}`, { scope: scope.id, email: m.email, prefs: p }, `Saved for ${m.name}.`)}
                  />
                  {m.custom && m.updatedAt && (
                    <p className="mt-1.5 text-[11px] text-ink/60">Changed by {m.updatedBy} on {when(m.updatedAt)}</p>
                  )}
                </li>
              ))}
              {rows.length === 0 && <li className="text-xs text-ink/60">No members match.</li>}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

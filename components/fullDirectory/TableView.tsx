"use client";

import { useState, type KeyboardEvent } from "react";
import type { ColKey, SortKey } from "@/components/fullDirectory/filters";
import type { Row, Section } from "@/components/fullDirectory/results";
import { groupsOf, isCurrent, roleOf, shortYear, yearSpan } from "@/components/fullDirectory/model";
import { ChevronIcon, GroupChip, Highlight, Initials, SortIcon, YearStrip } from "@/components/fullDirectory/ui";

const TYPE_DOT = { exec: "bg-marigold", lead: "bg-pine", other: "bg-sage", member: "bg-ink/20" } as const;

// Fixed column widths (px); Position takes whatever is left, so the default
// columns fit a laptop screen without sideways scrolling.
const HEADERS: Record<ColKey, { label: string; sort?: SortKey; width: number | null }> = {
  years: { label: "Years", sort: "years", width: 172 },
  group: { label: "Project group", sort: "group", width: 186 },
  position: { label: "Position", sort: "position", width: null },
  grad: { label: "Class of", sort: "grad", width: 92 },
  major: { label: "Major", sort: "major", width: 170 },
  trip: { label: "India trip", width: 108 },
  hindi: { label: "Hindi", width: 108 },
  contact: { label: "Contact", width: 226 },
};
const NAME_WIDTH = 232;
const FLEX_MIN = 230;

/** Berkeley address first (it's the one people actually use for club mail). */
const emailsInOrder = (emails: string[]) =>
  [...emails].sort((a, b) => Number(/@berkeley\.edu$/i.test(b)) - Number(/@berkeley\.edu$/i.test(a)));

export default function TableView({ sections, cols, sort, dir, onSort, onOpen, tokens, allYears, grouped }: {
  sections: Section[]; cols: ColKey[]; sort: SortKey; dir: "asc" | "desc";
  onSort: (k: SortKey) => void; onOpen: (slug: string) => void;
  tokens: string[]; allYears: string[]; grouped: boolean;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const firstKey = sections[0]?.rows[0] ? `${sections[0].key}|${sections[0].rows[0].person.slug}` : null;
  const toggle = (k: string) => setCollapsed((c) => { const n = new Set(c); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  // Arrow keys move between rows; Enter/Space opens. One row is in the Tab order.
  const onKeyDown = (e: KeyboardEvent<HTMLTableSectionElement>) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>("[data-row]");
    if (!row) return;
    const all = Array.from(e.currentTarget.closest("table")!.querySelectorAll<HTMLElement>("[data-row]"));
    const i = all.indexOf(row);
    let next: HTMLElement | undefined;
    if (e.key === "ArrowDown") next = all[i + 1];
    else if (e.key === "ArrowUp") next = all[i - 1];
    else if (e.key === "Home") next = all[0];
    else if (e.key === "End") next = all[all.length - 1];
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(row.dataset.slug!); return; }
    if (next) { e.preventDefault(); next.focus(); setFocusKey(next.dataset.row!); }
  };

  const colCount = cols.length + 1;
  const minWidth = NAME_WIDTH + cols.reduce((n, c) => n + (HEADERS[c].width ?? FLEX_MIN), 0) + (cols.includes("position") ? 0 : FLEX_MIN);
  return (
    <div className="max-h-[calc(100dvh-8rem)] overflow-auto rounded-2xl border border-pine/12" role="region" aria-label="Full directory table" tabIndex={-1}>
      <table className="w-full table-fixed border-separate border-spacing-0 text-left text-sm" style={{ minWidth }}>
        <colgroup>
          <col style={{ width: NAME_WIDTH }} />
          {cols.map((c) => <col key={c} style={HEADERS[c].width ? { width: HEADERS[c].width! } : undefined} />)}
        </colgroup>
        <thead>
          <tr className="text-xs text-ink/70">
            {(["name", ...cols] as const).map((c) => {
              const h = c === "name" ? { label: "Name", sort: "name" as SortKey } : HEADERS[c];
              const active = h.sort !== undefined && sort === h.sort;
              return (
                <th
                  key={c}
                  scope="col"
                  aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : undefined}
                  className="sticky top-0 z-10 whitespace-nowrap border-b border-pine/12 bg-paper px-4 py-3 font-semibold uppercase tracking-wide first:pl-5"
                >
                  {h.sort ? (
                    <button type="button" onClick={() => onSort(h.sort!)} className="group inline-flex items-center gap-1 uppercase tracking-wide hover:text-pine-deep">
                      {h.label}
                      <SortIcon dir={dir} active={active} />
                    </button>
                  ) : h.label}
                </th>
              );
            })}
          </tr>
        </thead>
        {sections.map((s) => {
          const closed = collapsed.has(s.key);
          return (
            <tbody key={s.key} onKeyDown={onKeyDown}>
              {grouped && (
                <tr>
                  <th colSpan={colCount} scope="colgroup" className="border-b border-pine/12 bg-pine/[0.045] px-5 py-2.5 text-left">
                    <button type="button" onClick={() => toggle(s.key)} aria-expanded={!closed} className="inline-flex items-center gap-2 text-pine-deep">
                      <ChevronIcon className={`h-4 w-4 transition-transform ${closed ? "-rotate-90" : ""}`} />
                      <span className="font-display text-base font-semibold">{s.title}</span>
                      <span className="text-xs font-medium text-ink/55">{s.rows.length} {s.rows.length === 1 ? "person" : "people"}</span>
                    </button>
                  </th>
                </tr>
              )}
              {!closed && s.rows.map((r) => {
                const key = `${s.key}|${r.person.slug}`;
                return (
                  <PersonRow
                    key={key}
                    rowKey={key}
                    row={r}
                    cols={cols}
                    tokens={tokens}
                    allYears={allYears}
                    tabbable={(focusKey ?? firstKey) === key}
                    onOpen={() => { setFocusKey(key); onOpen(r.person.slug); }}
                  />
                );
              })}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}

function PersonRow({ row, rowKey, cols, tokens, allYears, tabbable, onOpen }: {
  row: Row; rowKey: string; cols: ColKey[]; tokens: string[]; allYears: string[]; tabbable: boolean; onOpen: () => void;
}) {
  const p = row.person;
  const role = roleOf(row.best && tokens.length ? [row.best] : row.context);
  const groups = groupsOf(row.context);
  const td = "border-b border-pine/8 px-4 py-3 align-middle";
  return (
    <tr
      data-row={rowKey}
      data-slug={p.slug}
      tabIndex={tabbable ? 0 : -1}
      onClick={onOpen}
      className="cursor-pointer transition-colors hover:bg-pine/[0.035] focus-visible:bg-marigold-soft/25 focus-visible:outline-none"
    >
      <td className={`${td} pl-5`}>
        <div className="flex items-center gap-3">
          <Initials name={p.name} slug={p.slug} size={34} />
          <div className="min-w-0">
            <div className="truncate font-semibold text-ink" title={p.name}><Highlight text={p.name} tokens={tokens} /></div>
          </div>
        </div>
      </td>
      {cols.map((c) => {
        switch (c) {
          case "years":
            return (
              <td key={c} className={td}>
                <YearStrip allYears={allYears} years={p.years} focus={row.context.map((m) => m.year)} />
                <div className="mt-1 whitespace-nowrap text-xs text-ink/60">
                  {yearSpan(p)}
                  {isCurrent(p)
                    ? <span className="font-semibold text-marigold-ink"> · Current</span>
                    : p.years.length > 1 ? ` · ${p.years.length} yrs` : ""}
                </div>
              </td>
            );
          case "group":
            return (
              <td key={c} className={td}>
                <div className="flex flex-wrap gap-1">
                  {groups.slice(0, 2).map((g) => <GroupChip key={g} group={g} tokens={tokens} small />)}
                  {groups.length > 2 && <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[11px] font-medium text-ink/65" title={groups.slice(2).join(", ")}>+{groups.length - 2}</span>}
                  {!groups.length && <span className="text-ink/40">{row.context.some((m) => m.notYetPlaced) ? "Not yet placed" : "—"}</span>}
                </div>
              </td>
            );
          case "position":
            return (
              <td key={c} className={td}>
                <div className="flex items-start gap-2">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TYPE_DOT[role.type]}`} aria-hidden />
                  <span className="min-w-0">
                    <span className="text-ink/85"><Highlight text={role.label} tokens={tokens} /></span>
                    {role.year && p.years.length > 1 && role.type !== "member" && <span className="ml-1.5 whitespace-nowrap text-xs text-ink/50">{shortYear(role.year)}</span>}
                  </span>
                </div>
              </td>
            );
          case "grad":
            return (
              <td key={c} className={`${td} tabular-nums text-ink/75`}>
                {p.gradYear ? (p.gradYearInferred ? <span title="Estimated from class standing">≈ {p.gradYear}</span> : p.gradYear) : <span className="text-ink/35">—</span>}
              </td>
            );
          case "major":
            return <td key={c} className={`${td} text-ink/75`}>{p.major ? <Highlight text={p.major} tokens={tokens} /> : <span className="text-ink/35">—</span>}</td>;
          case "trip":
            return <td key={c} className={`${td} text-ink/75`}>{p.indiaTrips.length ? p.indiaTrips.map((t) => t.replace("India Trip ", "")).join(", ") : <span className="text-ink/35">—</span>}</td>;
          case "hindi":
            return <td key={c} className={`${td} text-ink/75`}>{p.hindi ?? <span className="text-ink/35">—</span>}</td>;
          case "contact": {
            const emails = emailsInOrder(p.emails);
            const phone = p.phones?.[0]; // only ever present for exec / webmaster
            return (
              <td key={c} className={`${td} max-w-[220px]`}>
                {emails[0] ? (
                  <span className="flex min-w-0 items-center gap-1.5">
                    <a href={`mailto:${emails[0]}`} onClick={(e) => e.stopPropagation()} className="min-w-0 truncate text-pine hover:underline" title={emails[0]}>
                      <Highlight text={emails[0]} tokens={tokens} />
                    </a>
                    {emails.length > 1 && <span className="shrink-0 rounded-full bg-ink/[0.06] px-1.5 text-[11px] text-ink/60" title={emails.slice(1).join(", ")}>+{emails.length - 1}</span>}
                  </span>
                ) : !phone && <span className="text-ink/35">—</span>}
                {phone && (
                  <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} onClick={(e) => e.stopPropagation()} className="mt-0.5 block truncate text-xs tabular-nums text-ink/60 hover:underline">
                    <Highlight text={phone} tokens={tokens} />
                  </a>
                )}
              </td>
            );
          }
        }
      })}
    </tr>
  );
}

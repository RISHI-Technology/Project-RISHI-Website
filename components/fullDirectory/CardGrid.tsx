"use client";

import { useState } from "react";
import type { Section } from "@/components/fullDirectory/results";
import { groupsOf, isCurrent, roleOf, shortYear, yearSpan } from "@/components/fullDirectory/model";
import { ChevronIcon, GlobeIcon, GroupChip, Highlight, Initials, YearStrip } from "@/components/fullDirectory/ui";

const TYPE_DOT = { exec: "bg-marigold", lead: "bg-pine", other: "bg-sage", member: "bg-ink/20" } as const;

export default function CardGrid({ sections, onOpen, tokens, allYears, grouped }: {
  sections: Section[]; onOpen: (slug: string) => void; tokens: string[]; allYears: string[]; grouped: boolean;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (k: string) => setCollapsed((c) => { const n = new Set(c); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  return (
    <div className="space-y-8">
      {sections.map((s) => {
        const closed = collapsed.has(s.key);
        return (
          <div key={s.key}>
            {grouped && (
              <h3 className="mb-3">
                <button type="button" onClick={() => toggle(s.key)} aria-expanded={!closed} className="inline-flex items-center gap-2 text-pine-deep">
                  <ChevronIcon className={`h-4 w-4 transition-transform ${closed ? "-rotate-90" : ""}`} />
                  <span className="font-display text-xl font-semibold">{s.title}</span>
                  <span className="text-sm font-medium text-ink/55">{s.rows.length}</span>
                </button>
              </h3>
            )}
            {!closed && (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {s.rows.map((r) => {
                  const p = r.person;
                  const role = roleOf(r.best && tokens.length ? [r.best] : r.context);
                  const groups = groupsOf(r.context);
                  return (
                    <li key={`${s.key}|${p.slug}`}>
                      <button
                        type="button"
                        onClick={() => onOpen(p.slug)}
                        className="flex h-full w-full flex-col rounded-3xl border border-pine/12 bg-paper/70 p-5 text-left transition-[border-color,box-shadow] hover:border-pine/40 hover:shadow-[0_14px_36px_-18px_rgb(20_54_40/0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine"
                      >
                        <span className="flex items-start gap-3">
                          <Initials name={p.name} slug={p.slug} size={44} />
                          <span className="min-w-0 flex-1">
                            <span className="block font-display text-lg font-semibold leading-tight text-ink">
                              <Highlight text={p.name} tokens={tokens} />
                            </span>
                            <span className="mt-0.5 flex items-center gap-2 text-xs text-ink/60">
                              {yearSpan(p)}
                              {isCurrent(p) && <span className="rounded-full bg-marigold-soft/60 px-2 py-0.5 text-[11px] font-semibold text-marigold-ink">Current</span>}
                            </span>
                          </span>
                        </span>
                        <span className="mt-4 block"><YearStrip allYears={allYears} years={p.years} focus={r.context.map((m) => m.year)} /></span>
                        <span className="mt-3 flex items-start gap-2 text-sm text-ink/85">
                          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TYPE_DOT[role.type]}`} aria-hidden />
                          <span className="min-w-0">
                            <Highlight text={role.label} tokens={tokens} />
                            {role.year && role.type !== "member" && p.years.length > 1 && <span className="ml-1.5 text-xs text-ink/50">{shortYear(role.year)}</span>}
                          </span>
                        </span>
                        {groups.length > 0 && (
                          <span className="mt-3 flex flex-wrap gap-1">
                            {groups.slice(0, 3).map((g) => <GroupChip key={g} group={g} tokens={tokens} small />)}
                            {groups.length > 3 && <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[11px] text-ink/60">+{groups.length - 3}</span>}
                          </span>
                        )}
                        {(p.gradYear || p.indiaTrips.length > 0) && (
                          <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 text-xs text-ink/60">
                            {p.gradYear && <span>Class of {p.gradYearInferred ? "≈ " : ""}{p.gradYear}</span>}
                            {p.indiaTrips.length > 0 && (
                              <span className="inline-flex items-center gap-1 text-marigold-ink">
                                <GlobeIcon className="h-3.5 w-3.5" />
                                {p.indiaTrips.map((t) => t.replace("India Trip ", "")).join(", ")} trip
                              </span>
                            )}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

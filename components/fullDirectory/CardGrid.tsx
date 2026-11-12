"use client";

import { useState } from "react";
import type { Section } from "@/components/fullDirectory/results";
import { currentRoleOf, groupsOf, isCurrent, otherRoles, roleOf, shortYear, yearSpan } from "@/components/fullDirectory/model";
import { ArrowRightIcon, BriefcaseIcon, ChevronIcon, GlobeIcon, GroupChip, Highlight, Initials, MoreRoles, SubjectChips, YearStrip } from "@/components/fullDirectory/ui";

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
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {s.rows.map((r) => {
                  const p = r.person;
                  const role = roleOf(r.best && tokens.length ? [r.best] : r.context);
                  const groups = groupsOf(r.context);
                  return (
                    <li key={`${s.key}|${p.slug}`} className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onOpen(p.slug)}
                        className="group relative flex h-full w-full flex-col rounded-3xl border border-pine/12 bg-paper/70 p-5 text-left transition-[border-color,box-shadow,transform,background-color] duration-200 hover:-translate-y-0.5 hover:border-pine/55 hover:bg-paper hover:shadow-[0_18px_40px_-16px_rgb(20_54_40/0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                      >
                        {/* Fades in on hover: a quiet "opens a profile" cue. */}
                        <span aria-hidden className="absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-full bg-pine/[0.08] text-pine opacity-0 transition duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                          <ArrowRightIcon className="h-3.5 w-3.5" />
                        </span>
                        <span className="flex items-start gap-3 pr-6">
                          <Initials name={p.name} slug={p.slug} size={44} />
                          <span className="min-w-0 flex-1">
                            <span className="block font-display text-lg font-semibold leading-tight text-ink transition-colors group-hover:text-pine">
                              <Highlight text={p.name} tokens={tokens} />
                            </span>
                            <span className="mt-0.5 flex items-center gap-2 text-xs text-ink/60">
                              {yearSpan(p)}
                              {isCurrent(p) && <span className="rounded-full bg-marigold-soft/60 px-2 py-0.5 text-[11px] font-semibold text-marigold-ink">Current</span>}
                            </span>
                          </span>
                        </span>
                        {currentRoleOf(p) && (
                          <span className="mt-3 flex items-start gap-1.5 text-xs text-ink/65" title={currentRoleOf(p)!}>
                            <BriefcaseIcon className="mt-px h-3.5 w-3.5 shrink-0 text-ink/40" />
                            <span className="line-clamp-2 min-w-0"><Highlight text={currentRoleOf(p)!} tokens={tokens} /></span>
                          </span>
                        )}
                        <span className="mt-4 block"><YearStrip allYears={allYears} years={p.years} focus={r.context.map((m) => m.year)} /></span>
                        <span className="mt-3 flex items-start gap-2 text-sm text-ink/85">
                          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TYPE_DOT[role.type]}`} aria-hidden />
                          <span className="line-clamp-2 min-w-0" title={role.label}>
                            <Highlight text={role.label} tokens={tokens} />
                            {role.year && role.type !== "member" && p.years.length > 1 && <span className="ml-1.5 text-xs text-ink/50">{shortYear(role.year)}</span>}
                          </span>
                          <MoreRoles roles={otherRoles(p.memberships, role.label)} />
                        </span>
                        {groups.length > 0 && (
                          <span className="mt-3 flex flex-wrap gap-1">
                            {groups.slice(0, 3).map((g) => <GroupChip key={g} group={g} tokens={tokens} small />)}
                            {groups.length > 3 && <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[11px] text-ink/60" title={`Also: ${groups.slice(3).join(", ")}`}>+{groups.length - 3}</span>}
                          </span>
                        )}
                        {(p.majors.length > 0 || p.minors.length > 0) && (
                          <span className="mt-3 block" aria-label="Majors and minors">
                            <SubjectChips majors={p.majors} minors={p.minors} tokens={tokens} small max={4} />
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

"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import type { PositionType } from "@/lib/fullDirectory/types";
import type { DirState, facetOptions } from "@/components/fullDirectory/filters";
import { shortYear } from "@/components/fullDirectory/model";
import { CloseIcon, FilterIcon, OptionList, Popover, Segmented } from "@/components/fullDirectory/ui";

type Options = ReturnType<typeof facetOptions>;
type Set_ = (patch: Partial<DirState>) => void;

const toggleIn = <T extends string>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/** Every filter, described once and rendered as popovers (desktop) or a sheet (mobile). */
function useSections(s: DirState, set: Set_, o: Options, canSeePrivate: boolean) {
  const sections: { key: string; label: string; badge: number; width?: string; body: ReactNode }[] = [
    {
      key: "years", label: "Years", width: "w-[22rem]",
      badge: s.yearMode === "range" ? (s.from !== null || s.to !== null ? 1 : 0) : s.years.length,
      body: (
        <div className="space-y-3">
          <Segmented<DirState["yearMode"]>
            size="sm" label="How to match years" value={s.yearMode}
            onChange={(v) => set({ yearMode: v })}
            options={[
              { value: "any", label: "Active in any", title: "Active in at least one of the chosen years" },
              { value: "all", label: "Active in all", title: "Active in every one of the chosen years" },
              { value: "range", label: "Ever in range", title: "Active at any point between two years" },
            ]}
          />
          {s.yearMode === "range" ? (
            <div className="flex items-center gap-2 text-sm">
              <RangeSelect label="From" value={s.from} years={o.yearStarts} onChange={(v) => set({ from: v })} />
              <span className="text-ink/50">to</span>
              <RangeSelect label="To" value={s.to} years={o.yearStarts} onChange={(v) => set({ to: v })} />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {o.years.map((y) => {
                const on = s.years.includes(y.value);
                return (
                  <button
                    key={y.value}
                    type="button"
                    aria-pressed={on}
                    title={y.hint}
                    onClick={() => set({ years: toggleIn(s.years, y.value) })}
                    className={`flex flex-col items-center rounded-xl border px-2 py-1.5 text-sm font-semibold transition-colors ${
                      y.value === "alumni" ? "col-span-3" : ""
                    } ${on ? "border-pine bg-pine text-paper" : `border-pine/15 text-ink/80 hover:border-pine/45 ${y.count === 0 ? "opacity-45" : ""}`}`}
                  >
                    {y.label}
                    <span className={`text-[11px] font-medium tabular-nums ${on ? "text-paper/75" : "text-ink/50"}`}>{y.count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "groups", label: "Project group", badge: s.groups.length,
      body: <OptionList label="project groups" options={o.groups} selected={s.groups} onToggle={(v) => set({ groups: toggleIn(s.groups, v) })} />,
    },
    {
      key: "position", label: "Position", width: "w-80", badge: s.ptypes.length + s.positions.length,
      body: (
        <div>
          <OptionList label="position types" options={o.ptypes} selected={s.ptypes}
            onToggle={(v) => set({ ptypes: toggleIn(s.ptypes, v as PositionType) })} />
          <div className="my-2 border-t border-pine/10" />
          <p className="mb-1.5 px-2 text-xs font-semibold text-ink/55">Specific title</p>
          <OptionList label="titles" searchable placeholder="Search titles…" max="max-h-52" options={o.positions}
            selected={s.positions} onToggle={(v) => set({ positions: toggleIn(s.positions, v) })} />
        </div>
      ),
    },
    {
      key: "trip", label: "India trip", badge: s.trips.length,
      body: <OptionList label="India trips" options={o.trips} selected={s.trips} onToggle={(v) => set({ trips: toggleIn(s.trips, v) })} />,
    },
    {
      key: "grad", label: "Graduation year", badge: s.grads.length,
      body: (
        <div>
          <OptionList label="graduation years" options={o.grads} selected={s.grads} onToggle={(v) => set({ grads: toggleIn(s.grads, v) })} />
          <p className="mt-2 px-2 text-[11px] leading-snug text-ink/50">“Estimated” years come from a member’s class standing, not a stated graduation year.</p>
        </div>
      ),
    },
    {
      key: "major", label: "Major", width: "w-80", badge: s.majors.length,
      body: (
        <div>
          <OptionList label="majors and minors" searchable placeholder="Search majors & minors…" options={o.majors} selected={s.majors}
            onToggle={(v) => set({ majors: toggleIn(s.majors, v) })} />
          <div className="mt-2 flex items-center justify-between gap-3 border-t border-pine/10 px-2 pt-2.5">
            <p className="text-[11px] leading-snug text-ink/50">
              {s.majorMode === "all" ? "Has every checked subject" : "Has any checked subject"} — as a major or a minor.
            </p>
            <MatchAllToggle on={s.majorMode === "all"} onChange={(on) => set({ majorMode: on ? "all" : "any" })} />
          </div>
        </div>
      ),
    },
    {
      key: "company", label: "Company", badge: s.companies.length,
      body: (
        <div>
          <OptionList label="companies" searchable placeholder="Search companies…" options={o.companies} selected={s.companies}
            onToggle={(v) => set({ companies: toggleIn(s.companies, v) })} />
          <p className="mt-2 px-2 text-[11px] leading-snug text-ink/50">Anyone who has worked there, now or in the past.</p>
        </div>
      ),
    },
    {
      key: "hindi", label: "Hindi", badge: s.hindi.length,
      body: <OptionList label="Hindi levels" options={o.hindi} selected={s.hindi} onToggle={(v) => set({ hindi: toggleIn(s.hindi, v) })} />,
    },
    {
      key: "status", label: "Current / alumni", badge: s.status ? 1 : 0,
      body: (
        <OptionList label="status" options={o.status} selected={s.status ? [s.status] : []}
          onToggle={(v) => set({ status: s.status === v ? "" : (v as DirState["status"]) })} />
      ),
    },
  ];
  if (canSeePrivate && o.contact.length)
    sections.push({
      key: "contact", label: "Contact info", badge: s.contact.length,
      body: (
        <div>
          <OptionList label="contact info" options={o.contact} selected={s.contact}
            onToggle={(v) => set({ contact: toggleIn(s.contact, v as "email" | "phone") })} />
          <p className="mt-2 px-2 text-[11px] text-ink/50">Exec only — members don’t see phone numbers.</p>
        </div>
      ),
    });
  if (o.hasHiatus)
    sections.push({
      key: "hiatus", label: "Hiatus", badge: s.hiatus ? 1 : 0,
      body: <OptionList label="hiatus" options={[{ value: "1", label: "On hiatus that year", count: 0 }]} selected={s.hiatus ? ["1"] : []} onToggle={() => set({ hiatus: !s.hiatus })} />,
    });
  return sections;
}

/** Switches the Major filter between "any checked subject" and "all of them". */
function MatchAllToggle({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="inline-flex shrink-0 items-center gap-2 rounded-full py-1 text-xs font-semibold text-ink/75 outline-none hover:text-pine-deep focus-visible:ring-2 focus-visible:ring-pine/40"
    >
      <span aria-hidden className={`relative h-4 w-7 rounded-full transition-colors motion-reduce:transition-none ${on ? "bg-pine" : "bg-ink/20"}`}>
        <span className={`absolute left-0 top-0.5 h-3 w-3 rounded-full bg-paper shadow-sm transition-transform motion-reduce:transition-none ${on ? "translate-x-3.5" : "translate-x-0.5"}`} />
      </span>
      Match all
    </button>
  );
}

function RangeSelect({ label, value, years, onChange }: { label: string; value: number | null; years: number[]; onChange: (v: number | null) => void }) {
  return (
    <label className="flex flex-1 flex-col gap-1">
      <span className="text-[11px] font-semibold text-ink/55">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className="rounded-full border border-pine/20 bg-paper px-3 py-1.5 text-sm text-ink outline-none focus:border-pine"
      >
        <option value="">Any</option>
        {years.map((y) => <option key={y} value={y}>{shortYear(`${y}-${y + 1}`)}</option>)}
      </select>
    </label>
  );
}

export function FilterPopovers({ state, set, options, canSeePrivate }: { state: DirState; set: Set_; options: Options; canSeePrivate: boolean }) {
  const sections = useSections(state, set, options, canSeePrivate);
  return (
    <div className="hidden flex-wrap items-center gap-2 md:flex" role="toolbar" aria-label="Filters">
      {sections.map((x, i) => (
        <Popover key={x.key} label={x.label} badge={x.badge} width={x.width} align={i > sections.length - 3 ? "right" : "left"}>
          {x.body}
        </Popover>
      ))}
    </div>
  );
}

/** Phones: one "Filters" button that opens every filter in a scrollable sheet. */
export function FilterSheetButton({ state, set, options, canSeePrivate, activeCount, resultCount, onClearAll, extra }: {
  state: DirState; set: Set_; options: Options; canSeePrivate: boolean; activeCount: number; resultCount: number; onClearAll: () => void;
  /** Shown first in the sheet (sort + group-by on phones). */
  extra?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const sections = useSections(state, set, options, canSeePrivate);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open]);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold md:hidden ${
          activeCount ? "border-pine bg-pine/[0.07] text-pine-deep" : "border-pine/20 bg-paper text-ink/80"
        }`}
      >
        <FilterIcon /> Filters
        {activeCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-pine px-1.5 text-[11px] text-paper">{activeCount}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[1100] flex items-end md:hidden" role="dialog" aria-modal="true" aria-label="Filters">
            <motion.div className="absolute inset-0 bg-ink/45" onClick={() => setOpen(false)}
              initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div
              className="relative flex max-h-[88dvh] w-full flex-col rounded-t-3xl bg-paper shadow-2xl"
              initial={reduce ? false : { y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 42 }}
            >
              <div className="flex items-center justify-between border-b border-pine/10 px-5 py-4">
                <h2 className="font-display text-xl font-semibold text-pine-deep">Filters</h2>
                <div className="flex items-center gap-2">
                  {activeCount > 0 && <button type="button" onClick={onClearAll} className="text-sm font-semibold text-pine hover:underline">Clear all</button>}
                  <button type="button" onClick={() => setOpen(false)} aria-label="Close filters" className="grid h-9 w-9 place-items-center rounded-full text-ink/70 hover:bg-ink/5">
                    <CloseIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 py-5">
                {extra && (
                  <section aria-label="Sort and group">
                    <h3 className="mb-2 text-sm font-semibold text-ink">Sort &amp; group</h3>
                    <div className="flex flex-col items-start gap-2">{extra}</div>
                  </section>
                )}
                {sections.map((x) => (
                  <section key={x.key} aria-label={x.label}>
                    <h3 className="mb-2 text-sm font-semibold text-ink">{x.label}</h3>
                    {x.body}
                  </section>
                ))}
              </div>
              <div className="border-t border-pine/10 px-5 py-3 pb-[calc(0.75rem+var(--safe-bottom,0px))]">
                <button type="button" onClick={() => setOpen(false)} className="w-full rounded-full bg-pine py-3 text-sm font-semibold text-paper hover:bg-pine-deep">
                  Show {resultCount} {resultCount === 1 ? "person" : "people"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

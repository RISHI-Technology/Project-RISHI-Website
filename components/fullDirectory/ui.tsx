"use client";

// Full Directory — small UI pieces in the dashboard's own visual language
// (paper / pine / marigold, pill controls, Fraunces + Inter). Colours are the
// palette's Tailwind classes, so app/dark-theme.css covers dark mode.

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { highlightRuns } from "@/components/fullDirectory/search";
import { initialsOf, laneFor, shortYear, tintFor, type PastRole } from "@/components/fullDirectory/model";
import type { Option } from "@/components/fullDirectory/filters";

// ---------------------------------------------------------------- initials
const TINTS = [
  "bg-pine/10 text-pine-deep",
  "bg-marigold-soft/50 text-marigold-ink",
  "bg-sage/15 text-sage-deep",
  "bg-pine-soft/15 text-pine",
];
export function Initials({ name, slug, size = 36 }: { name: string; slug: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      className={`grid shrink-0 place-items-center rounded-full font-semibold tracking-wide ${TINTS[tintFor(slug)]}`}
    >
      {initialsOf(name)}
    </span>
  );
}

// ---------------------------------------------------------------- highlight
export function Highlight({ text, tokens }: { text: string; tokens: string[] }) {
  if (!tokens.length) return <>{text}</>;
  return (
    <>
      {highlightRuns(text, tokens).map((r, i) =>
        r.hit ? <mark key={i} className="rounded-sm bg-marigold/30 px-px text-inherit">{r.text}</mark> : <span key={i}>{r.text}</span>,
      )}
    </>
  );
}

// ---------------------------------------------------------------- group chip
/** Majors as solid chips, then minors as outlined chips marked "(minor)", so a
 *  major match and a minor match read differently. `max` folds the rest into "+n". */
export function SubjectChips({ majors, minors, tokens = [], small = false, max }: {
  majors: string[]; minors: string[]; tokens?: string[]; small?: boolean; max?: number;
}) {
  const items = [...majors.map((s) => ({ s, minor: false })), ...minors.map((s) => ({ s, minor: true }))];
  if (!items.length) return null;
  const shown = max ? items.slice(0, max) : items;
  const rest = items.slice(shown.length);
  const name = (x: { s: string; minor: boolean }) => (x.minor ? `${x.s} (minor)` : x.s);
  return (
    <span className="flex flex-wrap gap-1">
      {shown.map((x) => (
        <span
          key={`${x.minor ? "minor" : "major"}:${x.s}`}
          title={name(x)}
          className={`inline-flex max-w-full items-center gap-1 rounded-full border font-medium ${small ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-0.5 text-xs"} ${
            x.minor ? "border-dashed border-pine/35 text-ink/75" : "border-transparent bg-pine/[0.09] text-pine-deep"
          }`}
        >
          <span className="truncate"><Highlight text={x.s} tokens={tokens} /></span>
          {x.minor && <span className="shrink-0 text-ink/55">(minor)</span>}
        </span>
      ))}
      {rest.length > 0 && (
        <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[11px] text-ink/60" title={`Also: ${rest.map(name).join(", ")}`}>+{rest.length}</span>
      )}
    </span>
  );
}

export function GroupChip({ group, tokens = [], small = false }: { group: string; tokens?: string[]; small?: boolean }) {
  return (
    <span
      style={laneFor(group)}
      className={`inline-flex max-w-full items-center truncate rounded-full font-medium ${small ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-0.5 text-xs"}`}
      title={group}
    >
      <span className="truncate"><Highlight text={group.replace(/\s*\(.*\)$/, "")} tokens={tokens} /></span>
    </span>
  );
}

// ---------------------------------------------------------------- other roles
/** "+n" beside a role: other non-member roles this person held. Hover lists them. */
export function MoreRoles({ roles }: { roles: PastRole[] }) {
  if (!roles.length) return null;
  const list = roles.map((r) => `${r.title} (${r.years.map(shortYear).join(", ")})`);
  return (
    <span
      title={`Also held: ${list.join("; ")}`}
      aria-label={`Also held ${roles.length} other ${roles.length === 1 ? "role" : "roles"}: ${list.join("; ")}`}
      className="ml-1 inline-flex shrink-0 cursor-help items-center rounded-full bg-pine/[0.09] px-1.5 py-px text-[11px] font-semibold tabular-nums text-pine-deep"
    >
      +{roles.length}
    </span>
  );
}

// ---------------------------------------------------------------- year strip
/** One small cell per school year: filled where the person was active. */
export function YearStrip({ allYears, years, focus }: { allYears: string[]; years: string[]; focus?: string[] }) {
  const on = new Set(years);
  const hot = new Set(focus ?? []);
  const label = years.length ? `Active ${years.map(shortYear).join(", ")}` : "No recorded years";
  return (
    <span className="inline-flex items-center gap-[3px]" role="img" aria-label={label} title={label}>
      {allYears.map((y) => (
        <span
          key={y}
          className={`h-2 w-2.5 rounded-[2px] ${on.has(y) ? (hot.size && !hot.has(y) ? "bg-pine/35" : "bg-pine") : "bg-ink/[0.08]"}`}
        />
      ))}
    </span>
  );
}

// ---------------------------------------------------------------- segmented
export function Segmented<T extends string>({ value, onChange, options, label, size = "md" }: {
  value: T; onChange: (v: T) => void; label: string; size?: "sm" | "md";
  options: { value: T; label: ReactNode; title?: string }[];
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-full border border-pine/15 bg-pine/[0.04] p-0.5">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={`inline-flex items-center gap-1.5 rounded-full font-semibold transition-colors ${size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm"} ${
              on ? "bg-pine text-paper shadow-sm" : "text-ink/70 hover:text-pine-deep"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- popover
/** A pill button that opens a panel; closes on outside click or Escape. */
export function Popover({ label, badge = 0, children, align = "left", width = "w-72", icon, hint, title, open: openProp, onOpenChange }: {
  label: string; badge?: number; children: ReactNode; align?: "left" | "right"; width?: string; icon?: ReactNode;
  /** Quiet text after the label (e.g. "+3"). */ hint?: ReactNode; title?: string;
  /** Optional controlled mode, so something else (the table's "+" header) can open it. */
  open?: boolean; onOpenChange?: (open: boolean) => void;
}) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (next: boolean | ((o: boolean) => boolean)) => {
    const v = typeof next === "function" ? next(open) : next;
    if (openProp === undefined) setOpenState(v);
    onOpenChange?.(v);
  };
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); btn.current?.focus(); } };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey, true); };
  }, [open]);
  const active = badge > 0;
  return (
    <div ref={root} className="relative">
      <button
        ref={btn}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        title={title}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
          active ? "border-pine bg-pine/[0.07] text-pine-deep" : "border-pine/20 bg-paper text-ink/80 hover:border-pine/45 hover:text-pine-deep"
        }`}
      >
        {icon}
        {label}
        {hint}
        {active &&<span className="grid h-5 min-w-5 place-items-center rounded-full bg-pine px-1.5 text-[11px] font-semibold text-paper">{badge}</span>}
        <ChevronIcon className={`h-3.5 w-3.5 opacity-60 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          id={id}
          role="dialog"
          aria-label={label}
          className={`absolute top-full z-40 mt-2 ${align === "right" ? "right-0" : "left-0"} ${width} max-w-[calc(100vw-2rem)] rounded-2xl border border-pine/15 bg-paper p-3 shadow-[0_18px_50px_-12px_rgb(20_54_40/0.35)]`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- option list
export function OptionList({ options, selected, onToggle, searchable = false, placeholder = "Search…", label, max = "max-h-64" }: {
  options: Option[]; selected: string[]; onToggle: (v: string) => void;
  searchable?: boolean; placeholder?: string; label: string; max?: string;
}) {
  const [q, setQ] = useState("");
  const shown = q.trim() ? options.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase())) : options;
  return (
    <div>
      {searchable && (
        <div className="relative mb-2">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/45" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={placeholder}
            aria-label={`Search ${label}`}
            className="w-full rounded-full border border-pine/20 bg-paper py-1.5 pl-8 pr-3 text-sm outline-none focus:border-pine"
          />
        </div>
      )}
      <ul className={`${max} space-y-0.5 overflow-y-auto overscroll-contain pr-1`} aria-label={label}>
        {shown.map((o) => {
          const on = selected.includes(o.value);
          return (
            <li key={o.value}>
              <label className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-pine/[0.06] ${o.count === 0 && !on ? "opacity-45" : ""}`}>
                <input type="checkbox" checked={on} onChange={() => onToggle(o.value)} className="h-4 w-4 shrink-0 accent-pine" />
                <span className="min-w-0 flex-1 truncate text-ink" title={o.hint ? `${o.label} (${o.hint})` : o.label}>{o.label}</span>
                {o.hint && <span className="shrink-0 text-[11px] text-ink/50">{o.hint}</span>}
                <span className="shrink-0 text-xs tabular-nums text-ink/50">{o.count}</span>
              </label>
            </li>
          );
        })}
        {shown.length === 0 && <li className="px-2 py-3 text-sm text-ink/55">Nothing matches “{q}”.</li>}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- icons
type IconProps = { className?: string };
const svg = (path: ReactNode, sw = 2) =>
  function Icon({ className = "h-4 w-4" }: IconProps) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {path}
      </svg>
    );
  };
export const SearchIcon = svg(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>);
export const CloseIcon = svg(<path d="M18 6 6 18M6 6l12 12" />);
export const ChevronIcon = svg(<path d="m6 9 6 6 6-6" />);
export const TableIcon = svg(<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M3 15h18M9 10v10" /></>, 1.8);
export const GridIcon = svg(<><rect x="3" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" /></>, 1.8);
export const DownloadIcon = svg(<><path d="M12 3v12M7 10l5 5 5-5" /><path d="M5 21h14" /></>);
export const ColumnsIcon = svg(<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16M15 4v16" /></>, 1.8);
export const PlusIcon = svg(<path d="M12 5v14M5 12h14" />);
export const FilterIcon =svg(<path d="M4 6h16M7 12h10M10 18h4" />);
export const CopyIcon = svg(<><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></>, 1.8);
export const LinkIcon = svg(<><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" /><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" /></>, 1.8);
export const CheckIcon = svg(<path d="m5 12 5 5 9-10" />);
export const ArrowLeftIcon = svg(<path d="M15 18l-6-6 6-6" />);
export const ArrowRightIcon = svg(<path d="M9 18l6-6-6-6" />);
export const SortIcon = ({ dir, active }: { dir: "asc" | "desc"; active: boolean }) => (
  <svg className={`h-3 w-3 shrink-0 ${active ? "opacity-100" : "opacity-0 group-hover:opacity-40"}`} viewBox="0 0 12 12" aria-hidden>
    <path d={dir === "asc" || !active ? "M6 2.5 9.5 7h-7z" : "M6 9.5 2.5 5h7z"} fill="currentColor" />
  </svg>
);
export const BriefcaseIcon = svg(<><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" /></>, 1.7);
export const ExternalIcon = svg(<><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></>, 1.8);
/** LinkedIn's "in" mark, drawn in currentColor (no brand colours). */
export function LinkedInIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4V21H3V9.75Zm6.5 0h3.83v1.54h.06c.53-1 1.84-2.06 3.79-2.06 4.05 0 4.8 2.67 4.8 6.13V21h-4v-4.98c0-1.19-.02-2.72-1.66-2.72-1.66 0-1.92 1.3-1.92 2.63V21h-4V9.75Z" />
    </svg>
  );
}
export const GlobeIcon =svg(<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>, 1.6);

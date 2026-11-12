"use client";

// ============================================================================
//  Full Directory — every RISHI member, 2015–2027.
// ----------------------------------------------------------------------------
//  Data: GET /api/lms/full-directory (already redacted for this viewer).
//  Every filter, the search, sort, layout, grouping, columns and the open
//  profile live in the URL, so any view can be shared or bookmarked.
// ============================================================================

import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import DashboardBanner from "@/components/DashboardBanner";
import { Block, Line, SkeletonRegion, useShowAfter } from "@/components/Skeleton";
import { ALUMNI_YEAR, type FullDirectoryResponse, type FullPerson } from "@/lib/fullDirectory/types";
import {
  ALL_COLS, DEFAULT_COLS, EMPTY_FILTERS, SORT_COL, activeCount, applyFilters, canonicalPersonSlug, chipsFor, facetOptions, parseState, toQuery,
  type ColKey, type DirState, type GroupBy, type Layout, type SortKey,
} from "@/components/fullDirectory/filters";
import { buildIndex, queryTokens, scoreEntry } from "@/components/fullDirectory/search";
import { groupRows, sortRows, type Row } from "@/components/fullDirectory/results";
import { downloadCsv } from "@/components/fullDirectory/exportCsv";
import TableView from "@/components/fullDirectory/TableView";
import CardGrid from "@/components/fullDirectory/CardGrid";
import PersonDrawer from "@/components/fullDirectory/PersonDrawer";
import { FilterPopovers, FilterSheetButton } from "@/components/fullDirectory/FilterBar";
import {
  CloseIcon, ColumnsIcon, DownloadIcon, GridIcon, Popover, SearchIcon, Segmented, TableIcon,
} from "@/components/fullDirectory/ui";

const LAYOUT_KEY = "rishi:fulldir:layout";
const COLS_KEY = "rishi:fulldir:cols";

function useIsSmall() {
  const [small, setSmall] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const on = () => setSmall(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return small;
}

function PillSelect<T extends string>({ label, value, onChange, options }: {
  label: ReactNode; value: T; onChange: (v: T) => void; options: [T, string][];
}) {
  return (
    <label className="inline-flex items-center gap-1.5 rounded-full border border-pine/20 bg-paper py-1 pl-3.5 pr-1 text-sm">
      <span className="text-xs font-semibold text-ink/60">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}
        className="cursor-pointer rounded-full bg-transparent py-1 pr-6 text-sm font-medium text-pine-deep outline-none">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

export default function FullDirectory({ switcher }: { switcher?: ReactNode }) {
  const sp = useSearchParams();
  const state = useMemo(() => parseState(new URLSearchParams(sp.toString())), [sp]);

  // Writes go straight to the address bar (no navigation, no refetch). Next keeps
  // useSearchParams in step with history.replaceState — but ONLY when the state
  // argument isn't its own: passing window.history.state (which carries Next's
  // internal __NA marker) makes Next treat the call as internal and skip the
  // sync, so the UI wouldn't update until a reload. Pass null; Next copies its
  // internal state over by itself.
  const update = useCallback((patch: Partial<DirState>) => {
    const next = { ...parseState(new URLSearchParams(window.location.search)), ...patch };
    window.history.replaceState(null, "", `${window.location.pathname}?${toQuery(next)}`);
  }, []);

  // An old profile link (person renamed since): parseState already opens the right
  // person; also rewrite the address bar to the current link, in place.
  const rawPerson = sp.get("person");
  useEffect(() => {
    if (rawPerson && canonicalPersonSlug(rawPerson) !== rawPerson) update({});
  }, [rawPerson, update]);

  // ---------------------------------------------------------------- data
  const [people, setPeople] = useState<FullPerson[]>([]);
  const [canSeePrivate, setCanSeePrivate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; notReady?: boolean } | null>(null);
  const showSkeleton = useShowAfter(loading);
  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/lms/full-directory", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw Object.assign(new Error(d?.error || "Couldn't load the Full Directory."), { notReady: !!d?.notReady });
        return d as FullDirectoryResponse;
      })
      .then((d) => { setPeople(d.people); setCanSeePrivate(d.canSeePrivate); })
      .catch((e: Error & { notReady?: boolean }) => setError({ message: e.message, notReady: e.notReady }))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  // ---------------------------------------------------------------- search box
  const [qInput, setQInput] = useState(state.q);
  const lastPushed = useRef(state.q);
  useEffect(() => { if (state.q !== lastPushed.current) { lastPushed.current = state.q; setQInput(state.q); } }, [state.q]);
  useEffect(() => {
    if (qInput === lastPushed.current) return;
    const t = setTimeout(() => { lastPushed.current = qInput; update({ q: qInput }); }, 120);
    return () => clearTimeout(t);
  }, [qInput, update]);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement)?.closest("input, textarea, select, [contenteditable]")) return;
      if (document.querySelector("[aria-modal='true']")) return;
      e.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ---------------------------------------------------------------- layout
  const small = useIsSmall();
  const [storedLayout, setStoredLayout] = useState<Layout>("table");
  useEffect(() => {
    try { const v = localStorage.getItem(LAYOUT_KEY); if (v === "cards" || v === "table") setStoredLayout(v); } catch { /* ignore */ }
  }, []);
  const [storedCols, setStoredCols] = useState<ColKey[] | null>(null);
  useEffect(() => {
    try {
      const v = localStorage.getItem(COLS_KEY);
      const keys = ALL_COLS.map((c) => c.key) as string[];
      if (v) setStoredCols(v.split("~").filter((k): k is ColKey => keys.includes(k)));
    } catch { /* ignore */ }
  }, []);
  const layout: Layout = small ? "cards" : state.layout ?? storedLayout;
  const setLayout = (l: Layout) => {
    try { localStorage.setItem(LAYOUT_KEY, l); } catch { /* ignore */ }
    setStoredLayout(l);
    update({ layout: l });
  };

  // ---------------------------------------------------------------- results
  const index = useMemo(() => new Map(buildIndex(people).map((e) => [e.person.slug, e])), [people]);
  const tokens = useMemo(() => queryTokens(state.q), [state.q]);
  const matches = useMemo(() => applyFilters(people, state, canSeePrivate), [people, state, canSeePrivate]);
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const m of matches) {
      const hit = scoreEntry(index.get(m.person.slug)!, tokens);
      if (!hit) continue;
      // Show the year the search matched — but only if it's one of the filtered years.
      const best = hit.best && m.context.includes(hit.best) ? hit.best : null;
      out.push({ person: m.person, context: m.context, best, score: hit.score });
    }
    return out;
  }, [matches, index, tokens]);
  const sortKey: SortKey = state.sort === "relevance" && !tokens.length ? "name" : state.sort ?? (tokens.length ? "relevance" : "name");
  const sorted = useMemo(() => sortRows(rows, sortKey, state.dir), [rows, sortKey, state.dir]);
  const sections = useMemo(() => groupRows(sorted, state.groupBy), [sorted, state.groupBy]);
  const options = useMemo(() => facetOptions(people, state, canSeePrivate), [people, state, canSeePrivate]);
  const chips = chipsFor(state, canSeePrivate);
  const nActive = activeCount(state, canSeePrivate);
  const allYears = useMemo(
    () => Array.from(new Set(people.flatMap((p) => p.years))).filter((y) => y !== ALUMNI_YEAR).sort(),
    [people],
  );
  const groupCount = useMemo(() => new Set(people.flatMap((p) => p.memberships.flatMap((m) => m.groups))).size, [people]);
  const cols: ColKey[] = state.cols ?? storedCols ?? DEFAULT_COLS;
  const setCols = (next: ColKey[] | null) => {
    try { if (next) localStorage.setItem(COLS_KEY, next.join("~")); else localStorage.removeItem(COLS_KEY); } catch { /* ignore */ }
    setStoredCols(next);
    update({ cols: next });
  };
  // Sorting by a hidden column shows it (temporarily: the saved choice is untouched).
  const sortCol = SORT_COL[sortKey];
  const autoCol = sortCol && !cols.includes(sortCol) ? sortCol : null;
  const shownCols = autoCol ? ALL_COLS.map((c) => c.key).filter((k) => k === autoCol || cols.includes(k)) : cols;
  const hiddenLabels = ALL_COLS.filter((c) => !shownCols.includes(c.key)).map((c) => c.label);
  const [colsOpen, setColsOpen] = useState(false);
  const colsAnchor = useRef<HTMLDivElement>(null);
  const openColumns = () => {
    colsAnchor.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    setColsOpen(true);
  };

  const clearAll = () => { setQInput(""); lastPushed.current = ""; update({ ...EMPTY_FILTERS, q: "" }); };
  const onSort = (k: SortKey) => update(sortKey === k ? { sort: k, dir: state.dir === "asc" ? "desc" : "asc" } : { sort: k, dir: "asc" });

  // ---------------------------------------------------------------- drawer
  const open = state.person ? people.find((p) => p.slug === state.person) ?? null : null;
  const flat = sorted.map((r) => r.person.slug);
  const at = open ? flat.indexOf(open.slug) : -1;
  const go = (i: number) => update({ person: flat[i] });

  // Desktop: beside the result count. Phones: inside the Filters sheet.
  const sortAndGroup = (
    <>
      <PillSelect<SortKey>
        label="Sort"
        value={sortKey}
        onChange={(v) => update({ sort: v, dir: "asc" })}
        options={[
          ...(tokens.length ? [["relevance", "Best match"] as [SortKey, string]] : []),
          ["name", "Name"], ["years", "First year"], ["position", "Seniority"], ["group", "Project group"], ["grad", "Class of"], ["major", "Major"],
        ]}
      />
      <PillSelect<GroupBy>
        label="Group by"
        value={state.groupBy}
        onChange={(v) => update({ groupBy: v })}
        options={[["", "None"], ["year", "Year"], ["group", "Project group"], ["position", "Position"]]}
      />
    </>
  );

  const yearsSpan = allYears.length ? `${allYears[0].slice(0, 4)}–${allYears[allYears.length - 1].slice(5)}` : "2015–2027";

  return (
    <>
      <DashboardBanner>
        <Link href="/dashboard" aria-label="Close directory"
          className="absolute right-5 top-[calc(var(--header-h)+1.25rem)] z-20 grid h-10 w-10 place-items-center rounded-full border border-paper/30 text-paper transition-colors hover:bg-paper hover:text-pine-deep">
          <CloseIcon className="h-5 w-5" />
        </Link>
        <div className="container-rishi relative z-10 py-12">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-paper/80 hover:text-paper">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
            Back to dashboard
          </Link>
          <h1 className="mt-4 font-display text-4xl font-semibold sm:text-5xl">Member Directory</h1>
          {switcher}
          <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-4 sm:gap-x-10" aria-label="Directory at a glance">
            {[
              [people.length ? String(people.length) : "—", "people"],
              [allYears.length ? String(allYears.length) : "—", "school years"],
              [groupCount ? String(groupCount) : "—", "project groups"],
              [yearsSpan, "covered"],
            ].map(([n, l]) => (
              <div key={l} className={`flex-col ${l === "covered" ? "hidden sm:flex" : "flex"}`}>
                <dt className="order-2 text-sm text-paper/70">{l}</dt>
                <dd className="order-1 font-display text-3xl font-semibold tabular-nums leading-none sm:text-4xl">{n}</dd>
              </div>
            ))}
          </dl>
        </div>
      </DashboardBanner>

      <section className="container-rishi py-10">
        {loading && showSkeleton && <DirectorySkeleton />}

        {!loading && error && (
          <div className="mx-auto max-w-lg rounded-3xl border border-pine/12 p-10 text-center">
            <h2 className="font-display text-2xl font-semibold text-pine-deep">
              {error.notReady ? "The Full Directory isn’t set up yet" : "Couldn’t load the directory"}
            </h2>
            <p className="mt-2 text-sm text-ink/65">
              {error.notReady
                ? "Once the member archive has been imported, everyone from 2015 onward will appear here."
                : error.message}
            </p>
            {!error.notReady && (
              <button type="button" onClick={load} className="mt-5 rounded-full bg-pine px-5 py-2.5 text-sm font-semibold text-paper hover:bg-pine-deep">Try again</button>
            )}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Search + view controls */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative min-w-0 flex-1">
                <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink/45" />
                <input
                  ref={searchRef}
                  type="search"
                  value={qInput}
                  onChange={(e) => setQInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape" && qInput) { e.preventDefault(); setQInput(""); } }}
                  placeholder="Search names, groups, roles, years…"
                  aria-label="Search the Full Directory"
                  aria-describedby="fd-search-hint"
                  className="w-full rounded-full border border-pine/20 bg-paper py-3 pl-11 pr-20 text-[15px] outline-none transition-colors placeholder:text-ink/45 focus:border-pine [&::-webkit-search-cancel-button]:hidden"
                />
                <span id="fd-search-hint" className="sr-only">Press slash to focus. Try “rainwater lead” or “president 2019”.</span>
                {qInput ? (
                  <button type="button" onClick={() => setQInput("")} aria-label="Clear search"
                    className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-ink/55 hover:bg-ink/5 hover:text-ink">
                    <CloseIcon className="h-4 w-4" />
                  </button>
                ) : (
                  <kbd aria-hidden className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-md border border-pine/20 px-1.5 py-0.5 font-sans text-xs text-ink/50 sm:block">/</kbd>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
                <FilterSheetButton state={state} set={update} options={options} canSeePrivate={canSeePrivate}
                  activeCount={nActive} resultCount={rows.length} onClearAll={clearAll} extra={sortAndGroup} />
                <div className="hidden md:block">
                  <Segmented<Layout>
                    label="Layout"
                    value={layout}
                    onChange={setLayout}
                    options={[
                      { value: "table", label: <><TableIcon /><span className="sr-only sm:not-sr-only">Table</span></>, title: "Table view" },
                      { value: "cards", label: <><GridIcon /><span className="sr-only sm:not-sr-only">Cards</span></>, title: "Card view" },
                    ]}
                  />
                </div>
                {layout === "table" && (
                  <div className="hidden md:block" ref={colsAnchor}>
                    <Popover
                      label="Columns" icon={<ColumnsIcon />} align="right" width="w-60"
                      open={colsOpen} onOpenChange={setColsOpen}
                      title={hiddenLabels.length ? `More columns available: ${hiddenLabels.join(", ")}` : undefined}
                      hint={hiddenLabels.length > 0 && (
                        <span className="rounded-full bg-ink/[0.07] px-1.5 text-[11px] font-semibold tabular-nums text-ink/60">+{hiddenLabels.length}</span>
                      )}
                    >
                      <p className="mb-1.5 px-2 text-xs text-ink/55">Choose what the table shows.</p>
                      <ul className="space-y-0.5" aria-label="Visible columns">
                        {ALL_COLS.map((c) => (
                          <li key={c.key}>
                            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-pine/[0.06]">
                              <input type="checkbox" className="h-4 w-4 accent-pine" checked={cols.includes(c.key)}
                                onChange={() => setCols(cols.includes(c.key) ? cols.filter((x) => x !== c.key) : ALL_COLS.map((x) => x.key).filter((k) => k === c.key || cols.includes(k)))} />
                              {c.label}
                              {c.key === "contact" && <span className="ml-auto text-[11px] text-ink/45">{canSeePrivate ? "email + phone" : "email"}</span>}
                              {c.key === autoCol && <span className="ml-auto text-[11px] text-ink/45">shown while sorted</span>}
                            </label>
                          </li>
                        ))}
                      </ul>
                      {(state.cols || storedCols) && (
                        <button type="button" onClick={() => setCols(null)} className="mt-2 w-full rounded-full px-3 py-1.5 text-xs font-semibold text-pine hover:bg-pine/[0.06]">
                          Reset columns
                        </button>
                      )}
                    </Popover>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => downloadCsv(sorted.map((r) => ({ person: r.person, context: r.context })), canSeePrivate, state.groupBy === "year")}
                  disabled={!rows.length}
                  className="inline-flex items-center gap-1.5 rounded-full border border-pine/20 bg-paper px-3.5 py-2 text-sm font-semibold text-pine-deep transition-colors hover:border-pine hover:bg-pine/[0.05] disabled:opacity-40"
                  title={state.groupBy === "year" ? "One row per person per year" : "One row per person"}
                >
                  <DownloadIcon /> <span className="hidden sm:inline">Export</span> CSV
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="mt-4">
              <FilterPopovers state={state} set={update} options={options} canSeePrivate={canSeePrivate} />
            </div>

            {/* Active filters + live count */}
            <div className="mt-4 flex min-h-8 flex-wrap items-center gap-2">
              <p className="mr-1 text-sm text-ink/70" aria-live="polite">
                Showing <span className="font-semibold tabular-nums text-ink">{rows.length}</span> of{" "}
                <span className="tabular-nums">{people.length}</span> people
                {tokens.length > 0 && sortKey === "relevance" && rows.length > 1 && <span className="text-ink/50"> · best matches first</span>}
              </p>
              {chips.map((c) => (
                <button key={c.key} type="button" onClick={() => update(c.remove)} aria-label={`Remove filter: ${c.label}`}
                  className="group inline-flex items-center gap-1 rounded-full bg-pine/[0.08] py-1 pl-3 pr-1.5 text-xs font-semibold text-pine-deep transition-colors hover:bg-pine/[0.14]">
                  {c.label}
                  <span className="grid h-4 w-4 place-items-center rounded-full text-pine-deep/60 group-hover:bg-paper group-hover:text-pine-deep"><CloseIcon className="h-3 w-3" /></span>
                </button>
              ))}
              {(chips.length > 0 || state.q) && (
                <button type="button" onClick={clearAll} className="text-xs font-semibold text-pine underline-offset-2 hover:underline">Clear all</button>
              )}
              <div className="ml-auto hidden flex-wrap items-center gap-2 md:flex">{sortAndGroup}</div>
            </div>

            {/* Results */}
            <div className="mt-4">
              {rows.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-pine/20 px-6 py-16 text-center">
                  <h2 className="font-display text-2xl font-semibold text-pine-deep">No one matches{state.q ? ` “${state.q}”` : " these filters"}</h2>
                  <p className="mx-auto mt-2 max-w-md text-sm text-ink/65">
                    {chips.length ? "Try removing a filter — years, groups and positions all have to match the same year." : "Check the spelling, or search by a group, role or year instead."}
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {state.q && <button type="button" onClick={() => setQInput("")} className="rounded-full border border-pine/25 px-4 py-2 text-sm font-semibold text-pine-deep hover:bg-pine/[0.05]">Clear search</button>}
                    {chips.length > 0 && <button type="button" onClick={() => update(EMPTY_FILTERS)} className="rounded-full bg-pine px-4 py-2 text-sm font-semibold text-paper hover:bg-pine-deep">Clear filters</button>}
                  </div>
                </div>
              ) : layout === "table" ? (
                <TableView sections={sections} cols={shownCols} sort={sortKey} dir={state.dir} onSort={onSort}
                  onOpen={(slug) => update({ person: slug })} tokens={tokens} allYears={allYears} grouped={!!state.groupBy}
                  autoCol={autoCol} hiddenLabels={hiddenLabels} onAddColumns={openColumns} />
              ) : (
                <CardGrid sections={sections} onOpen={(slug) => update({ person: slug })} tokens={tokens} allYears={allYears} grouped={!!state.groupBy} />
              )}
            </div>
          </>
        )}
      </section>

      <AnimatePresence>
        {open && (
          <PersonDrawer
            key="drawer"
            person={open}
            canSeePrivate={canSeePrivate}
            allYears={allYears}
            position={at >= 0 ? { index: at, total: flat.length } : null}
            onClose={() => update({ person: null })}
            onPrev={at > 0 ? () => go(at - 1) : undefined}
            onNext={at >= 0 && at < flat.length - 1 ? () => go(at + 1) : undefined}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function DirectorySkeleton() {
  return (
    <SkeletonRegion label="Loading the Full Directory…">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center" aria-hidden>
        <Block className="h-[50px] w-full rounded-full lg:max-w-xl" />
        <div className="flex gap-2 lg:ml-auto">
          <Block className="h-9 w-32 rounded-full" />
          <Block className="h-9 w-36 rounded-full" />
          <Block className="h-9 w-40 rounded-full" />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2" aria-hidden>
        {[80, 120, 92, 96, 84, 72, 64, 128].map((w, i) => <Block key={i} className="h-9 rounded-full" ><span style={{ display: "inline-block", width: w }} /></Block>)}
      </div>
      <Line className="mt-5 text-sm" w="11rem" />
      <div className="mt-4 overflow-hidden rounded-2xl border border-pine/12" aria-hidden>
        {Array.from({ length: 9 }, (_, r) => (
          <div key={r} className="flex items-center gap-6 border-b border-pine/8 px-5 py-3.5">
            <span className="h-[34px] w-[34px] shrink-0 animate-pulse rounded-full bg-ink/[0.07]" />
            <Line w="11rem" className="text-sm" />
            <Line w="7rem" className="text-sm" />
            <Line w="9rem" className="text-sm" />
            <Line w="10rem" className="hidden text-sm md:block" />
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}

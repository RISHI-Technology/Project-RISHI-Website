"use client";

// Lore → Leadership: one school year's leadership tree at a time.
//   • ‹ › (and ←/→) step to the previous/next year that has data; each stops at its end.
//   • The year lives in the URL (?tab=leadership&year=2024-2025), so links work.
//   • Clicking a name opens that person's history (PersonPopup).

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import LeadershipTree from "@/components/lore/LeadershipTree";
import PersonPopup from "@/components/lore/PersonPopup";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/fullDirectory/ui";
import { personHistory, personKeyOf, type PersonKey } from "@/lib/leadership/history";
import {
  CURRENT_LEADERSHIP_YEAR, shortLeadershipYear, type LeadershipData, type LeadershipHolder,
} from "@/lib/leadership/types";

type Load = { state: "loading" } | { state: "error"; message: string } | { state: "ready"; data: LeadershipData };

export const PVP_ONLY_NOTE = "Only the President and VP are recorded for this year.";

/** Years that have at least one role, oldest first. */
export function yearsWithData(data: LeadershipData): string[] {
  const has = new Set(data.roles.map((r) => r.year));
  return data.years.map((y) => y.year).filter((y) => has.has(y)).sort();
}
export function defaultYear(years: string[]): string | null {
  return years.includes(CURRENT_LEADERSHIP_YEAR) ? CURRENT_LEADERSHIP_YEAR : years.at(-1) ?? null;
}

export default function LeadershipView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [open, setOpen] = useState<PersonKey | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/lms/leadership", { cache: "no-store" });
        const body = await res.json().catch(() => ({}));
        if (!alive) return;
        if (!res.ok) setLoad({ state: "error", message: body.error ?? "Couldn't load leadership history." });
        else setLoad({ state: "ready", data: body as LeadershipData });
      } catch {
        if (alive) setLoad({ state: "error", message: "Couldn't load leadership history. Check your connection and try again." });
      }
    })();
    return () => { alive = false; };
  }, []);

  const data = load.state === "ready" ? load.data : null;
  const years = useMemo(() => (data ? yearsWithData(data) : []), [data]);
  const asked = params.get("year");
  const year = asked && years.includes(asked) ? asked : defaultYear(years);
  const i = year ? years.indexOf(year) : -1;
  const prev = i > 0 ? years[i - 1] : null;
  const next = i >= 0 && i < years.length - 1 ? years[i + 1] : null;

  const go = useCallback((y: string | null) => {
    if (!y) return;
    const q = new URLSearchParams(params.toString());
    q.set("tab", "leadership");
    q.set("year", y);
    router.replace(`${pathname}?${q.toString()}`, { scroll: false });
  }, [params, pathname, router]);

  // ←/→ step years — except while typing, while the popup is open, or while the
  // tree's scroll area itself is focused (there the arrows pan it sideways, like
  // Lineage's). A focused name chip inside the tree still steps years.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.matches("[data-lore-tree]") || t?.closest("input, textarea, select, [contenteditable='true'], [role='dialog']")) return;
      if (e.key === "ArrowLeft" && prev) { e.preventDefault(); go(prev); }
      if (e.key === "ArrowRight" && next) { e.preventDefault(); go(next); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, prev, next, go]);

  const history = useMemo(() => (data && open ? personHistory(data, open) : null), [data, open]);
  const onPick = useCallback((h: LeadershipHolder) => setOpen(personKeyOf(h)), []);
  const close = useCallback(() => setOpen(null), []);

  if (load.state === "loading")
    return <p className="py-16 text-center text-sm text-ink/60" role="status">Loading leadership history…</p>;
  if (load.state === "error")
    return <p className="mx-auto max-w-md py-16 text-center text-sm text-ink/70" role="alert">{load.message}</p>;
  if (!year || !data) return <p className="py-16 text-center text-sm text-ink/60">No leadership history has been added yet.</p>;

  const y = data.years.find((x) => x.year === year)!;
  const note = y.note ?? (y.structure === "pvp_only" ? PVP_ONLY_NOTE : null);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <YearButton dir="prev" to={prev} onClick={() => go(prev)} />
        <h2 className="min-w-[7.5rem] text-center font-display text-3xl font-semibold tabular-nums text-pine-deep sm:text-4xl" aria-live="polite">
          <span className="sr-only">Leadership in </span>{shortLeadershipYear(year)}
        </h2>
        <YearButton dir="next" to={next} onClick={() => go(next)} />
      </div>
      <p className="mt-2 text-center text-xs text-ink/50">
        Use ‹ › or the arrow keys to step through {years.length} years
        {data.canEdit && (
          <>
            {" · "}
            <Link href={`/dashboard/lore/edit?year=${year}`} className="font-semibold text-pine underline-offset-2 hover:underline">Edit leadership</Link>
          </>
        )}
      </p>
      {note && <p className="mx-auto mt-4 max-w-xl text-center text-sm text-ink/55" data-year-note>{note}</p>}

      <div className="mt-8 rounded-3xl border border-pine/12 bg-paper p-4 sm:p-8">
        <LeadershipTree year={y} roles={data.roles} holders={data.holders} onPick={onPick}
          label={`Leadership tree for ${shortLeadershipYear(year)} (scrolls sideways)`} />
      </div>

      <PersonPopup history={history} onClose={close} />
    </div>
  );
}

function YearButton({ dir, to, onClick }: { dir: "prev" | "next"; to: string | null; onClick: () => void }) {
  const label = dir === "prev" ? "Previous year" : "Next year";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!to}
      aria-label={to ? `${label} (${shortLeadershipYear(to)})` : `${label} (none)`}
      title={to ? shortLeadershipYear(to) : undefined}
      data-year-step={dir}
      className="grid h-11 w-11 place-items-center rounded-full border border-pine/20 text-pine-deep outline-none transition-colors hover:border-pine/45 hover:bg-pine/[0.06] focus-visible:ring-2 focus-visible:ring-pine/40 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-pine/20 disabled:hover:bg-transparent"
    >
      {dir === "prev" ? <ArrowLeftIcon className="h-5 w-5" /> : <ArrowRightIcon className="h-5 w-5" />}
    </button>
  );
}

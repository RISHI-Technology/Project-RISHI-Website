"use client";

// Lore → Leadership person popup. Phones get the site's swipeable BottomSheet;
// wider screens get a centred dialog (focus trapped, Escape closes, focus returns
// to the name that opened it — the same behaviour as the Full Directory drawer).
// The history list reuses the Full Directory's "Year by year" timeline styling.

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useSyncExternalStore } from "react";
import BottomSheet from "@/components/BottomSheet";
import { CloseIcon, GroupChip, Initials } from "@/components/fullDirectory/ui";
import { longYear, personHref } from "@/components/fullDirectory/model";
import type { PersonHistory } from "@/lib/leadership/history";

const SMALL = "(max-width: 639px)";
function useIsSmall() {
  return useSyncExternalStore(
    (cb) => { const m = window.matchMedia(SMALL); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
    () => window.matchMedia(SMALL).matches,
    () => false,
  );
}

export default function PersonPopup({ history, onClose }: { history: PersonHistory | null; onClose: () => void }) {
  const small = useIsSmall();
  if (small) {
    return (
      <BottomSheet open={!!history} onClose={onClose} label={history ? `${history.name} — history in RISHI` : "History"}
        panelClassName="max-h-[88vh] overflow-y-auto overscroll-contain bg-paper px-5 pb-8 pt-4 text-ink">
        {history && <Body history={history} onClose={onClose} />}
      </BottomSheet>
    );
  }
  return <Dialog history={history} onClose={onClose} />;
}

function Dialog({ history, onClose }: { history: PersonHistory | null; onClose: () => void }) {
  const reduce = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const open = !!history;

  useEffect(() => {
    if (!open) return;
    returnTo.current = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key === "Tab" && panel.current) {
        const f = Array.from(panel.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])"));
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      const el = returnTo.current;
      if (el && document.contains(el)) el.focus();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {history && (
        <div className="fixed inset-0 z-[1100] grid place-items-center p-6" role="presentation">
          <motion.div className="absolute inset-0 bg-ink/40" onClick={onClose}
            initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.18 }} />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="lore-person-name"
            className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-3xl bg-paper px-7 pb-8 pt-6 text-ink shadow-[0_30px_80px_-30px_rgb(20_54_40/0.55)]"
            initial={reduce ? false : { opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 36 }}
          >
            <Body history={history} onClose={onClose} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

const DOT = {
  leader: "bg-marigold ring-marigold/30",
  exec: "bg-marigold ring-marigold/30",
  lead: "bg-pine ring-pine/20",
  other: "bg-sage ring-sage/25",
  member: "bg-paper ring-pine/30 border-2 border-pine/50",
} as const;

function Body({ history: h, onClose }: { history: PersonHistory; onClose: () => void }) {
  const yearsInRishi = h.person?.memberships.filter((m) => /^\d{4}-\d{4}$/.test(m.year)).length ?? 0;
  return (
    <div data-lore-popup>
      <div className="flex items-start gap-4">
        <Initials name={h.name} slug={h.person?.slug ?? h.key} size={56} />
        <div className="min-w-0 flex-1">
          <h2 id="lore-person-name" className="font-display text-2xl font-semibold leading-tight text-pine-deep">{h.name}</h2>
          <p className="mt-1 text-sm text-ink/65">
            {yearsInRishi > 0 ? `${yearsInRishi} ${yearsInRishi === 1 ? "year" : "years"} in RISHI` : "Leadership history"}
          </p>
          {h.person ? (
            <Link href={personHref(h.person.slug)} data-autofocus
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-pine/20 px-3 py-1.5 text-xs font-semibold text-pine-deep transition-colors hover:border-pine/45 hover:bg-pine/[0.06]">
              View full profile
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </Link>
          ) : (
            <p className="mt-2 text-xs text-ink/50">Not linked to a Full Directory profile.</p>
          )}
        </div>
        <button type="button" onClick={onClose} aria-label="Close" {...(h.person ? {} : { "data-autofocus": true })}
          className="-mr-2 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink/70 outline-none hover:bg-pine/[0.07] hover:text-pine-deep focus-visible:ring-2 focus-visible:ring-pine/40">
          <CloseIcon className="h-5 w-5" />
        </button>
      </div>

      <section className="mt-7" aria-labelledby="lore-history">
        <h3 id="lore-history" className="font-sans text-xs font-semibold uppercase tracking-wide text-ink/55">History in RISHI</h3>
        <ol className="relative mt-4 space-y-5 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-pine/15">
          {h.rows.map((r) => {
            const dot = r.roles.length ? DOT.leader : DOT[r.positionType ?? "member"];
            return (
              <li key={r.year} className="relative pl-8">
                <span aria-hidden className={`absolute left-0 top-1 h-[15px] w-[15px] rounded-full ring-4 ${dot}`} />
                <p className="font-display text-lg font-semibold leading-tight text-pine-deep">{longYear(r.year)}</p>
                {r.groups.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {r.groups.map((g) => <GroupChip key={g} group={g} />)}
                  </div>
                )}
                {r.roles.map((role, i) => (
                  <div key={i} className="mt-1.5">
                    <p className="text-sm font-medium text-ink/90">
                      {role.title}
                      {role.qualifier && <span className="ml-1.5 font-normal text-ink/55">· {role.qualifier}</span>}
                    </p>
                    {role.note && <p className="mt-0.5 text-xs italic text-ink/55">Note: {role.note}</p>}
                  </div>
                ))}
                {!r.roles.length && (
                  <p className="mt-1.5 text-sm text-ink/75">
                    {r.positions.length ? r.positions.join(" · ") : r.notYetPlaced ? "New member (not yet placed)" : "General Member"}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

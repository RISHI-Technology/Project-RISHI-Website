"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import { toast } from "@/components/Toast";
import { POSITION_TYPE_LABELS, type FullPerson } from "@/lib/fullDirectory/types";
import { isCurrent, longYear, personHref, roleOf, yearSpan } from "@/components/fullDirectory/model";
import {
  ArrowLeftIcon, ArrowRightIcon, CloseIcon, CopyIcon, GroupChip, Initials, LinkIcon, YearStrip,
} from "@/components/fullDirectory/ui";

const NODE = {
  exec: "bg-marigold ring-marigold/30",
  lead: "bg-pine ring-pine/20",
  other: "bg-sage ring-sage/25",
  member: "bg-paper ring-pine/30 border-2 border-pine/50",
} as const;

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast({ message: `${what} copied` });
  } catch {
    toast({ message: `Couldn't copy the ${what.toLowerCase()}`, tone: "error" });
  }
}

export default function PersonDrawer({ person, canSeePrivate, allYears, position, onClose, onPrev, onNext }: {
  person: FullPerson; canSeePrivate: boolean; allYears: string[];
  position: { index: number; total: number } | null;
  onClose: () => void; onPrev?: () => void; onNext?: () => void;
}) {
  const reduce = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  // Remember where focus was, move it into the drawer, lock page scroll; undo on close.
  useEffect(() => {
    returnTo.current = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      const el = returnTo.current;
      if (el && document.contains(el)) el.focus();
    };
  }, []);
  useEffect(() => { panel.current?.scrollTo({ top: 0 }); }, [person.slug]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest("input, textarea, select");
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (!typing && e.key === "ArrowLeft" && onPrev) { e.preventDefault(); onPrev(); return; }
      if (!typing && e.key === "ArrowRight" && onNext) { e.preventDefault(); onNext(); return; }
      if (e.key === "Tab" && panel.current) {
        // Keep Tab inside the drawer.
        const f = Array.from(panel.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])"));
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  const p = person;
  const role = roleOf(p.memberships);
  const facts: [string, ReactNode][] = [];
  if (p.gradYear) facts.push(["Class of", <>{p.gradYear}{p.gradYearInferred && <span className="ml-1 text-ink/50">(estimated)</span>}</>]);
  if (p.major) facts.push(["Major", p.major]);
  if (p.joined) facts.push(["Joined RISHI", <>{p.joined}{p.joinedApprox && <span className="ml-1 text-ink/50">(approx.)</span>}</>]);
  if (p.birthday) facts.push(["Birthday", p.birthday]);
  if (p.indiaTrips.length) facts.push(["India trips", p.indiaTrips.join(", ")]);
  if (p.hindi) facts.push(["Hindi", p.hindi]);
  if (p.linkedin) facts.push(["LinkedIn", <a key="li" href={p.linkedin} target="_blank" rel="noopener noreferrer" className="break-all text-pine hover:underline">{p.linkedin.replace(/^https?:\/\/(www\.)?/, "")}</a>]);
  if (p.postGradPlans) facts.push(["Post-grad plans", p.postGradPlans]);

  return (
    <div className="fixed inset-0 z-[1100]" role="presentation">
      <motion.div
        className="absolute inset-0 bg-ink/40"
        onClick={onClose}
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduce ? 0 : 0.18 }}
      />
      <motion.div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fd-person-name"
        className="absolute inset-y-0 right-0 flex w-full max-w-[520px] flex-col overflow-y-auto overscroll-contain bg-paper shadow-[-24px_0_60px_-30px_rgb(20_54_40/0.5)] safe-overlay"
        initial={reduce ? false : { x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 42 }}
      >
        {/* Toolbar */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-pine/10 bg-paper/95 px-5 py-3 backdrop-blur">
          <div className="flex items-center gap-1">
            <button type="button" onClick={onPrev} disabled={!onPrev} aria-label="Previous person"
              className="grid h-9 w-9 place-items-center rounded-full text-ink/70 outline-none focus-visible:ring-2 focus-visible:ring-pine/40 hover:bg-pine/[0.07] hover:text-pine-deep disabled:opacity-30 disabled:hover:bg-transparent">
              <ArrowLeftIcon />
            </button>
            <button type="button" onClick={onNext} disabled={!onNext} aria-label="Next person"
              className="grid h-9 w-9 place-items-center rounded-full text-ink/70 outline-none focus-visible:ring-2 focus-visible:ring-pine/40 hover:bg-pine/[0.07] hover:text-pine-deep disabled:opacity-30 disabled:hover:bg-transparent">
              <ArrowRightIcon />
            </button>
            {position && <span className="ml-1 text-xs tabular-nums text-ink/55">{position.index + 1} of {position.total}</span>}
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => copy(`${window.location.origin}${personHref(p.slug)}`, "Link")}
              className="inline-flex items-center gap-1.5 rounded-full border border-pine/20 px-3 py-1.5 text-xs font-semibold text-pine-deep hover:bg-pine/[0.06]">
              <LinkIcon className="h-3.5 w-3.5" /> Copy link
            </button>
            <button ref={closeBtn} type="button" onClick={onClose} aria-label="Close profile"
              className="grid h-9 w-9 place-items-center rounded-full text-ink/70 outline-none focus-visible:ring-2 focus-visible:ring-pine/40 hover:bg-pine/[0.07] hover:text-pine-deep">
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="px-6 pb-12 pt-6 sm:px-8">
          {/* Header */}
          <div className="flex items-start gap-4">
            <Initials name={p.name} slug={p.slug} size={64} />
            <div className="min-w-0">
              <h2 id="fd-person-name" className="font-display text-3xl font-semibold leading-tight text-pine-deep">{p.name}</h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink/65">
                <span>{yearSpan(p)}</span>
                {p.years.length > 0 && <span>· {p.years.length} {p.years.length === 1 ? "year" : "years"} in RISHI</span>}
                {isCurrent(p) && <span className="rounded-full bg-marigold-soft/60 px-2 py-0.5 text-[11px] font-semibold text-marigold-ink">Current member</span>}
              </p>
              {role.type !== "member" && <p className="mt-2 text-sm font-medium text-ink/85">{role.label}</p>}
            </div>
          </div>
          {p.years.length > 0 && <div className="mt-5"><YearStrip allYears={allYears} years={p.years} /></div>}

          {/* Contact */}
          <section className="mt-8" aria-labelledby="fd-contact">
            <h3 id="fd-contact" className="font-sans text-xs font-semibold uppercase tracking-wide text-ink/55">Contact</h3>
            <ul className="mt-2 divide-y divide-pine/8 rounded-2xl border border-pine/12">
              {p.emails.map((e) => <ContactRow key={e} href={`mailto:${e}`} value={e} what="Email" />)}
              {canSeePrivate && (p.phones ?? []).map((ph) => <ContactRow key={ph} href={`tel:${ph.replace(/[^\d+]/g, "")}`} value={ph} what="Phone number" />)}
              {!p.emails.length && !(canSeePrivate && p.phones?.length) && (
                <li className="px-4 py-3 text-sm text-ink/55">No {canSeePrivate ? "contact info" : "Berkeley email"} on record.</li>
              )}
            </ul>
            {!canSeePrivate && <p className="mt-2 text-xs text-ink/50">Phone numbers and personal emails are visible to exec only.</p>}
          </section>

          {/* Facts */}
          {(facts.length > 0 || p.otherInfo.length > 0) && (
            <section className="mt-8" aria-labelledby="fd-about">
              <h3 id="fd-about" className="font-sans text-xs font-semibold uppercase tracking-wide text-ink/55">About</h3>
              <dl className="mt-2 grid grid-cols-[minmax(0,8.5rem)_1fr] gap-x-4 gap-y-2.5 text-sm">
                {facts.map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-ink/55">{k}</dt>
                    <dd className="text-ink">{v}</dd>
                  </div>
                ))}
                {p.otherInfo.map((o, i) => (
                  <div key={`o${i}`} className="contents">
                    <dt className="text-ink/55">{o.label}</dt>
                    <dd className="text-ink">{o.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {/* Timeline */}
          <section className="mt-8" aria-labelledby="fd-timeline">
            <h3 id="fd-timeline" className="font-sans text-xs font-semibold uppercase tracking-wide text-ink/55">Year by year</h3>
            <ol className="relative mt-4 space-y-5 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-pine/15">
              {p.memberships.map((m) => {
                const meta = [
                  m.classStanding, m.semesters ? `${m.semesters} ${m.semesters === 1 ? "semester" : "semesters"} in RISHI` : null,
                  m.hindi ? `Hindi: ${m.hindi}` : null, m.indiaTrip, m.hiatus ? `On hiatus: ${m.hiatus}` : null,
                ].filter(Boolean);
                return (
                  <li key={m.year} className="relative pl-8">
                    <span aria-hidden className={`absolute left-0 top-1 h-[15px] w-[15px] rounded-full ring-4 ${NODE[m.positionType]}`} />
                    <p className="font-display text-lg font-semibold leading-tight text-pine-deep">{longYear(m.year)}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {m.groups.map((g) => <GroupChip key={g} group={g} />)}
                      {!m.groups.length && <span className="text-xs text-ink/50">{m.notYetPlaced ? "Not yet placed in a group" : "No project group recorded"}</span>}
                    </div>
                    <p className="mt-1.5 text-sm text-ink/85">
                      {m.positions.length ? m.positions.join(" · ") : "General Member"}
                      {m.positionType !== "member" && <span className="ml-2 text-xs text-ink/50">{POSITION_TYPE_LABELS[m.positionType]}</span>}
                    </p>
                    {meta.length > 0 && <p className="mt-1 text-xs text-ink/55">{meta.join(" · ")}</p>}
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      </motion.div>
    </div>
  );
}

function ContactRow({ href, value, what }: { href: string; value: string; what: string }) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-2.5">
      <a href={href} className="min-w-0 truncate text-sm text-pine hover:underline">{value}</a>
      <button type="button" onClick={() => copy(value, what)} aria-label={`Copy ${what.toLowerCase()} ${value}`}
        className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-ink/60 hover:bg-pine/[0.07] hover:text-pine-deep">
        <CopyIcon className="h-3.5 w-3.5" /> Copy
      </button>
    </li>
  );
}

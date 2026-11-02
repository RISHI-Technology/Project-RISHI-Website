import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import Contours from "@/components/Contours";
import { APPLY, LINKS } from "@/lib/content";

export const metadata: Metadata = {
  title: "Apply",
  description: "Join Project RISHI at UC Berkeley. Recruitment dates and application.",
};

export default function ApplyPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-pine pt-[var(--header-h)] text-paper">
        <Contours className="absolute inset-0 h-full w-full text-paper" opacity={0.12} />
        <div className="absolute -bottom-10 left-0 right-0">
          <Contours className="h-48 w-full text-marigold" opacity={0.16} />
        </div>
        <div className="container-rishi relative z-10 pb-20 pt-16 lg:pb-28 lg:pt-24">
          <Reveal>
            <span className="inline-flex items-center gap-3 text-sm font-medium text-paper/75">
              <span className="h-px w-6 bg-marigold" />
              {APPLY.termLabel}
            </span>
            <h1 className="mt-7 max-w-4xl font-display text-5xl font-semibold leading-[1.02] sm:text-6xl lg:text-7xl">
              {APPLY.heading}
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-paper/80">{APPLY.blurb}</p>
            {LINKS.application ? (
              <a
                href={LINKS.application}
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-9 inline-flex items-center gap-2 rounded-full bg-marigold px-8 py-3.5 text-base font-semibold text-pine-deep transition-[background-color,color,transform] duration-200 hover:-translate-y-0.5 hover:bg-marigold-deep hover:text-paper"
              >
                Apply
                <svg className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </a>
            ) : null}
          </Reveal>
        </div>
      </section>

      {/* Timeline — one schedule, read top to bottom */}
      <section className="container-rishi py-20 lg:py-28">
        <ol className="border-b border-pine/15">
          {APPLY.timeline.map((t, i) => (
            <Reveal
              as="li"
              key={t.label}
              delay={i * 0.08}
              className="grid grid-cols-[2.5rem_1fr] gap-x-4 gap-y-1 border-t border-pine/15 py-5 sm:grid-cols-[3rem_minmax(0,15rem)_1fr_auto] sm:items-baseline sm:gap-x-8 sm:py-6"
            >
              <span className="text-sm font-semibold tabular-nums text-marigold-ink">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="text-[15px] font-medium text-sage-deep">
                {t.label}
              </p>
              <p className="col-start-2 font-display text-xl font-semibold text-pine-deep sm:col-start-auto sm:text-2xl">
                {t.value}
              </p>
              {"time" in t && t.time ? (
                <p className="col-start-2 text-sm font-medium tabular-nums text-marigold-ink sm:col-start-auto sm:text-right">
                  {t.time}
                </p>
              ) : null}
            </Reveal>
          ))}
        </ol>

        {/* Actions */}
        <Reveal delay={0.1}>
          <div className="mt-14 grid gap-5 sm:grid-cols-3">
            <a href={LINKS.interestForm} target="_blank" rel="noopener noreferrer" className="group flex min-h-[9.5rem] flex-col justify-between rounded-2xl bg-pine p-7 text-paper transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-pine-deep">
              <p className="font-display text-2xl font-semibold">Interest Form</p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-marigold-soft">
                Open form →
              </span>
            </a>
            {LINKS.coffeeChats ? (
              <a href={LINKS.coffeeChats} target="_blank" rel="noopener noreferrer" className="group flex min-h-[9.5rem] flex-col justify-between rounded-2xl bg-marigold p-7 text-pine-deep transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-marigold-deep">
                <p className="font-display text-2xl font-semibold">Coffee Chats</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold">
                  Book a slot →
                </span>
              </a>
            ) : (
              <div aria-disabled className="flex min-h-[9.5rem] flex-col justify-between rounded-2xl border border-dashed border-pine/25 p-7 text-pine-deep/60">
                <p className="font-display text-2xl font-semibold text-pine-deep/70">Coffee Chats</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-pine-deep/55">
                  Released soon
                </span>
              </div>
            )}
            {LINKS.application ? (
              <a href={LINKS.application} target="_blank" rel="noopener noreferrer" className="group flex min-h-[9.5rem] flex-col justify-between rounded-2xl bg-pine-deep p-7 text-paper transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-ink">
                <p className="font-display text-2xl font-semibold">Application</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-marigold-soft">
                  Apply now →
                </span>
              </a>
            ) : (
              <div aria-disabled className="flex min-h-[9.5rem] flex-col justify-between rounded-2xl border border-dashed border-pine/25 p-7 text-pine-deep/60">
                <p className="font-display text-2xl font-semibold text-pine-deep/70">Application</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-pine-deep/55">
                  Released soon
                </span>
              </div>
            )}
          </div>
        </Reveal>
      </section>
    </>
  );
}

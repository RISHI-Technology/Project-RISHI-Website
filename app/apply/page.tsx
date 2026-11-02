import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { APPLY, LINKS } from "@/lib/content";

export const metadata: Metadata = {
  title: "Apply",
  description: "Join Project RISHI at UC Berkeley. Recruitment dates and application.",
};

const Arrow = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default function ApplyPage() {
  return (
    <div className="site">
      <section className="a-glow pb-[clamp(4rem,8vw,7rem)] pt-[calc(var(--header-h)+clamp(3.5rem,8vw,6.5rem))]">
        <div className="a-wrap text-center">
          <p className="hero-rise a-eyebrow">{APPLY.termLabel}</p>
          <h1 style={{ "--i": 1 } as CSSProperties} className="hero-rise a-display mx-auto mt-3 max-w-[18ch]">
            {APPLY.heading}
          </h1>
          <p style={{ "--i": 2 } as CSSProperties} className="hero-rise a-lead mt-5 text-label-2">{APPLY.blurb}</p>
          {LINKS.application ? (
            <div style={{ "--i": 3 } as CSSProperties} className="hero-rise mt-8">
              <a href={LINKS.application} target="_blank" rel="noopener noreferrer" className="a-btn a-btn-primary min-h-[52px] px-8 text-[1.1875rem]">
                Apply
                <Arrow />
              </a>
            </div>
          ) : null}
        </div>
      </section>

      {/* Timeline — one schedule */}
      <section className="pb-[var(--a-section)]">
        <div className="a-wrap">
          <ol className="a-reveal a-tile divide-y divide-label/10 px-[clamp(1.25rem,3vw,2.5rem)]">
            {APPLY.timeline.map((t, i) => (
              <li
                key={t.label}
                className="grid grid-cols-[2.75rem_1fr] items-center gap-x-4 gap-y-1 py-6 sm:grid-cols-[3.25rem_minmax(0,15rem)_1fr_auto] sm:gap-x-6"
              >
                <span className="a-num row-span-3 grid h-11 w-11 place-items-center self-start rounded-full bg-pine/[0.08] text-[0.9375rem] font-semibold text-pine sm:row-span-1 sm:self-center">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="a-callout font-semibold text-label-2">{t.label}</p>
                <p className="a-title3 col-start-2 sm:col-start-auto">{t.value}</p>
                {"time" in t && t.time ? (
                  <p className="a-callout a-num col-start-2 text-label-2 sm:col-start-auto sm:text-right">{t.time}</p>
                ) : null}
              </li>
            ))}
          </ol>

          {/* Actions */}
          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            <div className="a-reveal flex">
              <a
                href={LINKS.interestForm}
                target="_blank"
                rel="noopener noreferrer"
                className="a-press a-on-dark flex min-h-[11rem] w-full flex-col justify-between rounded-[var(--a-r-lg)] bg-pine p-8 transition-colors hover:bg-pine-deep"
              >
                <p className="a-title2">Interest Form</p>
                <span className="a-callout inline-flex items-center gap-2 font-semibold text-marigold">
                  Open form →
                </span>
              </a>
            </div>
            <div className="a-reveal flex">
              {LINKS.coffeeChats ? (
                <a
                  href={LINKS.coffeeChats}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="a-press flex min-h-[11rem] w-full flex-col justify-between rounded-[var(--a-r-lg)] bg-marigold p-8 text-label transition-colors hover:bg-[rgb(var(--a-marigold-press))]"
                >
                  <p className="a-title2">Coffee Chats</p>
                  <span className="a-callout inline-flex items-center gap-2 font-semibold">
                    Book a slot →
                  </span>
                </a>
              ) : (
                <div aria-disabled className="flex min-h-[11rem] w-full flex-col justify-between rounded-[var(--a-r-lg)] border border-dashed border-label/20 p-8">
                  <p className="a-title2 text-label/70">Coffee Chats</p>
                  <span className="a-callout inline-flex items-center gap-2 font-semibold text-label-2">
                    Released soon
                  </span>
                </div>
              )}
            </div>
            <div className="a-reveal flex">
              {LINKS.application ? (
                <a
                  href={LINKS.application}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="a-press a-on-dark flex min-h-[11rem] w-full flex-col justify-between rounded-[var(--a-r-lg)] p-8 transition-colors hover:bg-black"
                >
                  <p className="a-title2">Application</p>
                  <span className="a-callout inline-flex items-center gap-2 font-semibold text-marigold">
                    Apply now →
                  </span>
                </a>
              ) : (
                <div aria-disabled className="flex min-h-[11rem] w-full flex-col justify-between rounded-[var(--a-r-lg)] border border-dashed border-label/20 p-8">
                  <p className="a-title2 text-label/70">Application</p>
                  <span className="a-callout inline-flex items-center gap-2 font-semibold text-label-2">
                    Released soon
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

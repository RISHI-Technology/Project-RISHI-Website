import type { Metadata } from "next";
import SiteLabel from "@/components/SiteLabel";
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
      <section className="border-b border-graphite/10 pt-[var(--header-h)]">
        <div className="s-container pb-[clamp(3.5rem,7vw,6rem)] pt-[clamp(3.5rem,7vw,6rem)]">
          <SiteLabel>{APPLY.termLabel}</SiteLabel>
          <h1 className="t-display mt-7 max-w-[17ch] text-deodar">{APPLY.heading}</h1>
          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-5">
            <p className="t-lead text-graphite/80">{APPLY.blurb}</p>
            {LINKS.application ? (
              <a href={LINKS.application} target="_blank" rel="noopener noreferrer" className="s-btn s-btn-primary">
                Apply
                <Arrow />
              </a>
            ) : null}
          </div>
        </div>
      </section>

      {/* Timeline — one schedule, read top to bottom */}
      <section className="s-section">
        <div className="s-container">
          <ol className="border-b border-graphite/15">
            {APPLY.timeline.map((t, i) => (
              <li
                key={t.label}
                className="grid grid-cols-[2.75rem_1fr] gap-x-4 gap-y-1 border-t border-graphite/15 py-6 sm:grid-cols-[4rem_minmax(0,16rem)_1fr_auto] sm:items-baseline sm:gap-x-8"
              >
                <span className="t-label t-num text-deodar">{String(i + 1).padStart(2, "0")}</span>
                <p className="t-label text-stone">{t.label}</p>
                <p className="t-h3 col-start-2 text-deodar sm:col-start-auto">{t.value}</p>
                {"time" in t && t.time ? (
                  <p className="t-small t-num col-start-2 font-medium text-graphite/80 sm:col-start-auto sm:text-right">{t.time}</p>
                ) : null}
              </li>
            ))}
          </ol>

          {/* Actions */}
          <div className="mt-[var(--space-block)] grid gap-4 sm:grid-cols-3">
            <a
              href={LINKS.interestForm}
              target="_blank"
              rel="noopener noreferrer"
              className="group s-dark flex min-h-[10rem] flex-col justify-between rounded-[var(--r-media)] bg-deodar p-7 text-snow transition-colors duration-150 hover:bg-deodar-deep"
            >
              <p className="t-h3">Interest Form</p>
              <span className="t-label mt-6 inline-flex items-center gap-2 text-saffron">
                Open form →
              </span>
            </a>
            {LINKS.coffeeChats ? (
              <a
                href={LINKS.coffeeChats}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex min-h-[10rem] flex-col justify-between rounded-[var(--r-media)] bg-saffron p-7 text-deodar-deep transition-colors duration-150 hover:bg-saffron-deep"
              >
                <p className="t-h3">Coffee Chats</p>
                <span className="t-label mt-6 inline-flex items-center gap-2">
                  Book a slot →
                </span>
              </a>
            ) : (
              <div aria-disabled className="flex min-h-[10rem] flex-col justify-between rounded-[var(--r-media)] border border-dashed border-graphite/25 p-7">
                <p className="t-h3 text-graphite/70">Coffee Chats</p>
                <span className="t-label mt-6 inline-flex items-center gap-2 text-stone">
                  Released soon
                </span>
              </div>
            )}
            {LINKS.application ? (
              <a
                href={LINKS.application}
                target="_blank"
                rel="noopener noreferrer"
                className="group s-dark flex min-h-[10rem] flex-col justify-between rounded-[var(--r-media)] bg-deodar-deep p-7 text-snow transition-colors duration-150 hover:bg-graphite"
              >
                <p className="t-h3">Application</p>
                <span className="t-label mt-6 inline-flex items-center gap-2 text-saffron">
                  Apply now →
                </span>
              </a>
            ) : (
              <div aria-disabled className="flex min-h-[10rem] flex-col justify-between rounded-[var(--r-media)] border border-dashed border-graphite/25 p-7">
                <p className="t-h3 text-graphite/70">Application</p>
                <span className="t-label mt-6 inline-flex items-center gap-2 text-stone">
                  Released soon
                </span>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

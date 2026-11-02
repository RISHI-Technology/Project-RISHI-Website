import type { Metadata } from "next";
import Contours from "@/components/Contours";
import { APPLY, LINKS } from "@/lib/content";

export const metadata: Metadata = {
  title: "Apply",
  description: "Join Project RISHI at UC Berkeley. Recruitment dates and application.",
};

const Arrow = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M7 17 17 7M9 7h8v8" />
  </svg>
);

/** One way in: a link card when the link exists, a quiet "Released soon" box otherwise. */
function Action({ href, title, cta, primary = false }: { href: string; title: string; cta: string; primary?: boolean }) {
  if (!href) {
    return (
      <div aria-disabled className="rounded-2xl border border-dashed border-pine/20 p-6">
        <p className="font-display text-xl font-medium text-pine-deep/60">{title}</p>
        <p className="mt-4 text-sm text-ink/55">Released soon</p>
      </div>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group rounded-2xl p-6 transition-colors duration-150 ${
        primary
          ? "bg-pine text-paper hover:bg-pine-deep"
          : "border border-pine/10 bg-paper text-pine-deep hover:border-pine/30"
      }`}
    >
      <p className="font-display text-xl font-medium">{title}</p>
      <span className={`mt-4 inline-flex items-center gap-2 text-sm font-medium ${primary ? "text-marigold-soft" : "text-pine"}`}>
        {cta}
        <Arrow />
      </span>
    </a>
  );
}

export default function ApplyPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-pine pt-[var(--header-h)] text-paper">
        <Contours className="absolute inset-0 h-full w-full text-paper" opacity={0.12} />
        <div className="container-rishi relative z-10 py-20 lg:py-24">
          <p className="eyebrow text-marigold-soft">{APPLY.termLabel}</p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-medium leading-[1.04] tracking-[-0.02em] sm:text-6xl">
            {APPLY.heading}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-paper/80">{APPLY.blurb}</p>
          {LINKS.application ? (
            <a
              href={LINKS.application}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-accent mt-8"
            >
              Apply
              <Arrow />
            </a>
          ) : null}
        </div>
      </section>

      {/* Timeline */}
      <section className="container-rishi py-20">
        <h2 className="font-display text-3xl font-medium text-pine-deep sm:text-4xl">Dates</h2>
        <ol className="mt-8 divide-y divide-pine/10 rounded-2xl border border-pine/10">
          {APPLY.timeline.map((t) => (
            <li key={t.label} className="grid gap-1 px-6 py-4 sm:grid-cols-[12rem_1fr_auto] sm:items-baseline sm:gap-6">
              <span className="text-sm text-ink/70">{t.label}</span>
              <span className="font-display text-xl font-medium tabular-nums text-pine-deep">{t.value}</span>
              {"time" in t && t.time ? (
                <span className="text-sm tabular-nums text-ink/70">{t.time}</span>
              ) : (
                <span className="hidden sm:block" />
              )}
            </li>
          ))}
        </ol>

        {/* Actions */}
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          <Action href={LINKS.interestForm} title="Interest form" cta="Open form" />
          <Action href={LINKS.coffeeChats} title="Coffee chats" cta="Book a slot" />
          <Action href={LINKS.application} title="Application" cta="Apply now" primary />
        </div>
      </section>
    </>
  );
}

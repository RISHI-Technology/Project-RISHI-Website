import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import Contours from "@/components/Contours";
import { ORG } from "@/lib/content";

export const metadata: Metadata = {
  title: "Donate",
  description: "Support Project RISHI's work in Bharog Baneri.",
};

const STRIPE_URL = "https://donate.stripe.com/6oEeYJ5CX6Ay5a03cl";

export default function DonatePage() {
  return (
    <section className="relative overflow-hidden bg-pine pt-[var(--header-h)] text-paper">
      <Contours className="absolute inset-0 h-full w-full text-paper" opacity={0.1} />
      <div className="container-rishi relative z-10 grid min-h-[70vh] gap-14 pb-20 pt-16 lg:grid-cols-12 lg:items-center lg:pb-28 lg:pt-24">
        <Reveal className="lg:col-span-6 xl:col-span-7">
          <span className="inline-flex items-center gap-3 text-sm font-medium text-paper/75">
            <span className="h-px w-6 bg-marigold" />
            Support our work
          </span>
          <h1 className="mt-7 font-display text-5xl font-semibold leading-[1.02] sm:text-6xl lg:text-7xl">
            Every gift reaches the village.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-paper/80">
            We appreciate donations of all sizes — they keep us running as an
            organization and directly support our projects in Bharog Baneri.
          </p>
        </Reveal>

        {/* Stripe donation block */}
        <Reveal delay={0.12} className="w-full lg:col-span-6 lg:col-start-7 xl:col-span-5 xl:col-start-8 xl:pl-6">
          <div className="rounded-2xl border border-paper/15 bg-paper/[0.06] p-8 text-left sm:p-9">
            <p className="font-display text-2xl font-semibold text-paper">Donate online</p>
            <p className="mt-2 text-sm leading-relaxed text-paper/70">
              Give securely by card in a few taps. Donations are processed through
              the ASUC (Associated Students of the University of California), which
              sponsors us as a UC Berkeley student organization.
            </p>

            {/* The one instruction people must follow */}
            <div className="mt-6 rounded-xl border border-marigold/40 bg-marigold-soft/10 p-4">
              <p className="text-sm text-paper/90">
                On the payment page, under{" "}
                <span className="font-semibold">“Student Organization”</span>, be sure to
                type{" "}
                <span className="font-display text-base font-semibold text-marigold-soft">
                  Project RISHI
                </span>{" "}
                so your gift reaches us.
              </p>
            </div>

            <a
              href={STRIPE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-marigold px-6 py-3.5 font-semibold text-pine-deep transition-[background-color,color] duration-200 hover:bg-marigold-deep hover:text-paper"
            >
              Donate now
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 17L17 7M9 7h8v8" className="transition-transform duration-200 group-hover:-translate-y-px group-hover:translate-x-px" />
              </svg>
            </a>
          </div>

          {/* Secondary option */}
          <p className="mt-6 text-sm leading-relaxed text-paper/65">
            Prefer another way to give, or giving on behalf of an organization?{" "}
            <a
              href={`mailto:${ORG.email}`}
              className="font-medium text-paper underline decoration-marigold/60 underline-offset-4 hover:text-marigold-soft"
            >
              Reach out about other options
            </a>
            .
          </p>
        </Reveal>
      </div>
    </section>
  );
}

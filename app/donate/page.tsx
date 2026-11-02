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
      <div className="container-rishi relative z-10 grid min-h-[70vh] place-items-center py-20 text-center">
        <Reveal className="max-w-2xl">
          <span className="eyebrow text-marigold-soft">
            Support our work
          </span>
          <h1 className="mt-4 font-display text-5xl font-medium leading-[1.04] tracking-[-0.02em] sm:text-6xl">
            Every gift reaches the village
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-paper/80">
            We appreciate donations of all sizes. They keep us running as an
            organization and directly support our projects in Bharog Baneri.
          </p>
        </Reveal>

        {/* Stripe donation block */}
        <Reveal delay={0.12} className="mt-12 w-full max-w-xl">
          <div className="rounded-2xl border border-paper/15 bg-paper/[0.06] p-8 text-left">
            <p className="font-display text-2xl font-medium text-paper">Donate online</p>
            <p className="mt-2 text-sm leading-relaxed text-paper/70">
              Give securely by card in a few taps. Donations are processed through
              the ASUC (Associated Students of the University of California), which
              sponsors us as a UC Berkeley student organization.
            </p>

            {/* The one instruction people must follow */}
            <div className="mt-5 rounded-xl border border-marigold-soft/30 bg-marigold-soft/10 p-4">
              <p className="text-sm text-paper/90">
                On the payment page, under{" "}
                <span className="font-semibold">“Student Organization”</span>, be sure to
                type{" "}
                <span className="font-medium text-marigold-soft">
                  Project RISHI
                </span>{" "}
                so your gift reaches us.
              </p>
            </div>

            <a
              href={STRIPE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-accent mt-6 w-full"
            >
              Donate now
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 17L17 7M9 7h8v8" />
              </svg>
            </a>
          </div>

          {/* Secondary option */}
          <p className="mt-8 text-center text-sm text-paper/60">
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

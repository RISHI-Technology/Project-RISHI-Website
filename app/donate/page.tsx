import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { ORG } from "@/lib/content";

export const metadata: Metadata = {
  title: "Donate",
  description: "Support Project RISHI's work in Bharog Baneri.",
};

const STRIPE_URL = "https://donate.stripe.com/6oEeYJ5CX6Ay5a03cl";

export default function DonatePage() {
  return (
    <div className="site">
      <section className="a-glow pb-[var(--a-section)] pt-[calc(var(--header-h)+clamp(3.5rem,8vw,6.5rem))]">
        <div className="a-wrap text-center">
          <p className="hero-rise a-eyebrow">Support our work</p>
          <h1 style={{ "--i": 1 } as CSSProperties} className="hero-rise a-display mx-auto mt-3 max-w-[13ch]">
            Every gift reaches the village.
          </h1>
          <p style={{ "--i": 2 } as CSSProperties} className="hero-rise a-lead mx-auto mt-5 max-w-2xl text-label-2">
            We appreciate donations of all sizes — they keep us running as an
            organization and directly support our projects in Bharog Baneri.
          </p>
        </div>

        {/* Stripe donation block */}
        <div style={{ "--i": 3 } as CSSProperties} className="hero-rise a-wrap mt-[clamp(3rem,6vw,4.5rem)] max-w-[44rem]">
          <div className="a-tile p-[clamp(1.75rem,4vw,3rem)] shadow-[0_30px_60px_-30px_rgb(var(--a-label)/0.25)]">
            <p className="a-title2">Donate online</p>
            <p className="a-body mt-3 text-label-2">
              Give securely by card in a few taps. Donations are processed through
              the ASUC (Associated Students of the University of California), which
              sponsors us as a UC Berkeley student organization.
            </p>

            {/* The one instruction people must follow */}
            <div className="mt-6 rounded-[var(--a-r-md)] bg-marigold/15 p-5">
              <p className="a-body">
                On the payment page, under{" "}
                <span className="font-semibold">“Student Organization”</span>, be sure to
                type{" "}
                <span className="font-bold text-pine">
                  Project RISHI
                </span>{" "}
                so your gift reaches us.
              </p>
            </div>

            <a
              href={STRIPE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="a-btn a-btn-primary mt-7 min-h-[52px] w-full text-[1.1875rem]"
            >
              Donate now
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 17L17 7M9 7h8v8" />
              </svg>
            </a>
          </div>

          {/* Secondary option */}
          <p className="a-callout mt-6 text-center text-label-2">
            Prefer another way to give, or giving on behalf of an organization?{" "}
            <a href={`mailto:${ORG.email}`} className="a-link font-medium">
              Reach out about other options
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import SiteLabel from "@/components/SiteLabel";
import { ORG } from "@/lib/content";

export const metadata: Metadata = {
  title: "Donate",
  description: "Support Project RISHI's work in Bharog Baneri.",
};

const STRIPE_URL = "https://donate.stripe.com/6oEeYJ5CX6Ay5a03cl";

export default function DonatePage() {
  return (
    <div className="site">
      <section className="pt-[var(--header-h)]">
        <div className="s-container grid min-h-[70vh] gap-12 py-[clamp(3.5rem,7vw,6rem)] lg:grid-cols-12 lg:items-center lg:gap-x-16">
          <div className="lg:col-span-6">
            <SiteLabel>Support our work</SiteLabel>
            <h1 className="t-display mt-7 max-w-[14ch] text-deodar">Every gift reaches the village.</h1>
            <p className="t-lead mt-6 max-w-lg text-graphite/80">
              We appreciate donations of all sizes — they keep us running as an
              organization and directly support our projects in Bharog Baneri.
            </p>
          </div>

          {/* Stripe donation block */}
          <div className="lg:col-span-6">
            <div className="rounded-[var(--r-media)] border border-graphite/15 bg-snow p-[clamp(1.75rem,3.5vw,2.75rem)] shadow-[0_24px_60px_-32px_rgb(var(--c-graphite)/0.35)]">
              <h2 className="t-h3 text-deodar">Donate online</h2>
              <p className="t-small mt-3 text-graphite/80">
                Give securely by card in a few taps. Donations are processed through
                the ASUC (Associated Students of the University of California), which
                sponsors us as a UC Berkeley student organization.
              </p>

              {/* The one instruction people must follow */}
              <div className="mt-6 rounded-[var(--r-control)] bg-saffron/15 p-4">
                <p className="t-small text-graphite">
                  On the payment page, under{" "}
                  <span className="font-semibold">“Student Organization”</span>, be sure to
                  type{" "}
                  <span className="font-display text-[1.0625rem] font-semibold text-deodar">
                    Project RISHI
                  </span>{" "}
                  so your gift reaches us.
                </p>
              </div>

              <a
                href={STRIPE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="s-btn s-btn-primary mt-7 w-full"
              >
                Donate now
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7 17L17 7M9 7h8v8" />
                </svg>
              </a>
            </div>

            {/* Secondary option */}
            <p className="t-small mt-6 text-stone">
              Prefer another way to give, or giving on behalf of an organization?{" "}
              <a href={`mailto:${ORG.email}`} className="s-link font-medium">
                Reach out about other options
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

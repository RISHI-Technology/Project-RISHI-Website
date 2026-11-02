import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { ArrowUpRight } from "@/components/site/Icons";
import { ORG, LINKS } from "@/lib/content";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Project RISHI at UC Berkeley.",
};

export default function ContactPage() {
  return (
    <div className="site">
      <section className="a-glow pb-[var(--a-section)] pt-[calc(var(--header-h)+clamp(3.5rem,8vw,6.5rem))]">
        <div className="a-wrap text-center">
          <p className="hero-rise a-eyebrow">Contact</p>
          <h1 style={{ "--i": 1 } as CSSProperties} className="hero-rise a-display mt-3">
            Let&rsquo;s talk.
          </h1>
          <p style={{ "--i": 2 } as CSSProperties} className="hero-rise a-lead mx-auto mt-5 max-w-xl text-label-2">
            Questions about our work or partnerships? Reach out
            — we&rsquo;d love to hear from you.
          </p>
          <div style={{ "--i": 3 } as CSSProperties} className="hero-rise mt-8">
            <a href={`mailto:${ORG.email}`} className="a-btn a-btn-primary">
              Email us
            </a>
          </div>
        </div>

        <dl style={{ "--i": 4 } as CSSProperties} className="hero-rise a-wrap mt-[clamp(3.5rem,7vw,5.5rem)] grid gap-5 md:grid-cols-3">
          <div className="a-tile p-8">
            <dt className="a-callout font-semibold text-label-2">General inquiries</dt>
            <dd className="mt-3">
              <a href={`mailto:${ORG.email}`} className="a-title3 break-words text-pine underline-offset-[0.18em] hover:underline">
                {ORG.email}
              </a>
            </dd>
          </div>
          <div className="a-tile p-8">
            <dt className="a-callout font-semibold text-label-2">Find us</dt>
            <dd className="a-title3 mt-3">{ORG.address}</dd>
          </div>
          <div className="a-tile p-8">
            <dt className="a-callout font-semibold text-label-2">Socials</dt>
            <dd className="mt-2 flex flex-wrap gap-x-6">
              <a href={LINKS.instagram} target="_blank" rel="noopener noreferrer" className="a-more a-title3">
                <span>Instagram</span>
                <ArrowUpRight />
              </a>
              <a href={LINKS.facebook} target="_blank" rel="noopener noreferrer" className="a-more a-title3">
                <span>Facebook</span>
                <ArrowUpRight />
              </a>
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

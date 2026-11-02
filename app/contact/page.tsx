import type { Metadata } from "next";
import SiteLabel from "@/components/SiteLabel";
import { ORG, LINKS } from "@/lib/content";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Project RISHI at UC Berkeley.",
};

export default function ContactPage() {
  return (
    <div className="site">
      <section className="pt-[var(--header-h)]">
        <div className="s-container grid min-h-[70vh] gap-12 py-[clamp(3.5rem,7vw,6rem)] lg:grid-cols-12 lg:items-center lg:gap-x-16">
          <div className="lg:col-span-6">
            <SiteLabel>Contact</SiteLabel>
            <h1 className="t-display mt-7 text-deodar">Let&rsquo;s talk.</h1>
            <p className="t-lead mt-6 max-w-md text-graphite/80">
              Questions about our work or partnerships? Reach out
              — we&rsquo;d love to hear from you.
            </p>
            <a href={`mailto:${ORG.email}`} className="s-btn s-btn-primary mt-9">
              Email us
            </a>
          </div>

          <dl className="s-dark rounded-[var(--r-media)] bg-deodar p-[clamp(1.75rem,3.5vw,3rem)] text-snow lg:col-span-6">
            <div className="border-b border-snow/15 pb-7">
              <dt className="t-label text-snow/70">General inquiries</dt>
              <dd className="mt-2">
                <a href={`mailto:${ORG.email}`} className="t-h3 break-words underline decoration-snow/30 decoration-1 underline-offset-[0.2em] transition-colors hover:decoration-saffron">
                  {ORG.email}
                </a>
              </dd>
            </div>
            <div className="border-b border-snow/15 py-7">
              <dt className="t-label text-snow/70">Find us</dt>
              <dd className="t-lead mt-2 text-snow/90">{ORG.address}</dd>
            </div>
            <div className="pt-7">
              <dt className="t-label text-snow/70">Socials</dt>
              <dd className="t-lead mt-2 flex gap-6">
                <a href={LINKS.instagram} target="_blank" rel="noopener noreferrer" className="s-link">
                  Instagram
                </a>
                <a href={LINKS.facebook} target="_blank" rel="noopener noreferrer" className="s-link">
                  Facebook
                </a>
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );
}

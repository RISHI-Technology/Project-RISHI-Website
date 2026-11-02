import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import Contours from "@/components/Contours";
import { ORG, LINKS } from "@/lib/content";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Project RISHI at UC Berkeley.",
};

export default function ContactPage() {
  return (
    <section className="relative overflow-hidden bg-pine pt-[var(--header-h)] text-paper">
      <Contours className="absolute inset-0 h-full w-full text-paper" opacity={0.1} />
      <div className="container-rishi relative z-10 grid min-h-[70vh] gap-14 pb-20 pt-16 lg:grid-cols-12 lg:items-center lg:pb-28 lg:pt-24">
        <Reveal className="lg:col-span-6">
          <span className="inline-flex items-center gap-3 text-sm font-medium text-paper/75">
            <span className="h-px w-6 bg-marigold" />
            Contact
          </span>
          <h1 className="mt-7 font-display text-5xl font-semibold leading-[1.02] sm:text-6xl lg:text-7xl">
            Let&rsquo;s talk.
          </h1>
          <p className="mt-6 max-w-md text-lg text-paper/80">
            Questions about our work or partnerships? Reach out
            — we&rsquo;d love to hear from you.
          </p>
          <a href={`mailto:${ORG.email}`} className="btn-accent mt-9">
            Email us
          </a>
        </Reveal>

        <Reveal delay={0.12} className="lg:col-span-5 lg:col-start-8">
          <div className="space-y-6 border-t-2 border-marigold/70 pt-7">
            <div>
              <p className="text-sm font-medium text-paper/70">General inquiries</p>
              <a href={`mailto:${ORG.email}`} className="mt-1.5 block break-words font-display text-2xl font-semibold text-paper underline-offset-4 hover:underline">
                {ORG.email}
              </a>
            </div>
            <div className="h-px bg-paper/15" />
            <div>
              <p className="text-sm font-medium text-paper/70">Find us</p>
              <p className="mt-1.5 text-lg text-paper/85">{ORG.address}</p>
            </div>
            <div className="h-px bg-paper/15" />
            <div>
              <p className="text-sm font-medium text-paper/70">Socials</p>
              <div className="mt-2 flex gap-6">
                <a href={LINKS.instagram} target="_blank" rel="noopener noreferrer" className="text-lg text-paper/85 underline-offset-4 hover:text-paper hover:underline">
                  Instagram
                </a>
                <a href={LINKS.facebook} target="_blank" rel="noopener noreferrer" className="text-lg text-paper/85 underline-offset-4 hover:text-paper hover:underline">
                  Facebook
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

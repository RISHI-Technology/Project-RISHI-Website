import type { Metadata } from "next";
import Link from "next/link";
import Media from "@/components/Media";
import SectionHeading from "@/components/SectionHeading";
import SiteLabel from "@/components/SiteLabel";
import PhotoWall from "@/components/PhotoWall";
import { ABOUT, LINKS } from "@/lib/content";

export const metadata: Metadata = {
  title: "About",
  description:
    "Project RISHI is a student-run non-profit working with the village of Bharog Baneri, Himachal Pradesh.",
};

const ExternalArrow = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M7 17 17 7M9 7h8v8" />
  </svg>
);

export default function AboutPage() {
  return (
    <div className="site">
      {/* Hero */}
      <section className="border-b border-graphite/10 pt-[var(--header-h)]">
        <div className="s-container pb-[clamp(3.5rem,7vw,6rem)] pt-[clamp(3.5rem,7vw,6rem)]">
          <SiteLabel>About Us</SiteLabel>
          <h1 className="t-display mt-7 max-w-[18ch] text-deodar">{ABOUT.heading}</h1>
        </div>
      </section>

      {/* Mission + Methodology */}
      <section className="s-section">
        <div className="s-container grid gap-14 lg:grid-cols-12 lg:gap-x-16">
          <div className="lg:col-span-6">
            <SectionHeading eyebrow="What drives us" title={ABOUT.mission.title} />
            <p className="t-lead mt-6 text-graphite/80">{ABOUT.mission.body}</p>
            <Link href="/projects" className="s-btn s-btn-dark mt-10">
              Explore our teams
            </Link>
          </div>

          <div className="lg:col-span-5 lg:col-start-8">
            <div className="border-t-[3px] border-deodar pt-6">
              <h3 className="t-h3 text-deodar">{ABOUT.methodology.title}</h3>
              <ol className="mt-5">
                {ABOUT.methodology.steps.map((step, i) => (
                  <li key={step} className="flex items-baseline gap-5 border-b border-graphite/10 py-4">
                    <span className="t-label t-num w-6 shrink-0 text-deodar">{i + 1}</span>
                    <span className="t-h3 text-graphite">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* History + Location */}
      <section className="s-dark s-section bg-deodar text-snow">
        <div className="s-container grid gap-14 lg:grid-cols-2 lg:gap-20">
          <div>
            <h2 className="t-h2">{ABOUT.history.title}</h2>
            <p className="t-lead mt-6 text-snow/85">{ABOUT.history.body}</p>
          </div>
          <div>
            <h2 className="t-h2">{ABOUT.location.title}</h2>
            <p className="t-lead mt-6 text-snow/85">{ABOUT.location.body}</p>
          </div>
        </div>
      </section>

      {/* Our Team */}
      <section className="pt-[var(--space-section)]">
        <div className="s-container">
          <SectionHeading eyebrow="The people" title="Our Team" />
          <Media
            src={ABOUT.teamImage}
            alt="The Project RISHI Berkeley team"
            label="Team group photo"
            className="mt-[var(--space-block)] aspect-[3/2] w-full"
            rounded="rounded-[var(--r-media)]"
            sizes="100vw"
          />
        </div>
      </section>

      {/* Life at Project RISHI — gallery */}
      <section className="s-section">
        <div className="s-container">
          <SectionHeading eyebrow="In Action" title="Life at Project RISHI" />
          <PhotoWall images={ABOUT.gallery.filter(Boolean) as string[]} />
        </div>
      </section>

      {/* Chapters around the country */}
      <section className="s-section bg-mist">
        <div className="s-container">
          <SectionHeading eyebrow="A national network" title="Chapters around the country" />
          <ul className="mt-[var(--space-block)] grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
            {ABOUT.chapters.map((c) => (
              <li key={c.name}>
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between gap-4 border-t border-graphite/15 py-4 text-graphite transition-colors duration-150 hover:text-deodar"
                >
                  <span className="font-medium decoration-1 underline-offset-[0.2em] group-hover:underline">{c.name}</span>
                  <ExternalArrow className="h-4 w-4 shrink-0 text-stone transition-[color,transform] duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-deodar" />
                </a>
              </li>
            ))}
          </ul>

          {/* Standout link to the national organization */}
          <a
            href={LINKS.nationalSite}
            target="_blank"
            rel="noopener noreferrer"
            className="group s-dark mt-10 flex items-center justify-between gap-6 rounded-[var(--r-media)] bg-deodar px-[clamp(1.5rem,3vw,2.5rem)] py-7 text-snow transition-colors duration-150 hover:bg-deodar-deep"
          >
            <span className="t-h3">Visit the National Project RISHI Webpage</span>
            <ExternalArrow className="h-6 w-6 shrink-0 text-saffron transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
        </div>
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import Media from "@/components/Media";
import Contours from "@/components/Contours";
import SectionHeading from "@/components/SectionHeading";
import PhotoWall from "@/components/PhotoWall";
import { ABOUT, LINKS } from "@/lib/content";

export const metadata: Metadata = {
  title: "About",
  description:
    "Project RISHI is a student-run non-profit working with the village of Bharog Baneri, Himachal Pradesh.",
};

const ExternalArrow = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M7 17 17 7M9 7h8v8" />
  </svg>
);

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-pine pt-[var(--header-h)] text-paper">
        <Contours className="absolute inset-0 h-full w-full text-paper" opacity={0.12} />
        <div className="container-rishi relative z-10 py-20 lg:py-24">
          <p className="eyebrow text-marigold-soft">About us</p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl font-medium leading-[1.04] tracking-[-0.02em] sm:text-6xl">
            {ABOUT.heading}
          </h1>
        </div>
      </section>

      {/* Mission + Methodology */}
      <section className="container-rishi py-20">
        <div className="grid gap-14 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <SectionHeading title={ABOUT.mission.title} />
            <p className="mt-6 text-lg leading-relaxed text-ink/75">
              {ABOUT.mission.body}
            </p>
            <Link href="/projects" className="btn-primary mt-8">
              Explore our teams
            </Link>
          </div>

          <div className="rounded-2xl border border-pine/10 bg-pine/[0.03] p-8">
            <p className="eyebrow text-ink/70">{ABOUT.methodology.title}</p>
            <ol className="mt-6 divide-y divide-pine/10">
              {ABOUT.methodology.steps.map((step, i) => (
                <li key={step} className="flex items-baseline gap-4 py-3 first:pt-0 last:pb-0">
                  <span className="w-4 shrink-0 font-mono text-sm tabular-nums text-ink/60">
                    {i + 1}
                  </span>
                  <span className="font-display text-xl font-medium text-pine-deep">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* History + Location */}
      <section className="bg-pine-deep py-20 text-paper">
        <div className="container-rishi grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl font-medium">{ABOUT.history.title}</h2>
            <p className="mt-4 text-lg leading-relaxed text-paper/80">
              {ABOUT.history.body}
            </p>
          </div>
          <div>
            <h2 className="font-display text-2xl font-medium">{ABOUT.location.title}</h2>
            <p className="mt-4 text-lg leading-relaxed text-paper/80">
              {ABOUT.location.body}
            </p>
          </div>
        </div>
      </section>

      {/* Our Team */}
      <section className="container-rishi py-20">
        <SectionHeading title="Our team" />
        <Media
          src={ABOUT.teamImage}
          alt="The Project RISHI Berkeley team"
          label="Team group photo"
          className="mt-8 aspect-[3/2] w-full"
          rounded="rounded-2xl"
          sizes="100vw"
        />
      </section>

      {/* Life at Project RISHI — gallery */}
      <section className="container-rishi pb-20">
        <SectionHeading title="Life at Project RISHI" />
        <PhotoWall images={ABOUT.gallery.filter(Boolean) as string[]} />
      </section>

      {/* Chapters around the country */}
      <section className="border-t border-pine/10 bg-marigold/[0.07] py-20">
        <div className="container-rishi">
          <SectionHeading title="Chapters around the country" />
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {ABOUT.chapters.map((c) => (
              <a
                key={c.name}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between gap-3 rounded-xl border border-pine/10 bg-paper px-4 py-3 transition-colors duration-150 hover:border-pine/30"
              >
                <span className="text-sm font-medium text-ink/85">{c.name}</span>
                <ExternalArrow className="h-4 w-4 shrink-0 text-ink/40 transition-colors duration-150 group-hover:text-pine" />
              </a>
            ))}
          </div>

          {/* The national organization */}
          <a
            href={LINKS.nationalSite}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-6 flex items-center justify-between gap-4 rounded-2xl bg-pine px-6 py-5 text-paper transition-colors duration-150 hover:bg-pine-deep sm:px-8"
          >
            <span className="font-display text-xl font-medium">
              Visit the national Project RISHI site
            </span>
            <ExternalArrow className="h-5 w-5 shrink-0 text-paper/70 transition-colors duration-150 group-hover:text-marigold-soft" />
          </a>
        </div>
      </section>
    </>
  );
}

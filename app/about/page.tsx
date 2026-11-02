import type { Metadata } from "next";
import Link from "next/link";
import Media from "@/components/Media";
import Reveal from "@/components/Reveal";
import Contours from "@/components/Contours";
import SectionHeading from "@/components/SectionHeading";
import PhotoWall from "@/components/PhotoWall";
import { ABOUT, LINKS } from "@/lib/content";

export const metadata: Metadata = {
  title: "About",
  description:
    "Project RISHI is a student-run non-profit working with the village of Bharog Baneri, Himachal Pradesh.",
};

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-pine pt-[var(--header-h)] text-paper">
        <Contours className="absolute inset-0 h-full w-full text-paper" opacity={0.12} />
        <div className="container-rishi relative z-10 pb-20 pt-16 lg:pb-28 lg:pt-24">
          <Reveal>
            <span className="inline-flex items-center gap-3 text-sm font-medium text-paper/75">
              <span className="h-px w-6 bg-marigold" />
              About Us
            </span>
            <h1 className="mt-7 max-w-4xl font-display text-5xl font-semibold leading-[1.02] sm:text-6xl lg:text-7xl">
              {ABOUT.heading}
            </h1>
          </Reveal>
        </div>
      </section>

      {/* Mission + Methodology */}
      <section className="container-rishi py-20 lg:py-28">
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <SectionHeading eyebrow="What drives us" title={ABOUT.mission.title} />
            <Reveal delay={0.1}>
              <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-ink/75">
                {ABOUT.mission.body}
              </p>
              <Link href="/projects" className="btn-primary mt-8">
                Explore our teams
              </Link>
            </Reveal>
          </div>

          <Reveal delay={0.15} className="lg:col-span-5 lg:col-start-8">
            <div className="border-t-2 border-pine pt-6">
              <h3 className="font-display text-xl font-semibold text-pine-deep">{ABOUT.methodology.title}</h3>
              <ol className="mt-4">
                {ABOUT.methodology.steps.map((step, i) => (
                  <li key={step} className="flex items-baseline gap-5 border-b border-pine/15 py-3.5">
                    <span className="w-5 shrink-0 text-sm font-semibold tabular-nums text-marigold-ink">
                      {i + 1}
                    </span>
                    <span className="font-display text-xl font-semibold text-pine-deep">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </Reveal>
        </div>
      </section>

      {/* History + Location */}
      <section className="bg-pine-deep py-20 text-paper lg:py-28">
        <div className="container-rishi grid gap-14 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">
              <span className="mb-6 block h-px w-8 bg-marigold" />
              {ABOUT.history.title}
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-paper/80">
              {ABOUT.history.body}
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">
              <span className="mb-6 block h-px w-8 bg-marigold" />
              {ABOUT.location.title}
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-paper/80">
              {ABOUT.location.body}
            </p>
          </Reveal>
        </div>
      </section>

      {/* Our Team */}
      <section className="container-rishi pt-20 lg:pt-28">
        <SectionHeading eyebrow="The people" title="Our Team" />
        <Reveal delay={0.1}>
          <Media
            src={ABOUT.teamImage}
            alt="The Project RISHI Berkeley team"
            label="Team group photo"
            className="mt-10 aspect-[3/2] w-full"
            rounded="rounded-2xl"
            sizes="100vw"
          />
        </Reveal>
      </section>

      {/* Life at Project RISHI — gallery */}
      <section className="container-rishi py-20 lg:py-28">
        <SectionHeading eyebrow="In Action" title="Life at Project RISHI" />
        <Reveal delay={0.1}>
          <PhotoWall images={ABOUT.gallery.filter(Boolean) as string[]} />
        </Reveal>
      </section>

      {/* Chapters around the country */}
      <section className="bg-marigold/10 py-20 lg:py-28">
        <div className="container-rishi">
          <SectionHeading eyebrow="A national network" title="Chapters around the country" />
          <div className="mt-10 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
            {ABOUT.chapters.map((c, i) => (
              <Reveal key={c.name} delay={(i % 4) * 0.05}>
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between gap-4 border-t border-pine/15 py-4 text-pine-deep transition-colors hover:text-pine"
                >
                  <span className="text-[15px] font-medium underline-offset-4 group-hover:underline">{c.name}</span>
                  <svg
                    className="h-4 w-4 shrink-0 opacity-40 transition-[opacity,transform] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M7 17 17 7M9 7h8v8" />
                  </svg>
                </a>
              </Reveal>
            ))}
          </div>

          {/* Standout link to the national organization */}
          <Reveal delay={0.1}>
            <a
              href={LINKS.nationalSite}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-10 flex items-center justify-between gap-6 rounded-2xl bg-pine px-8 py-6 text-paper transition-colors duration-200 hover:bg-pine-deep"
            >
              <span className="font-display text-xl font-semibold">
                Visit the National Project RISHI Webpage
              </span>
              <svg
                className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M7 17 17 7M9 7h8v8" />
              </svg>
            </a>
          </Reveal>
        </div>
      </section>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import Media from "@/components/Media";
import SectionHeading from "@/components/SectionHeading";
import PhotoWall from "@/components/PhotoWall";
import { ArrowUpRight } from "@/components/site/Icons";
import { ABOUT, LINKS } from "@/lib/content";

export const metadata: Metadata = {
  title: "About",
  description:
    "Project RISHI is a student-run non-profit working with the village of Bharog Baneri, Himachal Pradesh.",
};

export default function AboutPage() {
  return (
    <div className="site">
      {/* Hero */}
      <section className="a-glow pb-[clamp(4rem,8vw,7rem)] pt-[calc(var(--header-h)+clamp(3.5rem,8vw,6.5rem))]">
        <div className="a-wrap text-center">
          <p className="hero-rise a-eyebrow">About Us</p>
          <h1 style={{ "--i": 1 } as React.CSSProperties} className="hero-rise a-display mx-auto mt-3 max-w-[16ch]">
            {ABOUT.heading}
          </h1>
        </div>
      </section>

      {/* Mission + Methodology */}
      <section className="pb-[var(--a-section)]">
        <div className="a-wrap grid gap-5 lg:grid-cols-5">
          <div className="a-reveal a-tile flex flex-col items-start p-[clamp(2rem,4vw,3.5rem)] lg:col-span-3">
            <SectionHeading eyebrow="What drives us" title={ABOUT.mission.title} />
            <p className="a-lead mb-10 mt-5 text-label-2">{ABOUT.mission.body}</p>
            <Link href="/projects" className="a-btn a-btn-pine mt-auto">
              Explore our teams
            </Link>
          </div>

          <div className="a-reveal a-tile-dark a-band-dark p-[clamp(2rem,4vw,3.5rem)] lg:col-span-2">
            <h3 className="a-title2">{ABOUT.methodology.title}</h3>
            <ol className="mt-6">
              {ABOUT.methodology.steps.map((step, i) => (
                <li key={step} className="flex items-center gap-4 border-t border-white/10 py-3.5 first:border-t-0">
                  <span className="a-num grid h-9 w-9 shrink-0 place-items-center rounded-full bg-marigold text-[0.875rem] font-semibold text-label">
                    {i + 1}
                  </span>
                  <span className="a-title3">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* History + Location */}
      <section className="a-on-dark a-band-dark py-[var(--a-section)]">
        <div className="a-wrap grid gap-x-16 gap-y-14 lg:grid-cols-2">
          <div className="a-reveal">
            <h2 className="a-headline">{ABOUT.history.title}</h2>
            <p className="a-lead mt-5 text-white/75">{ABOUT.history.body}</p>
          </div>
          <div className="a-reveal">
            <h2 className="a-headline">{ABOUT.location.title}</h2>
            <p className="a-lead mt-5 text-white/75">{ABOUT.location.body}</p>
          </div>
        </div>
      </section>

      {/* Our Team */}
      <section className="pt-[var(--a-section)]">
        <div className="a-wrap">
          <div className="a-reveal text-center">
            <SectionHeading eyebrow="The people" title="Our Team" align="center" />
          </div>
          <div className="a-reveal mt-12">
            <Media
              src={ABOUT.teamImage}
              alt="The Project RISHI Berkeley team"
              label="Team group photo"
              className="aspect-[3/2] w-full"
              rounded="rounded-[var(--a-r-lg)]"
              sizes="100vw"
            />
          </div>
        </div>
      </section>

      {/* Life at Project RISHI — gallery */}
      <section className="py-[var(--a-section)]">
        <div className="a-wrap">
          <div className="a-reveal text-center">
            <SectionHeading eyebrow="In Action" title="Life at Project RISHI" align="center" />
          </div>
          <div className="mt-4">
            <PhotoWall images={ABOUT.gallery.filter(Boolean) as string[]} />
          </div>
        </div>
      </section>

      {/* Chapters around the country */}
      <section className="bg-sand py-[var(--a-section)]">
        <div className="a-wrap">
          <div className="a-reveal text-center">
            <SectionHeading eyebrow="A national network" title="Chapters around the country" align="center" />
          </div>
          <div className="a-reveal a-tile mt-12 p-3 sm:p-4">
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3">
              {ABOUT.chapters.map((c) => (
                <li key={c.name}>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex min-h-[52px] items-center justify-between gap-4 rounded-[var(--a-r-sm)] px-4 transition-colors duration-150 hover:bg-label/[0.04] active:bg-label/[0.08]"
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-label-2 transition-[color,transform] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-pine">
                      <ArrowUpRight />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Standout link to the national organization */}
          <div className="a-reveal mt-8 text-center">
            <a
              href={LINKS.nationalSite}
              target="_blank"
              rel="noopener noreferrer"
              className="a-btn a-btn-pine min-h-[52px] whitespace-normal px-7 py-3 text-center leading-snug"
            >
              Visit the National Project RISHI Webpage
              <ArrowUpRight />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

import Link from "next/link";
import type { CSSProperties } from "react";
import Media from "@/components/Media";
import SectionHeading from "@/components/SectionHeading";
import ScrollWindow from "@/components/site/ScrollWindow";
import { Chevron } from "@/components/site/Icons";
import { PROJECTS, LINKS } from "@/lib/content";

type Project = (typeof PROJECTS)[number];

export default function ProjectPage({ project }: { project: Project }) {
  const others = PROJECTS.filter((p) => p.slug !== project.slug);
  const heroImage = (project as { heroImage?: string | null }).heroImage ?? null;

  return (
    <article className="site">
      {/* Hero */}
      <section className="a-glow pb-[var(--a-section)] pt-[calc(var(--header-h)+clamp(3.5rem,8vw,6.5rem))]">
        <div className="a-wrap text-center">
          <p className="hero-rise a-eyebrow">Project Team</p>
          <h1 style={{ "--i": 1 } as CSSProperties} className="hero-rise a-display mt-3">{project.name}</h1>
          <p style={{ "--i": 2 } as CSSProperties} className="hero-rise a-body mx-auto mt-6 max-w-3xl text-[1.1875rem] text-label-2">
            {project.intro}
          </p>
        </div>
        <div style={{ "--i": 3 } as CSSProperties} className="hero-rise mt-[clamp(3rem,6vw,4.5rem)]">
          {heroImage ? (
            <ScrollWindow
              src={heroImage}
              alt={`${project.name} team in Bharog Baneri`}
              priority
              className="aspect-[4/3] sm:aspect-[16/9]"
              objectPosition="50% 35%"
              from={0.92}
            />
          ) : (
            <div className="a-wrap">
              <Media
                src={null}
                alt={`${project.name} team in Bharog Baneri`}
                label={`${project.name} hero photo`}
                className="aspect-[16/9] w-full"
                rounded="rounded-[var(--a-r-lg)]"
              />
            </div>
          )}
        </div>
      </section>

      {/* Quote */}
      {project.quote && (
        <section className="mb-[var(--a-section)] bg-sand py-[var(--a-section)]">
          <figure className="a-reveal a-wrap max-w-[60rem] text-center">
            <blockquote className="a-headline text-pine">
              &ldquo;{project.quote}&rdquo;
            </blockquote>
            {project.quoteAuthor && (
              <figcaption className="a-lead mt-6 text-label-2">
                — {project.quoteAuthor}
              </figcaption>
            )}
          </figure>
        </section>
      )}

      {/* Highlights */}
      <section className="pb-[var(--a-section)]">
        <div className="a-wrap">
          <div className="a-reveal">
            <SectionHeading eyebrow="This term" title="Project Highlights" />
          </div>
          <div
            className={`mt-12 grid gap-5 ${
              project.highlights.length === 3 ? "lg:grid-cols-3" : "md:grid-cols-2"
            }`}
          >
            {project.highlights.map((h) => (
              <article key={h.title} className="a-reveal a-tile flex flex-col">
                <Media
                  src={h.image}
                  alt={h.title}
                  label={`${h.title} photo`}
                  className="aspect-[4/3] w-full"
                  rounded="rounded-none"
                />
                <div className="p-[clamp(1.5rem,2.5vw,2rem)]">
                  <h3 className="a-title3">{h.title}</h3>
                  <p className="a-callout mt-3 text-label-2">{h.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Past projects */}
      <section className="a-on-dark a-band-dark py-[var(--a-section)]">
        <div className="a-wrap">
          <div className="a-reveal">
            <SectionHeading eyebrow="Our track record" title="Past Projects" accent="pine" tone="dark" />
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {project.past.map((p, i) => (
              <div key={p.title} className="a-reveal a-tile-dark p-[clamp(1.75rem,3vw,2.5rem)]">
                <span className="a-num a-caption font-semibold text-marigold">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="a-title3 mt-3">{p.title}</h3>
                <p className="a-callout mt-3 text-white/70">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA + other projects */}
      <section className="py-[var(--a-section)]">
        <div className="a-wrap">
          <div className="a-reveal rounded-[var(--a-r-lg)] bg-marigold px-[clamp(1.75rem,5vw,4rem)] py-[clamp(3rem,6vw,5rem)] text-center text-label">
            <h2 className="a-headline mx-auto max-w-[18ch]">Want to work on {project.name}?</h2>
            <p className="a-lead mx-auto mt-4 max-w-xl">
              We recruit at the start of every Fall and Spring semester. Come find
              your team.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link href="/apply" className="a-btn a-btn-pine">
                Apply to join
              </Link>
              <a href={LINKS.donate} className="a-btn bg-white/40 text-label hover:bg-white/60">
                Support our work
              </a>
            </div>
          </div>

          <div className="mt-16">
            <p className="a-eyebrow">Other teams</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {others.map((o) => (
                <Link
                  key={o.slug}
                  href={`/projects/${o.slug}`}
                  className="a-press a-tile group flex min-h-[72px] items-center justify-between gap-4 px-6"
                >
                  <span className="a-title3">{o.name}</span>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-label/[0.06] text-label transition-colors duration-150 group-hover:bg-pine group-hover:text-white">
                    <Chevron className="h-4 w-4" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </article>
  );
}

import Link from "next/link";
import Media from "@/components/Media";
import SectionHeading from "@/components/SectionHeading";
import SiteLabel from "@/components/SiteLabel";
import { PROJECTS, LINKS } from "@/lib/content";

type Project = (typeof PROJECTS)[number];

const Arrow = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default function ProjectPage({ project }: { project: Project }) {
  const others = PROJECTS.filter((p) => p.slug !== project.slug);

  return (
    <article className="site">
      {/* Hero */}
      <section className="border-b border-graphite/10 pt-[var(--header-h)]">
        <div className="s-container grid gap-12 pb-[clamp(3.5rem,6vw,5.5rem)] pt-[clamp(3rem,6vw,5rem)] lg:grid-cols-12 lg:items-center lg:gap-x-16">
          <div className="lg:col-span-6">
            <SiteLabel>Project Team</SiteLabel>
            <h1 className="t-display mt-7 text-deodar">{project.name}</h1>
            <p className="mt-6 max-w-[38rem] text-graphite/80">{project.intro}</p>
          </div>
          <div className="lg:col-span-6">
            <Media
              src={(project as { heroImage?: string | null }).heroImage ?? null}
              alt={`${project.name} team in Bharog Baneri`}
              label={`${project.name} hero photo`}
              className="aspect-[4/3] w-full"
              rounded="rounded-[var(--r-media)]"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      {/* Quote */}
      {project.quote && (
        <section className="bg-mist">
          <div className="s-container py-[clamp(4rem,7vw,6rem)]">
            <figure className="mx-auto max-w-4xl">
              <blockquote className="t-h2 text-center font-normal text-deodar">
                &ldquo;{project.quote}&rdquo;
              </blockquote>
              {project.quoteAuthor && (
                <figcaption className="t-small mt-6 text-center font-semibold text-stone">
                  — {project.quoteAuthor}
                </figcaption>
              )}
            </figure>
          </div>
        </section>
      )}

      {/* Highlights */}
      <section className="s-section">
        <div className="s-container">
          <SectionHeading eyebrow="This term" title="Project Highlights" />
          <div
            className={`mt-[var(--space-block)] grid gap-x-8 gap-y-14 ${
              project.highlights.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"
            }`}
          >
            {project.highlights.map((h) => (
              <article key={h.title}>
                <Media
                  src={h.image}
                  alt={h.title}
                  label={`${h.title} photo`}
                  className="aspect-[4/3] w-full"
                  rounded="rounded-[var(--r-media)]"
                />
                <h3 className="t-h3 mt-6 text-deodar">{h.title}</h3>
                <p className="t-small mt-3 text-graphite/80">{h.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Past projects */}
      <section className="s-dark s-section bg-deodar text-snow">
        <div className="s-container">
          <SectionHeading eyebrow="Our track record" title="Past Projects" accent="pine" tone="dark" />
          <div className="mt-[var(--space-block)] grid gap-x-16 sm:grid-cols-2">
            {project.past.map((p, i) => (
              <div key={p.title} className="border-t border-snow/20 pb-10 pt-6">
                <span className="t-label t-num text-saffron">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="t-h3 mt-3">{p.title}</h3>
                <p className="t-small mt-3 max-w-xl text-snow/80">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA + other projects */}
      <section className="s-section">
        <div className="s-container">
          <div className="grid gap-8 rounded-[var(--r-media)] bg-saffron p-[clamp(2rem,4vw,3.5rem)] text-deodar-deep lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <h2 className="t-h2">Want to work on {project.name}?</h2>
              <p className="t-lead mt-4 max-w-xl">
                We recruit at the start of every Fall and Spring semester. Come find
                your team.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:col-span-4 lg:justify-end">
              <Link href="/apply" className="s-btn s-btn-dark">
                Apply to join
              </Link>
              <a href={LINKS.donate} className="s-btn border-deodar-deep/30 text-deodar-deep hover:border-deodar-deep hover:bg-deodar-deep/[0.06]">
                Support our work
              </a>
            </div>
          </div>

          <div className="mt-[var(--space-block)]">
            <SiteLabel>Other teams</SiteLabel>
            <ul className="mt-6 grid gap-x-8 sm:grid-cols-3">
              {others.map((o) => (
                <li key={o.slug}>
                  <Link
                    href={`/projects/${o.slug}`}
                    className="group flex items-center justify-between gap-4 border-t border-graphite/15 py-5 text-deodar"
                  >
                    <span className="t-h3 decoration-2 underline-offset-[0.2em] group-hover:underline">{o.name}</span>
                    <Arrow className="h-5 w-5 shrink-0 transition-transform duration-150 group-hover:translate-x-1" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </article>
  );
}

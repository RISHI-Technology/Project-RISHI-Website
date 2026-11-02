import Link from "next/link";
import Media from "@/components/Media";
import SectionHeading from "@/components/SectionHeading";
import Contours from "@/components/Contours";
import { PROJECTS, LINKS } from "@/lib/content";

type Project = (typeof PROJECTS)[number];

export default function ProjectPage({ project }: { project: Project }) {
  const others = PROJECTS.filter((p) => p.slug !== project.slug);

  return (
    <article>
      {/* Hero */}
      <section className="relative overflow-hidden bg-pine pt-[var(--header-h)] text-paper">
        <Contours className="absolute inset-0 h-full w-full text-paper" opacity={0.1} />
        <div className="container-rishi relative z-10 grid gap-10 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <p className="eyebrow text-marigold-soft">Project team</p>
            <h1 className="mt-4 font-display text-5xl font-medium leading-[1.04] tracking-[-0.02em] sm:text-6xl">
              {project.name}
            </h1>
            <p className="mt-6 max-w-xl text-paper/80">{project.intro}</p>
          </div>
          <Media
            src={(project as { heroImage?: string | null }).heroImage ?? null}
            alt={`${project.name} team in Bharog Baneri`}
            label={`${project.name} hero photo`}
            className="aspect-[4/3] w-full"
            rounded="rounded-2xl"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
      </section>

      {/* Quote */}
      {project.quote && (
        <section className="border-b border-pine/10 bg-marigold/[0.07]">
          <figure className="container-rishi py-16">
            <blockquote className="mx-auto max-w-3xl text-center font-display text-2xl leading-snug text-pine-deep sm:text-3xl">
              &ldquo;{project.quote}&rdquo;
            </blockquote>
            {project.quoteAuthor && (
              <figcaption className="mt-4 text-center text-sm text-ink/70">
                {project.quoteAuthor}
              </figcaption>
            )}
          </figure>
        </section>
      )}

      {/* Highlights */}
      <section className="container-rishi py-20">
        <SectionHeading title="Project highlights" />
        <div
          className={`mt-10 grid gap-8 ${
            project.highlights.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"
          }`}
        >
          {project.highlights.map((h) => (
            <article key={h.title}>
              <Media
                src={h.image}
                alt={h.title}
                label={`${h.title} photo`}
                className="aspect-[16/10] w-full"
                rounded="rounded-xl"
              />
              <h3 className="mt-5 font-display text-xl font-medium text-pine-deep">
                {h.title}
              </h3>
              <p className="mt-2 text-ink/70">{h.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Past projects */}
      <section className="bg-pine-deep py-20 text-paper">
        <div className="container-rishi">
          <SectionHeading title="Past projects" tone="dark" />
          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-paper/10 bg-paper/10 sm:grid-cols-2">
            {project.past.map((p) => (
              <div key={p.title} className="bg-pine-deep p-6">
                <h3 className="font-display text-lg font-medium">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-paper/70">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA + other projects */}
      <section className="container-rishi py-20">
        <div className="rounded-2xl border border-pine/10 bg-marigold/10 p-8 sm:p-12">
          <h2 className="font-display text-3xl font-medium text-pine-deep">
            Want to work on {project.name}?
          </h2>
          <p className="mt-3 max-w-xl text-ink/70">
            We recruit at the start of every fall and spring semester. Come find
            your team.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/apply" className="btn-primary">
              Apply to join
            </Link>
            <a href={LINKS.donate} className="btn-ghost">
              Support our work
            </a>
          </div>
        </div>

        <div className="mt-16">
          <p className="eyebrow text-ink/70">Other teams</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {others.map((o) => (
              <Link
                key={o.slug}
                href={`/projects/${o.slug}`}
                className="group flex items-center justify-between gap-4 rounded-xl border border-pine/10 px-5 py-4 transition-colors duration-150 hover:border-pine/30 hover:bg-pine/[0.03]"
              >
                <span className="font-display text-lg font-medium text-pine-deep">{o.name}</span>
                <svg
                  className="h-4 w-4 shrink-0 text-ink/40 transition-colors duration-150 group-hover:text-pine"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </article>
  );
}

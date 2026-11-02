import Link from "next/link";
import Media from "@/components/Media";
import Reveal from "@/components/Reveal";
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
        <div className="container-rishi relative z-10 grid gap-12 pb-16 pt-14 lg:grid-cols-12 lg:items-center lg:pb-24 lg:pt-20">
          <Reveal className="lg:col-span-6">
            <span className="inline-flex items-center gap-3 text-sm font-medium text-paper/75">
              <span className="h-px w-6 bg-marigold" />
              Project Team
            </span>
            <h1 className="mt-7 font-display text-5xl font-semibold leading-[1.02] sm:text-6xl lg:text-7xl">
              {project.name}
            </h1>
            <p className="mt-6 max-w-xl leading-relaxed text-paper/80 sm:text-lg">{project.intro}</p>
          </Reveal>
          <Reveal delay={0.12} className="lg:col-span-6">
            <Media
              src={(project as { heroImage?: string | null }).heroImage ?? null}
              alt={`${project.name} team in Bharog Baneri`}
              label={`${project.name} hero photo`}
              className="aspect-[4/3] w-full"
              rounded="rounded-2xl"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </Reveal>
        </div>
      </section>

      {/* Quote */}
      {project.quote && (
        <section className="bg-marigold/10">
          <div className="container-rishi py-16 lg:py-20">
            <Reveal className="mx-auto max-w-3xl text-center">
              <p className="font-display text-2xl italic leading-snug text-pine-deep sm:text-[2rem] sm:leading-[1.25]">
                &ldquo;{project.quote}&rdquo;
              </p>
              {project.quoteAuthor && (
                <p className="mt-5 text-[15px] font-medium text-sage-deep">
                  — {project.quoteAuthor}
                </p>
              )}
            </Reveal>
          </div>
        </section>
      )}

      {/* Highlights */}
      <section className="container-rishi py-20 lg:py-28">
        <SectionHeading eyebrow="This term" title="Project Highlights" />
        <div
          className={`mt-12 grid gap-x-8 gap-y-14 ${
            project.highlights.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"
          }`}
        >
          {project.highlights.map((h, i) => (
            <Reveal as="article" key={h.title} delay={i * 0.08} className="group">
              <Media
                src={h.image}
                alt={h.title}
                label={`${h.title} photo`}
                className="aspect-[4/3] w-full"
                rounded="rounded-2xl"
              />
              <h3 className="mt-6 font-display text-[1.375rem] font-semibold leading-snug text-pine-deep">
                {h.title}
              </h3>
              <p className="mt-2 leading-relaxed text-ink/70">{h.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Past projects */}
      <section className="bg-pine-deep py-20 text-paper lg:py-28">
        <div className="container-rishi">
          <SectionHeading eyebrow="Our track record" title="Past Projects" accent="pine" tone="dark" />
          <div className="mt-12 grid gap-x-12 sm:grid-cols-2">
            {project.past.map((p, i) => (
              <Reveal
                as="div"
                key={p.title}
                delay={i * 0.06}
                className="border-t border-paper/15 pb-10 pt-6"
              >
                <span className="text-sm font-semibold tabular-nums text-marigold">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 font-display text-xl font-semibold">{p.title}</h3>
                <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-paper/70">{p.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA + other projects */}
      <section className="container-rishi py-20 lg:py-28">
        <div className="rounded-2xl bg-marigold/15 p-8 sm:p-12">
          <Reveal className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-display text-3xl font-semibold text-pine-deep sm:text-4xl">
                Want to work on {project.name}?
              </h2>
              <p className="mt-3 max-w-xl text-lg text-ink/70">
                We recruit at the start of every Fall and Spring semester. Come find
                your team.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link href="/apply" className="btn-primary">
                Apply to join
              </Link>
              <a href={LINKS.donate} className="btn-ghost">
                Support our work
              </a>
            </div>
          </Reveal>
        </div>

        <div className="mt-16">
          <p className="font-display text-xl font-semibold text-pine-deep">Other teams</p>
          <div className="mt-5 grid gap-x-8 sm:grid-cols-3">
            {others.map((o) => (
              <Link
                key={o.slug}
                href={`/projects/${o.slug}`}
                className="group flex items-center justify-between gap-4 border-t border-pine/20 py-5 text-pine-deep transition-colors hover:text-pine"
              >
                <span className="font-display text-lg font-semibold underline-offset-4 group-hover:underline">{o.name}</span>
                <svg
                  className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:translate-x-1"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
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

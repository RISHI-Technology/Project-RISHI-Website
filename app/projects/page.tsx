import type { Metadata } from "next";
import Link from "next/link";
import Media from "@/components/Media";
import SectionHeading from "@/components/SectionHeading";
import SiteLabel from "@/components/SiteLabel";
import { PROJECTS, PROJECTS_PAGE } from "@/lib/content";

export const metadata: Metadata = {
  title: "Projects",
  description: "The four project teams of Project RISHI at UC Berkeley.",
};

export default function ProjectsIndex() {
  return (
    <div className="site">
      <section className="border-b border-graphite/10 pt-[var(--header-h)]">
        <div className="s-container grid gap-8 pb-[clamp(3.5rem,7vw,6rem)] pt-[clamp(3.5rem,7vw,6rem)] lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <SiteLabel>What We Do</SiteLabel>
            <h1 className="t-display mt-7 text-deodar">Four teams, One village</h1>
          </div>
          <p className="t-lead text-graphite/80 lg:col-span-4 lg:col-start-9">
            Each team focuses on a pillar of sustainable development in Bharog
            Baneri, Himachal Pradesh.
          </p>
        </div>
      </section>

      {/* ----------------------------------------------- Project Work in Action */}
      <section className="s-dark s-section bg-deodar text-snow">
        <div className="s-container">
          <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-6">
              <SectionHeading eyebrow="On the ground" title={PROJECTS_PAGE.videoTitle} accent="pine" tone="dark" />
            </div>
            <p className="t-lead text-snow/80 lg:col-span-5 lg:col-start-8">{PROJECTS_PAGE.videoBlurb}</p>
          </div>

          <div className="mt-[var(--space-block)] overflow-hidden rounded-[var(--r-media)] bg-deodar-deep">
            <div className="relative aspect-video w-full">
              {PROJECTS_PAGE.videoEmbedUrl ? (
                <iframe
                  src={PROJECTS_PAGE.videoEmbedUrl}
                  title={PROJECTS_PAGE.videoTitle}
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 border border-dashed border-snow/25 text-center">
                  <span className="grid h-16 w-16 place-items-center rounded-full bg-saffron text-deodar-deep">
                    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                  <p className="t-label rounded-full bg-graphite/70 px-4 py-1.5 text-snow">
                    Add your trip video
                  </p>
                  <p className="t-small max-w-sm px-6 text-snow/70">
                    Paste a YouTube or Vimeo embed link into{" "}
                    <code className="text-saffron">videoEmbedUrl</code> in
                    lib/content.ts.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* The four teams — one feature row each, alternating sides */}
      <section className="s-section">
        <div className="s-container space-y-[var(--space-section)]">
          {PROJECTS.map((p, i) => (
            <article key={p.slug} className="grid items-center gap-8 lg:grid-cols-12 lg:gap-x-16">
              <Link
                href={`/projects/${p.slug}`}
                className={`block rounded-[var(--r-media)] lg:col-span-7 ${i % 2 ? "lg:order-2 lg:col-start-6" : ""}`}
                tabIndex={-1}
                aria-hidden
              >
                <Media
                  src={p.image}
                  alt={p.name}
                  label={`${p.name} cover`}
                  className="aspect-[3/2] w-full"
                  rounded="rounded-[var(--r-media)]"
                  sizes="(max-width: 1024px) 100vw, 58vw"
                />
              </Link>
              <div className={`lg:col-span-5 ${i % 2 ? "lg:order-1 lg:col-start-1" : ""}`}>
                <h2 className="t-h2 text-deodar">{p.name}</h2>
                <p className="mt-4 line-clamp-6 text-graphite/80">{p.intro}</p>
                <Link href={`/projects/${p.slug}`} className="s-btn s-btn-outline mt-7">
                  Explore team
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

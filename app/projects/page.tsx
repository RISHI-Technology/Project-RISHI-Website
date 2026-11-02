import type { Metadata } from "next";
import Link from "next/link";
import Media from "@/components/Media";
import Contours from "@/components/Contours";
import SectionHeading from "@/components/SectionHeading";
import { PROJECTS, PROJECTS_PAGE } from "@/lib/content";

export const metadata: Metadata = {
  title: "Projects",
  description: "The four project teams of Project RISHI at UC Berkeley.",
};

export default function ProjectsIndex() {
  return (
    <>
      <section className="relative overflow-hidden bg-pine pt-[var(--header-h)] text-paper">
        <Contours className="absolute inset-0 h-full w-full text-paper" opacity={0.12} />
        <div className="container-rishi relative z-10 py-20 lg:py-24">
          <p className="eyebrow text-marigold-soft">What we do</p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl font-medium leading-[1.04] tracking-[-0.02em] sm:text-6xl">
            Four teams, one village
          </h1>
          <p className="mt-6 max-w-xl text-lg text-paper/80">
            Each team focuses on a pillar of sustainable development in Bharog
            Baneri, Himachal Pradesh.
          </p>
        </div>
      </section>

      {/* ----------------------------------------------- Project Work in Action */}
      <section className="bg-pine-deep py-20 text-paper">
        <div className="container-rishi">
          <SectionHeading title={PROJECTS_PAGE.videoTitle} tone="dark" />
          <p className="mt-4 max-w-2xl text-paper/70">{PROJECTS_PAGE.videoBlurb}</p>

          <div className="mt-10 overflow-hidden rounded-2xl border border-paper/10 bg-black/30">
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
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 border border-dashed border-paper/25 text-center">
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-paper/10 text-paper">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                  <p className="text-sm font-medium text-paper">Add your trip video</p>
                  <p className="max-w-sm px-6 text-sm text-paper/60">
                    Paste a YouTube or Vimeo embed link into{" "}
                    <code className="text-marigold-soft">videoEmbedUrl</code> in
                    lib/content.ts.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="container-rishi py-20">
        <div className="grid gap-6 md:grid-cols-2">
          {PROJECTS.map((p) => (
            <article key={p.slug}>
              <Link
                href={`/projects/${p.slug}`}
                className="group block h-full overflow-hidden rounded-2xl border border-pine/10 bg-paper transition-colors duration-150 hover:border-pine/30"
              >
                <Media
                  src={p.image}
                  alt={p.name}
                  label={`${p.name} cover`}
                  className="aspect-[16/9] w-full"
                  rounded="rounded-none"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="p-6">
                  <h2 className="font-display text-2xl font-medium text-pine-deep">
                    {p.name}
                  </h2>
                  <p className="mt-2 line-clamp-3 text-ink/70">{p.intro}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-pine">
                    Explore team
                    <svg className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </span>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

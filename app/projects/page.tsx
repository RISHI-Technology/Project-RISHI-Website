import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import Media from "@/components/Media";
import SectionHeading from "@/components/SectionHeading";
import { Chevron } from "@/components/site/Icons";
import { PROJECTS, PROJECTS_PAGE } from "@/lib/content";

export const metadata: Metadata = {
  title: "Projects",
  description: "The four project teams of Project RISHI at UC Berkeley.",
};

export default function ProjectsIndex() {
  return (
    <div className="site">
      <section className="a-glow pb-[clamp(4rem,8vw,7rem)] pt-[calc(var(--header-h)+clamp(3.5rem,8vw,6.5rem))]">
        <div className="a-wrap text-center">
          <p className="hero-rise a-eyebrow">What We Do</p>
          <h1 style={{ "--i": 1 } as CSSProperties} className="hero-rise a-display mx-auto mt-3 max-w-[14ch]">
            Four teams, One village
          </h1>
          <p style={{ "--i": 2 } as CSSProperties} className="hero-rise a-lead mx-auto mt-5 max-w-xl text-label-2">
            Each team focuses on a pillar of sustainable development in Bharog
            Baneri, Himachal Pradesh.
          </p>
        </div>
      </section>

      {/* ----------------------------------------------- Project Work in Action */}
      <section className="a-on-dark a-band-dark py-[var(--a-section)]">
        <div className="a-wrap">
          <div className="a-reveal mx-auto max-w-3xl text-center">
            <SectionHeading eyebrow="On the ground" title={PROJECTS_PAGE.videoTitle} accent="pine" tone="dark" align="center" />
            <p className="a-lead mt-5 text-white/70">{PROJECTS_PAGE.videoBlurb}</p>
          </div>

          <div className="a-reveal mt-12 overflow-hidden rounded-[var(--a-r-lg)] bg-black shadow-[0_40px_80px_-30px_rgb(0_0_0/0.6)]">
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
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 border border-dashed border-white/25 text-center">
                  <span className="grid h-16 w-16 place-items-center rounded-full bg-marigold text-label">
                    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                  <p className="a-caption rounded-full bg-white/15 px-4 py-1.5 font-semibold text-white">
                    Add your trip video
                  </p>
                  <p className="a-callout max-w-sm px-6 text-white/70">
                    Paste a YouTube or Vimeo embed link into{" "}
                    <code className="text-marigold">videoEmbedUrl</code> in
                    lib/content.ts.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* The four teams */}
      <section className="py-[var(--a-section)]">
        <div className="a-wrap grid gap-5 md:grid-cols-2">
          {PROJECTS.map((p) => (
            <div key={p.slug} className="a-reveal flex">
            <Link
              href={`/projects/${p.slug}`}
              className="a-press a-tile group flex w-full flex-col"
            >
              <Media
                src={p.image}
                alt={p.name}
                label={`${p.name} cover`}
                className="aspect-[16/10] w-full [&_img]:transition-transform [&_img]:duration-700 [&_img]:ease-out group-hover:[&_img]:scale-[1.03]"
                rounded="rounded-none"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="flex flex-1 flex-col items-start p-[clamp(1.75rem,3vw,2.5rem)]">
                <h2 className="a-title">{p.name}</h2>
                <p className="a-body mb-6 mt-3 line-clamp-3 text-label-2">{p.intro}</p>
                <span className="a-more mt-auto">
                  <span>Explore team</span>
                  <Chevron />
                </span>
              </div>
            </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
